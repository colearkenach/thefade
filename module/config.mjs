// Central configuration for The Fade (Abyss). Exposed as CONFIG.THEFADE so
// templates, sheets, and modules read one source for labels and enumerations.
import {
    SIZE_OPTIONS, AURA_COLOR_OPTIONS, AURA_SHAPE_OPTIONS, AURA_INTENSITY_OPTIONS,
    DAMAGE_TYPE_LABELS, COMBAT_DAMAGE_TYPES, COMBAT_IMMUNITY_DAMAGE_TYPES,
    COMBAT_STATUS_IMMUNITIES, COMBAT_IMMUNITY_EFFECTS, UNIVERSAL_ABILITY_CATEGORIES,
    VULNERABILITY_SEVERITY_OPTIONS, DEFAULT_SKILLS, WEAPON_ENCHANT_BASE_PRICES,
    ARMOR_ENCHANT_BASE_PRICE, WEAPON_STRENGTHENING_OPTIONS, ARMOR_STRENGTHENING_OPTIONS,
    WEAPON_MOD_SLOTS, ARMOR_MOD_SLOTS, PATH_SKILL_TYPES
} from "./rules/constants.js";
import { CONDITION_EFFECTS, CONDITION_INTENSITIES, CONDITION_STATUS_ICONS } from "./rules/conditions.js";
import { STANCES } from "./rules/stances.js";
import { CREATURE_TYPE_OPTIONS, CREATURE_SUBTYPE_OPTIONS } from "./rules/creature-rules.js";
import { WEAPON_QUALITIES, WEAPON_DAMAGE_ATTRIBUTE_OPTIONS } from "./rules/weapon-rules.js";
import { ITEM_POWER_OVERLAP_OPTIONS } from "./rules/item-power-rules.js";
import { DARK_SCHOOL_NAMES, ADDICTION_STAGES } from "./rules/dark-magic.js";
import { MUTATION_SEVERITIES, CROSSBREED_OUTCOMES, ANATOMY_OPTIONS } from "./rules/rules.js";
import { ALCHEMICAL_SKILL_OPTIONS } from "./rules/alchemy-rules.js";

const THEFADE = {};

/** The five attributes, in sheet order. */
THEFADE.attributes = {
    physique: { label: "THEFADE.Attribute.physique", abbreviation: "THEFADE.Attribute.physiqueAbbr" },
    finesse: { label: "THEFADE.Attribute.finesse", abbreviation: "THEFADE.Attribute.finesseAbbr" },
    mind: { label: "THEFADE.Attribute.mind", abbreviation: "THEFADE.Attribute.mindAbbr" },
    presence: { label: "THEFADE.Attribute.presence", abbreviation: "THEFADE.Attribute.presenceAbbr" },
    soul: { label: "THEFADE.Attribute.soul", abbreviation: "THEFADE.Attribute.soulAbbr" }
};
THEFADE.attributeKeys = Object.keys(THEFADE.attributes);

/** Attribute choices for skills, including averaged pairs (Core p. 150). */
THEFADE.skillAttributes = {
    physique: "THEFADE.Attribute.physique",
    finesse: "THEFADE.Attribute.finesse",
    mind: "THEFADE.Attribute.mind",
    presence: "THEFADE.Attribute.presence",
    soul: "THEFADE.Attribute.soul",
    physique_finesse: "THEFADE.Attribute.physique_finesse",
    physique_mind: "THEFADE.Attribute.physique_mind",
    finesse_presence: "THEFADE.Attribute.finesse_presence",
    mind_soul: "THEFADE.Attribute.mind_soul"
};

/** Skill ranks with their dice contribution (Core p. 150). `dice: null` halves the attribute. */
THEFADE.skillRanks = {
    untrained: { label: "THEFADE.Rank.untrained", abbreviation: "Unt", dice: null, value: 0 },
    learned: { label: "THEFADE.Rank.learned", abbreviation: "Lrn", dice: 0, value: 1 },
    practiced: { label: "THEFADE.Rank.practiced", abbreviation: "Prc", dice: 1, value: 2 },
    adept: { label: "THEFADE.Rank.adept", abbreviation: "Apt", dice: 2, value: 3 },
    experienced: { label: "THEFADE.Rank.experienced", abbreviation: "Exp", dice: 3, value: 4 },
    expert: { label: "THEFADE.Rank.expert", abbreviation: "Xpt", dice: 4, value: 5 },
    mastered: { label: "THEFADE.Rank.mastered", abbreviation: "Mst", dice: 6, value: 6 }
};

THEFADE.skillCategories = {
    Combat: "THEFADE.SkillCategory.Combat",
    Craft: "THEFADE.SkillCategory.Craft",
    Knowledge: "THEFADE.SkillCategory.Knowledge",
    Magical: "THEFADE.SkillCategory.Magical",
    Physical: "THEFADE.SkillCategory.Physical",
    Sense: "THEFADE.SkillCategory.Sense",
    Social: "THEFADE.SkillCategory.Social"
};

THEFADE.coreSkills = DEFAULT_SKILLS;
THEFADE.pathSkillTypes = PATH_SKILL_TYPES;

/** Difficulty Thresholds (Core p. 150). */
THEFADE.difficulties = {
    1: "THEFADE.Difficulty.trivial",
    2: "THEFADE.Difficulty.easy",
    3: "THEFADE.Difficulty.moderate",
    4: "THEFADE.Difficulty.challenging",
    5: "THEFADE.Difficulty.hard",
    6: "THEFADE.Difficulty.veryHard",
    8: "THEFADE.Difficulty.extreme",
    10: "THEFADE.Difficulty.legendary"
};

THEFADE.sizes = SIZE_OPTIONS;
THEFADE.creatureTypes = CREATURE_TYPE_OPTIONS;
THEFADE.creatureSubtypes = CREATURE_SUBTYPE_OPTIONS;

THEFADE.aura = {
    colors: AURA_COLOR_OPTIONS,
    shapes: AURA_SHAPE_OPTIONS,
    intensities: AURA_INTENSITY_OPTIONS
};

THEFADE.addictionStages = Object.fromEntries(ADDICTION_STAGES.map(stage => [stage, `THEFADE.Addiction.${stage}`]));

/** Conditions and their status-effect icons. */
THEFADE.conditions = CONDITION_EFFECTS;
THEFADE.conditionIntensities = Object.fromEntries(CONDITION_INTENSITIES.map(key => [key, `THEFADE.Intensity.${key}`]));
THEFADE.conditionIcons = CONDITION_STATUS_ICONS;
THEFADE.stances = STANCES;

/** Body locations, in hit-location order (Core p. 24). */
THEFADE.bodyParts = {
    head: "THEFADE.Body.head",
    body: "THEFADE.Body.body",
    leftarm: "THEFADE.Body.leftarm",
    rightarm: "THEFADE.Body.rightarm",
    leftleg: "THEFADE.Body.leftleg",
    rightleg: "THEFADE.Body.rightleg"
};
THEFADE.anatomyPresets = ANATOMY_OPTIONS;

THEFADE.injuryLimbs = {
    head: "THEFADE.Body.head",
    body: "THEFADE.Body.body",
    leftArm: "THEFADE.Body.leftarm",
    rightArm: "THEFADE.Body.rightarm",
    leftLeg: "THEFADE.Body.leftleg",
    rightLeg: "THEFADE.Body.rightleg"
};

/** Damage types: short codes are the stored values. */
THEFADE.damageTypes = DAMAGE_TYPE_LABELS;
THEFADE.combatDamageTypes = COMBAT_DAMAGE_TYPES;
THEFADE.combatImmunityDamageTypes = COMBAT_IMMUNITY_DAMAGE_TYPES;
THEFADE.statusImmunities = COMBAT_STATUS_IMMUNITIES;
THEFADE.effectImmunities = COMBAT_IMMUNITY_EFFECTS;
THEFADE.universalAbilities = UNIVERSAL_ABILITY_CATEGORIES;
THEFADE.vulnerabilitySeverities = VULNERABILITY_SEVERITY_OPTIONS;

/**
 * Bonus effects bought with spare successes on a damaging hit, by damage
 * type (Core pp. 28–31). `condition` effects are applied to the target with
 * the damage; `duration` is in rounds ("1d6", "half" = ½ damage, or a number);
 * `perExtra` adds a round per extra success spent beyond the cost.
 */
THEFADE.damageEffects = {
    F: [{ key: "fire", cost: 2, label: "THEFADE.DamageEffect.fire", duration: "1d6", perExtra: true }],
    C: [{ key: "cold", cost: 2, label: "THEFADE.DamageEffect.cold", condition: "fatigue", intensity: "trivial", duration: 1, perExtra: true }],
    A: [{ key: "acid", cost: 2, label: "THEFADE.DamageEffect.acid", condition: "pain", intensity: "trivial", duration: 1, perExtra: true }],
    E: [{ key: "electricity", cost: 3, label: "THEFADE.DamageEffect.electricity" }],
    So: [{ key: "sonic", cost: 3, label: "THEFADE.DamageEffect.sonic", condition: "deafness", duration: "half", perExtra: true }],
    Sm: [{ key: "smiting", cost: 3, label: "THEFADE.DamageEffect.smiting", condition: "fear", intensity: "moderate", duration: "1d6" }],
    Ex: [{ key: "expel", cost: 3, label: "THEFADE.DamageEffect.expel", condition: "stunned", intensity: "moderate", duration: "1d6" }],
    Psi: [
        { key: "psychicSanity", cost: 2, label: "THEFADE.DamageEffect.psychicSanity", sanity: "half" },
        { key: "psychicConfusion", cost: 3, label: "THEFADE.DamageEffect.psychicConfusion", condition: "confusion", duration: "1d6" }
    ],
    Co: [{ key: "corruption", cost: 2, label: "THEFADE.DamageEffect.corruption" }]
};

/** Compound weapon damage codes and the base types whose effects they offer. */
THEFADE.damageTypeParts = { BoP: ["B", "P"], BP: ["B", "P"], SP: ["S", "P"], SoP: ["S", "P"], SoB: ["S", "B"] };

/* -------------------------------------------- */
/*  Equipment                                   */
/* -------------------------------------------- */

THEFADE.weaponSkills = {
    Axe: "Axe", Bow: "Bow", Cudgel: "Cudgel", Firearm: "Firearm", "Heavy Weaponry": "Heavy Weaponry",
    Polearm: "Polearm", Sword: "Sword", Thrown: "Thrown", Unarmed: "Unarmed", Spellcasting: "Spellcasting"
};
THEFADE.weaponHandedness = {
    Light: "THEFADE.Handedness.light",
    "One-Handed": "THEFADE.Handedness.oneHanded",
    "Two-Handed": "THEFADE.Handedness.twoHanded",
    "Natural Weapon": "THEFADE.Handedness.natural"
};
THEFADE.weaponQualities = WEAPON_QUALITIES;
THEFADE.weaponDamageAttributes = WEAPON_DAMAGE_ATTRIBUTE_OPTIONS;
THEFADE.weaponEnchantBasePrices = WEAPON_ENCHANT_BASE_PRICES;
THEFADE.weaponStrengthening = WEAPON_STRENGTHENING_OPTIONS;
THEFADE.weaponModSlots = WEAPON_MOD_SLOTS;

THEFADE.armorLocations = {
    Head: "Head",
    "Head+": "Head+ (Coif, Gorget)",
    Body: "Body",
    "Body+": "Body+ (Leather Coat, Chain Shirt)",
    Arms: "Arms",
    "Arms+": "Arms+ (Ailette, Couter)",
    Legs: "Legs",
    "Legs+": "Legs+ (Poleyn, Tasset)",
    Shield: "Shield"
};
THEFADE.armorEnchantBasePrice = ARMOR_ENCHANT_BASE_PRICE;
THEFADE.armorStrengthening = ARMOR_STRENGTHENING_OPTIONS;
THEFADE.armorModSlots = ARMOR_MOD_SLOTS;

THEFADE.materials = {
    iron: "Iron (Standard)", bone: "Bone", obsidian: "Obsidian", wood: "Wood", leather: "Leather",
    copper: "Copper", bronze: "Bronze", coldIron: "Cold Iron", steel: "Steel", coldSteel: "Cold Steel",
    gold: "Gold", orichalcum: "Orichalcum", silver: "Silver", mithral: "Mithral", platinum: "Platinum",
    adamantine: "Adamantine", ritewood: "Ritewood", blacksteel: "Blacksteel"
};

THEFADE.spellSchools = {
    General: "General", Divine: "Divine", Elementalism: "Elementalism", Malevolent: "Malevolent",
    Martial: "Martial", Naturalism: "Naturalism", Preternaturalism: "Preternaturalism",
    Rituals: "Rituals", Runes: "Runes", Spiritualism: "Spiritualism"
};
THEFADE.darkSchoolNames = DARK_SCHOOL_NAMES;
THEFADE.spellDefenses = { Avoid: "THEFADE.Defense.avoid", Resilience: "THEFADE.Defense.resilience", Grit: "THEFADE.Defense.grit" };
THEFADE.mishapModifiers = {
    none: "THEFADE.Mishap.none",
    corruption: "THEFADE.Mishap.corruption"
};

THEFADE.pathTiers = { 1: "THEFADE.Path.tier1", 2: "THEFADE.Path.tier2", 3: "THEFADE.Path.tier3" };

THEFADE.abilityActivations = {
    passive: "THEFADE.Activation.passive",
    active: "THEFADE.Activation.active"
};

THEFADE.talentTypes = {
    general: "General Talents", combat: "Combat Talents", magic: "Magic Talents",
    species: "Species Talents", monster: "Monster Talents"
};
THEFADE.traitTypes = {
    general: "General", species: "Species", background: "Background", physical: "Physical",
    mental: "Mental", social: "Social", supernatural: "Supernatural"
};

THEFADE.itemPowerOverlap = ITEM_POWER_OVERLAP_OPTIONS;
THEFADE.itemPowerCatalysts = {
    "": "Unknown / Unspecified",
    "planar-essence": "Planar Essence",
    "divine-gift": "Divine Gift",
    "bones-of-glory": "Bones of Glory"
};
THEFADE.corruptionValues = { 0: "Automatic from price", 1: "1", 2: "2", 3: "3", 4: "4" };

THEFADE.alchemicalSkills = ALCHEMICAL_SKILL_OPTIONS;

THEFADE.poison = {
    administration: { injury: "Injury", ingested: "Ingested", inhaled: "Inhaled", contact: "Contact" },
    onset: {
        immediate: "Immediate (on hit)", fast: "Fast (1 round)", moderate: "Moderate (10 minutes)",
        slow: "Slow (3 hours)", insidious: "Insidious (5 days)"
    },
    categories: {
        neurotoxin: "Neurotoxin", hemotoxin: "Hemotoxin", cytotoxin: "Cytotoxin", psychotoxin: "Psychotoxin",
        thaumatoxin: "Thaumatoxin", aetherotoxin: "Aetherotoxin", pathotoxin: "Pathotoxin", aisthetoxin: "Aisthetoxin"
    }
};

THEFADE.disease = {
    transmission: { airborne: "Airborne", contact: "Contact", fluid: "Fluid", ingested: "Ingested", injury: "Injury" },
    durationTypes: { temporary: "Temporary (T)", chronic: "Chronic", permanent: "Permanent" }
};

THEFADE.communicationComplexity = { audio: "Audio Only", audiovisual: "Audio & Visual" };
THEFADE.dreamTypes = { "": "—", dream: "Dream", nightmare: "Nightmare" };
THEFADE.vehicleTypes = { land: "Land", water: "Water", air: "Air", space: "Space" };

THEFADE.clothing = {
    types: {
        normal: "Normal Clothing", arctic: "Arctic Clothing", desert: "Desert Clothing", noble: "Noble Clothing",
        hat: "Hat", shoes: "Shoes", mask: "Mask", glasses: "Glasses", jewelry: "Jewelry",
        snowshoes: "Snowshoes", gasmask: "Gas Mask", other: "Other"
    },
    protectionLevels: { none: "None", minor: "Minor", moderate: "Moderate", major: "Major", immunity: "Immunity" },
    qualities: { poor: "Poor", common: "Common", fine: "Fine", masterwork: "Masterwork", noble: "Noble" },
    locations: {
        body: "Body", head: "Head", feet: "Feet", hands: "Hands", face: "Face",
        neck: "Neck", wrist: "Wrist", finger: "Finger", other: "Other"
    }
};

THEFADE.mutationSeverities = MUTATION_SEVERITIES;
THEFADE.heritageTypes = Object.fromEntries(Object.values(CROSSBREED_OUTCOMES).map(outcome => [outcome.key, outcome.label]));
THEFADE.trapCategories = { mechanical: "Mechanical", magical: "Magical", environmental: "Environmental" };
THEFADE.hazardCategories = { hazard: "Hazard", atmosphere: "Atmosphere", terrain: "Terrain", weather: "Weather" };
THEFADE.hazardDefenses = { none: "No attack roll", resilience: "Resilience", avoid: "Avoid", grit: "Grit" };
THEFADE.damageTracks = { hp: "Health (HP)", sanity: "Sanity" };
THEFADE.downtimeTypes = {
    crafting: "Crafting", training: "Training", social: "Social & Political", exploration: "Exploration",
    commerce: "Commerce", leisure: "Leisure", magic: "Magical Pursuit", other: "Other"
};
THEFADE.downtimeStatuses = { planned: "Planned", active: "Active", completed: "Completed", abandoned: "Abandoned" };

THEFADE.naturalDeflectionRatings = { fragile: "Fragile", average: "Average", tough: "Tough" };
THEFADE.naturalDeflectionMultipliers = {
    "0.25": "1/4", "0.3333333333": "1/3", "0.5": "1/2", "0.6666666667": "2/3", "1": "Unmodified", "2": "Double"
};
THEFADE.standardAttackModes = { grant: "Grant", choice: "Choice" };

/**
 * Item families group the 37 item types for creation menus and inventory
 * sections. Families never change stored document types.
 */
THEFADE.itemFamilies = {
    equipment: { label: "THEFADE.Family.equipment", types: ["weapon", "armor", "clothing", "magicitem"] },
    gear: { label: "THEFADE.Family.gear", types: ["item", "travel", "musical"] },
    consumables: { label: "THEFADE.Family.consumables", types: ["potion", "drug", "poison", "medical", "alchemical"] },
    devices: { label: "THEFADE.Family.devices", types: ["staff", "wand", "gate", "communication", "containment", "dream"] },
    companions: { label: "THEFADE.Family.companions", types: ["mount", "vehicle", "biological", "fleshcraft"] },
    abilities: { label: "THEFADE.Family.abilities", types: ["talent", "trait", "precept", "skill"] },
    origins: { label: "THEFADE.Family.origins", types: ["species", "monsterspecies", "path", "monsterpath", "heritage"] },
    magic: { label: "THEFADE.Family.magic", types: ["spell"] },
    rules: { label: "THEFADE.Family.rules", types: ["disease", "mutation", "trap", "hazard", "downtime"] }
};

/** Item types that are physical, carried objects (contribute weight, can be equipped/traded). */
THEFADE.physicalItemTypes = [
    "weapon", "armor", "clothing", "magicitem", "item", "travel", "musical", "potion", "drug", "poison",
    "medical", "alchemical", "staff", "wand", "gate", "communication", "containment", "dream",
    "mount", "vehicle", "biological", "fleshcraft"
];

/** Compendium pack that holds each item type, for "browse" buttons. */
THEFADE.itemPacks = {
    skill: "skills", path: "paths", monsterpath: "paths", species: "species", monsterspecies: "species",
    weapon: "weapons", armor: "armor", spell: "spells", talent: "talents", trait: "traits", precept: "precepts",
    magicitem: "magic-item", potion: "magic-item", staff: "magic-item", wand: "magic-item", gate: "magic-item",
    item: "mundane-item", alchemical: "mundane-item", medical: "mundane-item", travel: "mundane-item",
    biological: "mundane-item", musical: "mundane-item", drug: "mundane-item", poison: "mundane-item",
    clothing: "mundane-item", communication: "mundane-item", containment: "mundane-item", dream: "mundane-item",
    mount: "mundane-item", vehicle: "mundane-item", fleshcraft: "mundane-item"
};

/** Default artwork for newly created items of each type. */
THEFADE.defaultItemIcons = {
    weapon: "icons/svg/sword.svg", armor: "icons/svg/shield.svg", spell: "icons/svg/daze.svg",
    path: "icons/svg/book.svg", monsterpath: "icons/svg/book.svg", species: "icons/svg/mystery-man.svg",
    monsterspecies: "icons/svg/mystery-man.svg", skill: "icons/svg/upgrade.svg", talent: "icons/svg/aura.svg",
    trait: "icons/svg/aura.svg", precept: "icons/svg/sun.svg", potion: "icons/svg/tankard.svg",
    magicitem: "icons/svg/item-bag.svg", trap: "icons/svg/trap.svg", hazard: "icons/svg/hazard.svg",
    disease: "icons/svg/biohazard.svg", mutation: "icons/svg/acid.svg", downtime: "icons/svg/clockwork.svg"
};

export default THEFADE;
