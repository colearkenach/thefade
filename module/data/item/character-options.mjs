// Character-building item types: paths, species, talents, traits, precepts, skills.
import TheFadeItemModel, { dailyUsesSchema, migrateDailyUses, dailyResource } from "./base.mjs";
import {
    abilityField, attributeMap, boolean, bonusesField, count, integer, number, string, toNumber
} from "../fields.mjs";
import { normalizeCreatureSubtypes, normalizeCreatureType } from "../../rules/creature-rules.js";

const { fields } = foundry.data;

/** Abilities are stored as an object keyed by a random id so links survive reordering. */
function abilitiesField() {
    return new fields.TypedObjectField(abilityField());
}

function migrateAbilities(map) {
    if (!map || typeof map !== "object" || Array.isArray(map)) return;
    for (const ability of Object.values(map)) {
        if (!ability || typeof ability !== "object") continue;
        if ("durationRounds" in ability && typeof ability.durationRounds !== "number") {
            ability.durationRounds = Math.max(0, Math.trunc(toNumber(ability.durationRounds, 1)));
        }
        if (Array.isArray(ability.bonuses)) {
            for (const bonus of ability.bonuses) if (bonus && !bonus.id) bonus.id = foundry.utils.randomID(16);
        }
    }
}

/* -------------------------------------------- */
/*  Paths                                       */
/* -------------------------------------------- */

/**
 * A skill a path grants. Stored in the legacy embedded-skill shape so the
 * path-skill application rules keep working: `{ _id, name, type, system }`.
 */
function pathSkillField() {
    return new fields.SchemaField({
        _id: string(),
        name: string(),
        type: string("skill"),
        system: new fields.SchemaField({
            rank: string("learned"),
            category: string(),
            attribute: string(),
            entryType: string("specific"),
            chooseCount: count(1),
            chooseCategory: string(),
            skillType: string(),
            subtype: string(),
            miscBonus: integer(0),
            description: string()
        })
    });
}

export class PathData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.path"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            tier: integer(1, { min: 1, max: 3 }),
            baseHP: integer(0),
            requirements: string(),
            abilities: abilitiesField(),
            pathSkills: new fields.ArrayField(pathSkillField())
        };
    }

    static migrateData(source) {
        if ("tier" in source && typeof source.tier !== "number") source.tier = Math.min(3, Math.max(1, Math.trunc(toNumber(source.tier, 1))));
        if ("baseHP" in source && typeof source.baseHP !== "number") source.baseHP = Math.trunc(toNumber(source.baseHP, 0));
        migrateAbilities(source.abilities);
        if (Array.isArray(source.pathSkills)) {
            for (const entry of source.pathSkills) {
                if (!entry || typeof entry !== "object") continue;
                entry._id ||= foundry.utils.randomID(16);
                entry.system ??= {};
                // Entries authored before entryType existed were always specific skills.
                entry.system.entryType ||= "specific";
                if ("chooseCount" in entry.system) entry.system.chooseCount = Math.max(1, Math.trunc(toNumber(entry.system.chooseCount, 1)));
                if ("miscBonus" in entry.system) entry.system.miscBonus = Math.trunc(toNumber(entry.system.miscBonus, 0));
                if (entry.system.usage && !entry.system.description) entry.system.description = entry.system.usage;
                delete entry.system.usage;
            }
        }
        delete source.skills;        // Free-text skill list superseded by pathSkills.
        delete source.skillChoices;
        delete source.isMonsterPath; // Implied by the monsterpath type.
        return super.migrateData(source);
    }

    get isMonsterPath() {
        return this.parent?.type === "monsterpath";
    }

    get chips() {
        if (this.isMonsterPath) return [game.i18n.localize("THEFADE.Path.monster")];
        return [game.i18n.localize(CONFIG.THEFADE.pathTiers[this.tier] ?? `Tier ${this.tier}`),
            game.i18n.format("THEFADE.Chip.baseHP", { value: this.baseHP })];
    }
}

/* -------------------------------------------- */
/*  Species                                     */
/* -------------------------------------------- */

const SIZE_KEYS = ["miniscule", "diminutive", "tiny", "small", "medium", "large", "massive", "immense", "enormous", "titanic"];

function movementSchema(land = 4) {
    return new fields.SchemaField({
        land: count(land), fly: count(0), swim: count(0), climb: count(0), burrow: count(0)
    });
}

function sizeRuleField() {
    const capField = () => new fields.NumberField({ required: true, nullable: true, integer: true, initial: null });
    return new fields.SchemaField({
        averageEL: integer(0),
        bonusHP: integer(0),
        movement: new fields.SchemaField({ land: integer(0) }),
        bonuses: attributeMap(() => integer(0)),
        caps: attributeMap(capField),
        example: string()
    });
}

function ndTypeField(baseMultiplier, parts) {
    return new fields.SchemaField({
        baseMultiplier: number(baseMultiplier),
        parts: new fields.SchemaField({
            head: string(parts.head), body: string(parts.body), arms: string(parts.arms), legs: string(parts.legs)
        })
    });
}

export class SpeciesData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.species"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            syncToActor: boolean(false),
            baseHP: integer(0),
            size: string("medium", { choices: () => CONFIG.THEFADE.sizes }),
            creatureType: string("sapient"),
            creatureSubtype: string(),
            creatureSubtypes: new fields.ArrayField(string()),
            languages: string(),
            abilityBonuses: attributeMap(() => integer(0)),
            flexibleBonus: new fields.SchemaField({ value: integer(0), selectedAttribute: string() }),
            movement: movementSchema(4),
            speciesAbilities: abilitiesField(),
            personality: string(),
            history: string(),
            youngAge: string(),
            adultAge: string(),
            oldAge: string(),
            maximumAge: integer(0),
            visionType: string("normal"),
            biologicallyImmortal: boolean(false)
        };
    }

    static migrateData(source) {
        migrateSpecies(source);
        return super.migrateData(source);
    }

    prepareDerivedData() {
        this.creatureType = normalizeCreatureType(this.creatureType);
        this.creatureSubtypes = normalizeCreatureSubtypes(this.creatureSubtypes, this.creatureSubtype);
    }

    get isMonsterSpecies() {
        return this.parent?.type === "monsterspecies";
    }

    get chips() {
        const chips = [game.i18n.localize(CONFIG.THEFADE.creatureTypes[this.creatureType] ?? this.creatureType)];
        chips.push(CONFIG.THEFADE.sizes[this.size] ?? this.size);
        chips.push(game.i18n.format("THEFADE.Chip.baseHP", { value: this.baseHP }));
        return chips;
    }
}

function migrateSpecies(source) {
    for (const key of ["baseHP", "maximumAge"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.trunc(toNumber(source[key], 0));
    }
    // visionType was mistakenly declared as an array of every option; an array means "unset".
    if (Array.isArray(source.visionType)) source.visionType = "normal";
    if (typeof source.size === "string") source.size = source.size.toLowerCase();
    if (source.size && !SIZE_KEYS.includes(source.size)) source.size = "medium";
    // Some species stored their abilities under `abilities` instead of `speciesAbilities`.
    if (source.abilities && typeof source.abilities === "object" && !Array.isArray(source.abilities)) {
        const current = source.speciesAbilities;
        if (!current || !Object.keys(current).length) source.speciesAbilities = source.abilities;
    }
    delete source.abilities;
    migrateAbilities(source.speciesAbilities);
    if (source.abilityBonuses && typeof source.abilityBonuses === "object") {
        for (const [key, value] of Object.entries(source.abilityBonuses)) {
            if (typeof value !== "number") source.abilityBonuses[key] = Math.trunc(toNumber(value, 0));
        }
    }
    if (source.movement && typeof source.movement === "object") {
        for (const [key, value] of Object.entries(source.movement)) {
            if (typeof value !== "number") source.movement[key] = Math.max(0, Math.trunc(toNumber(value, 0)));
        }
    }
}

export class MonsterSpeciesData extends SpeciesData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.monsterspecies"];

    static defineSchema() {
        const schema = super.defineSchema();
        schema.creatureType = string("beast");
        return {
            ...schema,
            attributeSet: attributeMap(() => integer(1)),
            attributeSpread: string("10, 5, 3, 1, 1"),
            naturalDeflectionTypes: new fields.SchemaField({
                fragile: ndTypeField(2, { head: "0.25", body: "1", arms: "0.3333333333", legs: "0.3333333333" }),
                average: ndTypeField(5, { head: "0.3333333333", body: "1", arms: "0.5", legs: "0.5" }),
                tough: ndTypeField(10, { head: "0.5", body: "1", arms: "0.6666666667", legs: "0.6666666667" })
            }),
            // Each entry grants (or offers a choice of) complete weapon item data.
            standardAttacks: new fields.ArrayField(new fields.SchemaField({
                id: string(),
                mode: string("grant", { choices: () => CONFIG.THEFADE.standardAttackModes }),
                weapons: new fields.ArrayField(new fields.ObjectField())
            })),
            sizeRules: new fields.SchemaField(Object.fromEntries(SIZE_KEYS.map(size => [size, sizeRuleField()])))
        };
    }

    static migrateData(source) {
        if (Array.isArray(source.standardAttacks)) {
            source.standardAttacks = source.standardAttacks.map(entry => migrateStandardAttack(entry)).filter(Boolean);
        }
        if (source.sizeRules && typeof source.sizeRules === "object") {
            for (const rule of Object.values(source.sizeRules)) {
                if (!rule?.caps) continue;
                for (const [key, value] of Object.entries(rule.caps)) {
                    rule.caps[key] = (value === "" || value === null || value === undefined) ? null : Math.trunc(toNumber(value, 0));
                }
            }
        }
        return super.migrateData(source);
    }
}

/** Convert the older optionA/optionB standard-attack shape into full weapon data. */
function migrateStandardAttack(entry) {
    if (!entry || typeof entry !== "object") return null;
    entry.id ||= foundry.utils.randomID(16);
    if (Array.isArray(entry.weapons)) return entry;
    const weapons = [];
    for (const option of [entry.optionA, entry.optionB]) {
        if (!option?.name) continue;
        const natural = option.type === "natural";
        weapons.push({
            id: foundry.utils.randomID(16),
            name: option.name,
            img: "icons/svg/sword.svg",
            type: "weapon",
            system: {
                damageComponents: [{ id: foundry.utils.randomID(16), amount: Number(option.damage) || 0, type: option.damageType || "B" }],
                critical: 4,
                handedness: natural ? "Natural Weapon" : "One-Handed",
                range: "Melee",
                integrity: 10,
                qualities: option.qualities || "",
                skill: option.skill || (natural ? "Unarmed" : "Cudgel"),
                attribute: "physique",
                weight: natural ? 0 : 1,
                equipped: true
            }
        });
    }
    return { id: entry.id, mode: entry.mode || "grant", weapons };
}

/* -------------------------------------------- */
/*  Talents, traits, precepts                   */
/* -------------------------------------------- */

export class TalentData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.talent"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            prerequisites: string(),
            talentType: string("general"),
            associatedPath: string(),
            ...dailyUsesSchema(0),
            bonuses: bonusesField()
        };
    }

    static migrateData(source) {
        migrateDailyUses(source);
        // Talent types once included "trait" and "precept"; those are separate item types now.
        if (["trait", "precept"].includes(source.talentType)) source.talentType = "general";
        delete source.effect;
        return super.migrateData(source);
    }

    get resource() {
        return this.usesPerDay ? dailyResource(this) : null;
    }

    get chips() {
        const chips = [game.i18n.localize(CONFIG.THEFADE.talentTypes[this.talentType] ?? this.talentType)];
        if (this.usesPerDay) chips.push(game.i18n.format("THEFADE.Chip.perDay", { value: this.usesPerDay }));
        return chips;
    }
}

export class TraitData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.trait"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            prerequisites: string(),
            traitType: string("general"),
            ...dailyUsesSchema(0)
        };
    }

    static migrateData(source) {
        migrateDailyUses(source);
        // Traits converted from talents carried talent-only fields.
        delete source.talentType;
        delete source.associatedPath;
        if (source.source === "converted from talent") source.source = "";
        return super.migrateData(source);
    }

    get resource() {
        return this.usesPerDay ? dailyResource(this) : null;
    }

    get chips() {
        return [CONFIG.THEFADE.traitTypes[this.traitType] ?? this.traitType];
    }
}

export class PreceptData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.precept"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            deity: string(),
            domain: string(),
            effect: string(),
            ...dailyUsesSchema(0),
            bonuses: bonusesField()
        };
    }

    static migrateData(source) {
        migrateDailyUses(source);
        return super.migrateData(source);
    }

    get resource() {
        return this.usesPerDay ? dailyResource(this) : null;
    }

    get chips() {
        return [this.deity, this.domain].filter(Boolean);
    }
}

/* -------------------------------------------- */
/*  Skills (compendium reference entries)       */
/* -------------------------------------------- */

/**
 * Skills live on the actor (`system.skills`). Skill items remain as
 * compendium reference entries describing each skill; dropping one onto a
 * character adds it as a custom skill if it is not a core skill.
 */
export class SkillData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.skill"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            rank: string("untrained"),
            category: string("Combat"),
            attribute: string("physique"),
            usage: string(),
            miscBonus: integer(0)
        };
    }

    get chips() {
        return [
            game.i18n.localize(CONFIG.THEFADE.skillCategories[this.category] ?? this.category),
            game.i18n.localize(CONFIG.THEFADE.skillAttributes[this.attribute] ?? this.attribute)
        ];
    }
}
