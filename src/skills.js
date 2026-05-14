// Skill data layer for The Fade.
//
// Skills used to be embedded Item documents. They are now plain data on the
// actor (`actor.system.skills`), keyed by a stable slug. Core skills are
// defined in DEFAULT_SKILLS and read from there; the per-actor map only
// stores ranks/bonuses for core skills, plus full data for custom skills
// (Lore / Perform / custom Craft).
import { DEFAULT_SKILLS } from './constants.js';

const RANK_VALUES = {
    untrained: 0,
    learned: 1,
    practiced: 2,
    adept: 3,
    experienced: 4,
    expert: 5,
    mastered: 6
};

const RANK_DICE = {
    untrained: null,   // halves the attribute pool
    learned: 0,
    practiced: 1,
    adept: 2,
    experienced: 3,
    expert: 4,
    mastered: 6
};

/** Stable, URL-safe key for a skill name. */
export function slugifySkill(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/\(([^)]+)\)/g, "$1")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/** Numeric ordering for ranks (for comparison). */
export function getRankValue(rank) {
    return RANK_VALUES[rank] ?? 0;
}

/** Dice contribution from a rank. `null` means "halve attribute" (untrained). */
export function getRankDice(rank) {
    return RANK_DICE[rank] ?? null;
}

const CORE_SKILLS_BY_KEY = (() => {
    const out = {};
    for (const s of DEFAULT_SKILLS) {
        out[slugifySkill(s.name)] = {
            key: slugifySkill(s.name),
            name: s.name,
            category: s.category,
            attribute: s.attribute,
            defaultRank: s.rank || "untrained",
            isCore: true
        };
    }
    return out;
})();

export function getCoreSkillsList() {
    return Object.values(CORE_SKILLS_BY_KEY);
}

export function getCoreSkill(key) {
    return CORE_SKILLS_BY_KEY[key] || null;
}

function getOverride(actor, key) {
    return actor?.system?.skills?.[key] || null;
}

/**
 * Return a merged skill object regardless of whether the skill is core or
 * custom. Returns null if the key is unknown and there is no custom entry.
 */
export function getSkillByKey(actor, key) {
    if (!key) return null;
    const core = CORE_SKILLS_BY_KEY[key];
    const override = getOverride(actor, key);

    if (core) {
        const attributeUnlocked = !!override?.attributeUnlocked;
        const attribute = attributeUnlocked && override?.attribute
            ? override.attribute
            : core.attribute;
        return {
            key,
            name: core.name,
            category: core.category,
            attribute,
            defaultAttribute: core.attribute,
            attributeUnlocked,
            rank: override?.rank ?? core.defaultRank,
            miscBonus: Number(override?.miscBonus) || 0,
            isCore: true,
            isCustom: false,
            skillType: null,
            subtype: null
        };
    }

    if (override?.isCustom) {
        return {
            key,
            name: override.name || key,
            category: override.category || "Knowledge",
            attribute: override.attribute || "mind",
            defaultAttribute: override.attribute || "mind",
            attributeUnlocked: true,
            rank: override.rank || "untrained",
            miscBonus: Number(override.miscBonus) || 0,
            isCore: false,
            isCustom: true,
            skillType: override.skillType || null,
            subtype: override.subtype || null
        };
    }

    return null;
}

/** Find a skill by display name (case-insensitive). */
export function getSkill(actor, name) {
    if (!name) return null;
    return getSkillByKey(actor, slugifySkill(name));
}

/** Every skill the actor has: core skills + all custom entries. */
export function getAllSkills(actor) {
    const result = [];
    for (const core of getCoreSkillsList()) {
        result.push(getSkillByKey(actor, core.key));
    }
    const overrides = actor?.system?.skills || {};
    for (const [key, data] of Object.entries(overrides)) {
        if (data?.isCustom && !CORE_SKILLS_BY_KEY[key]) {
            const merged = getSkillByKey(actor, key);
            if (merged) result.push(merged);
        }
    }
    return result;
}

/** Group skills by category, sorted by name within each category. */
export function getSkillsByCategory(actor) {
    const groups = {};
    for (const skill of getAllSkills(actor)) {
        if (!skill) continue;
        const cat = skill.category || "Other";
        (groups[cat] ||= []).push(skill);
    }
    for (const list of Object.values(groups)) {
        list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
}

function resolveAttributeValue(actor, attributeName) {
    if (!attributeName || !actor?.system?.attributes) return 0;
    const attrs = actor.system.attributes;
    if (attributeName.includes('_')) {
        const [a, b] = attributeName.split('_');
        const v1 = attrs[a]?.value || 0;
        const v2 = attrs[b]?.value || 0;
        return Math.floor((v1 + v2) / 2);
    }
    return attrs[attributeName]?.value || 0;
}

/**
 * Dice pool for a skill at this moment: attribute (halved if untrained),
 * + rank bonus, + miscBonus, + equipped-item bonuses. Clamped to >= 1.
 */
export function calculateSkillDice(actor, skill) {
    if (!skill) return 1;
    let pool = resolveAttributeValue(actor, skill.attribute);
    if (skill.rank === "untrained") {
        pool = Math.floor(pool / 2);
    } else {
        pool += RANK_DICE[skill.rank] || 0;
    }
    pool += skill.miscBonus || 0;

    const eb = actor?.system?.equippedBonuses;
    if (eb) {
        pool += (eb.skills?.[skill.name] || 0) + (eb.skills?.all || 0);
        if (skill.category === "Magical") pool += (eb.spell || 0);
    }
    return Math.max(1, pool);
}

// ============================================================
// MUTATION
// ============================================================

export async function setSkillRank(actor, key, rank) {
    if (!actor || !key) return;
    await actor.update({ [`system.skills.${key}.rank`]: rank });
}

export async function setSkillBonus(actor, key, bonus) {
    if (!actor || !key) return;
    await actor.update({ [`system.skills.${key}.miscBonus`]: Number(bonus) || 0 });
}

/**
 * Add a custom skill (Craft/Lore/Perform). Returns the merged skill on
 * success, or null on validation failure / duplicate.
 */
export async function createCustomSkill(actor, skillType, subtype, rank = "untrained") {
    if (!subtype || !subtype.trim()) {
        ui.notifications.error("Subtype is required for custom skills.");
        return null;
    }

    let name, category, attribute;
    switch ((skillType || "").toLowerCase()) {
        case "craft":
            name = subtype.trim();
            category = "Craft";
            attribute = "mind";
            break;
        case "lore":
            name = `Lore (${subtype.trim()})`;
            category = "Knowledge";
            attribute = "mind";
            break;
        case "perform":
            name = `Perform (${subtype.trim()})`;
            category = "Physical";
            attribute = "finesse_presence";
            break;
        default:
            ui.notifications.error("Custom skill type must be Craft, Lore, or Perform.");
            return null;
    }

    const key = slugifySkill(name);
    const existing = getSkillByKey(actor, key);
    if (existing) {
        ui.notifications.warn(`${name} already exists.`);
        return existing;
    }

    await actor.update({
        [`system.skills.${key}`]: {
            isCustom: true,
            name,
            category,
            attribute,
            rank,
            miscBonus: 0,
            skillType: skillType.toLowerCase(),
            subtype: subtype.trim()
        }
    });

    ui.notifications.info(`Created custom skill: ${name}`);
    return getSkillByKey(actor, key);
}

export async function deleteCustomSkill(actor, key) {
    if (!actor || !key) return;
    if (CORE_SKILLS_BY_KEY[key]) {
        ui.notifications.warn("Core skills cannot be deleted.");
        return;
    }
    await actor.update({ [`system.skills.-=${key}`]: null });
}

// ============================================================
// MIGRATION
// ============================================================

const MIGRATION_FLAG = "skillsMigratedToData";

/**
 * One-shot per-actor migration: read all skill items, write them into
 * actor.system.skills, then delete the items. Idempotent via a flag.
 */
export async function migrateActorSkills(actor) {
    if (!actor || actor.type !== "character") return false;
    if (actor.getFlag("thefade", MIGRATION_FLAG)) return false;

    const skillItems = actor.items.filter(i => i.type === "skill");
    if (!skillItems.length) {
        await actor.setFlag("thefade", MIGRATION_FLAG, true);
        return false;
    }

    const updates = {};
    for (const item of skillItems) {
        const sys = item.system || {};
        const key = slugifySkill(item.name);
        if (!key) continue;

        const isCustom = sys.isCore === false || CORE_SKILLS_BY_KEY[key] === undefined;
        if (isCustom) {
            updates[`system.skills.${key}`] = {
                isCustom: true,
                name: item.name,
                category: sys.category || "Knowledge",
                attribute: sys.attribute || "mind",
                rank: sys.rank || "untrained",
                miscBonus: Number(sys.miscBonus) || 0,
                skillType: sys.skillType || null,
                subtype: sys.subtype || null
            };
        } else {
            const entry = {};
            const defaultRank = CORE_SKILLS_BY_KEY[key].defaultRank;
            if (sys.rank && sys.rank !== defaultRank) entry.rank = sys.rank;
            if (Number(sys.miscBonus) > 0) entry.miscBonus = Number(sys.miscBonus);
            if (Object.keys(entry).length) updates[`system.skills.${key}`] = entry;
        }
    }

    if (Object.keys(updates).length) await actor.update(updates);
    await actor.deleteEmbeddedDocuments("Item", skillItems.map(i => i.id));
    await actor.setFlag("thefade", MIGRATION_FLAG, true);
    return true;
}

export async function migrateAllActorSkills() {
    if (!game?.actors) return;
    const actors = game.actors.filter(a => a.type === "character");
    let migrated = 0;
    for (const actor of actors) {
        try {
            const did = await migrateActorSkills(actor);
            if (did) migrated++;
        } catch (err) {
            console.warn(`thefade | skill migration failed for ${actor.name}:`, err);
        }
    }
    if (migrated > 0) console.log(`thefade | migrated skills on ${migrated} actor(s).`);
}
