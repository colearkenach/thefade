// Applying a Path's skill grants to a character (Core pp. 82–84): Tier 1
// paths grant their Path Skills at Learned; some entries let the player
// choose skills from a category or name custom Lore/Perform/Craft skills.
import { DEFAULT_SKILLS, PATH_SKILL_TYPES } from "./constants.js";
import { getRankValue, getSkill, getSkillByKey, slugifySkill } from "./skills.js";

const { DialogV2 } = foundry.applications.api;
const escape = foundry.utils.escapeHTML;

/**
 * Raise skills granted by a path. Grants never lower an existing rank.
 * Collected into a single actor update.
 * @param {Actor} actor
 * @param {Item} path
 */
export async function applyPathSkillModifications(actor, path) {
    const entries = path.system.pathSkills ?? [];
    if (!entries.length) return;
    const updates = {};
    let raised = 0;
    let created = 0;

    /** Queue a rank for a core or existing custom skill (by name). */
    const raise = (name, rank) => {
        const skill = getSkill(actor, name);
        if (!skill) return false;
        const key = `system.skills.${skill.key}.rank`;
        const current = foundry.utils.getProperty(updates, key) ?? skill.rank;
        if (getRankValue(rank) > getRankValue(current)) {
            updates[key] = rank;
            raised++;
        }
        return true;
    };

    /** Queue a custom skill, or raise the core skill it duplicates. */
    const custom = (skillType, subtype, rank) => {
        const definition = customSkillDefinition(skillType, subtype);
        if (!definition) return;
        if (raise(definition.name, rank)) return;
        if (skillType === "craft" && raise(subtype, rank)) return;
        updates[`system.skills.${definition.key}`] = { ...definition.data, rank };
        created++;
    };

    for (const entry of entries) {
        const system = entry.system ?? {};
        const rank = system.rank || "learned";
        const count = Math.max(1, Number(system.chooseCount) || 1);
        switch (system.entryType || PATH_SKILL_TYPES.SPECIFIC_SKILL) {
            case PATH_SKILL_TYPES.SPECIFIC_SKILL:
                if (!raise(entry.name, rank)) console.warn(`thefade | Path "${path.name}" grants unknown skill "${entry.name}"`);
                break;
            case PATH_SKILL_TYPES.SPECIFIC_CUSTOM:
                custom(system.skillType, system.subtype, rank);
                break;
            case PATH_SKILL_TYPES.CHOOSE_CATEGORY:
            case PATH_SKILL_TYPES.CHOOSE_ANY: {
                const category = system.entryType === PATH_SKILL_TYPES.CHOOSE_ANY ? null : system.chooseCategory;
                const chosen = await chooseSkills(actor, path, { category, count, rank });
                for (const name of chosen) raise(name, rank);
                break;
            }
            case PATH_SKILL_TYPES.CHOOSE_LORE:
            case PATH_SKILL_TYPES.CHOOSE_PERFORM:
            case PATH_SKILL_TYPES.CHOOSE_CRAFT: {
                const type = { [PATH_SKILL_TYPES.CHOOSE_LORE]: "lore", [PATH_SKILL_TYPES.CHOOSE_PERFORM]: "perform", [PATH_SKILL_TYPES.CHOOSE_CRAFT]: "craft" }[system.entryType];
                const names = await nameCustomSkills({ type, count, rank, path });
                for (const subtype of names) custom(type, subtype, rank);
                break;
            }
        }
    }

    if (!foundry.utils.isEmpty(updates)) await actor.update(updates);
    if (raised || created) {
        ui.notifications.info(game.i18n.format("THEFADE.Path.applied", { path: path.name, actor: actor.name, raised, created }));
    }
}

/**
 * The stored record and display name for a custom skill.
 * Lore and Perform are named "Lore (History)"; Craft keeps the bare name.
 */
export function customSkillDefinition(skillType, subtype) {
    const type = String(skillType || "").toLowerCase();
    const label = String(subtype || "").trim();
    if (!label) return null;
    const table = {
        craft: { name: label, category: "Craft", attribute: "mind" },
        lore: { name: `Lore (${label})`, category: "Knowledge", attribute: "mind" },
        perform: { name: `Perform (${label})`, category: "Physical", attribute: "finesse_presence" }
    };
    const definition = table[type];
    if (!definition) return null;
    const key = slugifySkill(definition.name);
    return {
        key,
        name: definition.name,
        data: {
            isCustom: true, name: definition.name, category: definition.category, attribute: definition.attribute,
            miscBonus: 0, skillType: type, subtype: label
        }
    };
}

/** Create a custom skill on an actor (Craft, Lore, or Perform). */
export async function createCustomSkill(actor, skillType, subtype, rank = "untrained") {
    const definition = customSkillDefinition(skillType, subtype);
    if (!definition) {
        ui.notifications.error(game.i18n.localize("THEFADE.Skill.customInvalid"));
        return null;
    }
    if (getSkillByKey(actor, definition.key)) {
        ui.notifications.warn(game.i18n.format("THEFADE.Skill.exists", { name: definition.name }));
        return null;
    }
    await actor.update({ [`system.skills.${definition.key}`]: { ...definition.data, rank } });
    return getSkillByKey(actor, definition.key);
}

/**
 * Ask the player to pick `count` core skills from a category (or any).
 * Skills the path already grants specifically are excluded.
 * @returns {Promise<string[]>} Chosen skill names (empty if dismissed).
 */
async function chooseSkills(actor, path, { category, count, rank }) {
    const granted = new Set((path.system.pathSkills ?? [])
        .filter(entry => [PATH_SKILL_TYPES.SPECIFIC_SKILL, PATH_SKILL_TYPES.SPECIFIC_CUSTOM].includes(entry.system?.entryType || PATH_SKILL_TYPES.SPECIFIC_SKILL))
        .map(entry => entry.name.toLowerCase()));
    const pool = DEFAULT_SKILLS.filter(skill =>
        (!category || skill.category.toLowerCase() === String(category).toLowerCase()) && !granted.has(skill.name.toLowerCase()));
    if (!pool.length) return [];
    const needed = Math.min(count, pool.length);
    const categoryLabel = category || game.i18n.localize("THEFADE.Path.anyCategory");
    const options = pool.map(skill => {
        const current = getSkill(actor, skill.name);
        const rankLabel = game.i18n.localize(CONFIG.THEFADE.skillRanks[current?.rank ?? "untrained"].label);
        return `<label class="checkbox"><input type="checkbox" name="skill" value="${escape(skill.name)}"> ${escape(skill.name)} <span class="hint">(${escape(rankLabel)})</span></label>`;
    }).join("");
    const rankLabel = game.i18n.localize(CONFIG.THEFADE.skillRanks[rank]?.label ?? rank);

    while (true) {
        const result = await DialogV2.wait({
            window: { title: game.i18n.format("THEFADE.Path.chooseTitle", { count: needed, category: categoryLabel }) },
            classes: ["thefade"],
            content: `<p>${game.i18n.format("THEFADE.Path.chooseHint", { count: needed, rank: escape(rankLabel), path: escape(path.name) })}</p><div class="thefade-choice-grid">${options}</div>`,
            buttons: [{
                action: "apply", label: "THEFADE.Path.apply", icon: "fa-solid fa-check", default: true,
                callback: (event, button) => [...button.form.querySelectorAll("input[name=skill]:checked")].map(input => input.value)
            }, { action: "skip", label: "THEFADE.Path.skip", icon: "fa-solid fa-forward" }]
        });
        if (!Array.isArray(result)) return [];
        if (result.length === needed) return result;
        ui.notifications.warn(game.i18n.format("THEFADE.Path.chooseExactly", { count: needed }));
    }
}

/**
 * Ask the player to name `count` custom skills of a family.
 * @returns {Promise<string[]>} Names entered (empty if dismissed).
 */
async function nameCustomSkills({ type, count, rank, path }) {
    const typeLabel = game.i18n.localize(`THEFADE.Skill.type.${type}`);
    const rankLabel = game.i18n.localize(CONFIG.THEFADE.skillRanks[rank]?.label ?? rank);
    const fields = Array.from({ length: count }, (_, i) =>
        `<div class="form-group"><label>${escape(typeLabel)} ${i + 1}</label><div class="form-fields"><input type="text" name="name${i}"></div></div>`).join("");
    while (true) {
        const result = await DialogV2.wait({
            window: { title: game.i18n.format("THEFADE.Path.nameTitle", { count, type: typeLabel }) },
            classes: ["thefade"],
            content: `<p>${game.i18n.format("THEFADE.Path.nameHint", { count, type: escape(typeLabel), rank: escape(rankLabel), path: escape(path.name) })}</p>${fields}`,
            buttons: [{
                action: "apply", label: "THEFADE.Path.apply", icon: "fa-solid fa-check", default: true,
                callback: (event, button) => Array.from({ length: count }, (_, i) => button.form.elements[`name${i}`].value.trim())
            }, { action: "skip", label: "THEFADE.Path.skip", icon: "fa-solid fa-forward" }]
        });
        if (!Array.isArray(result)) return [];
        if (result.every(Boolean)) return result;
        ui.notifications.warn(game.i18n.format("THEFADE.Path.nameAll", { count }));
    }
}
