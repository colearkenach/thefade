// Constants shared across The Fade system

export const SIZE_OPTIONS = {
    miniscule: "Miniscule",
    diminutive: "Diminutive",
    tiny: "Tiny",
    small: "Small",
    medium: "Medium",
    large: "Large",
    massive: "Massive",
    immense: "Immense",
    enormous: "Enormous",
    titanic: "Titanic"
};

export const AURA_COLOR_OPTIONS = {
    "": "None",
    red: "Red",
    blue: "Blue",
    green: "Green",
    yellow: "Yellow",
    purple: "Purple",
    orange: "Orange",
    pink: "Pink",
    gold: "Gold",
    silver: "Silver",
    turquoise: "Turquoise",
    indigo: "Indigo",
    brown: "Brown",
    violet: "Violet",
    gray: "Gray",
    black: "Black",
    white: "White"
};

export const AURA_SHAPE_OPTIONS = {
    "": "None",
    circular: "Circular",
    jagged: "Jagged",
    flowing: "Flowing",
    spiky: "Spiky",
    radiant: "Radiant",
    dense: "Dense",
    wispy: "Wispy",
    geometric: "Geometric"
};

export const FLEXIBLE_BONUS_OPTIONS = {
    "": "-- Select Ability --",
    physique: "Physique",
    finesse: "Finesse",
    mind: "Mind",
    presence: "Presence",
    soul: "Soul"
};

export const AURA_INTENSITY_OPTIONS = {
    "": "None",
    faint: "Faint",
    moderate: "Moderate",
    intense: "Intense",
};

export const ADDICTION_LEVEL_OPTIONS = {
    none: "None",
    early: "Early Stages (+2D)",
    middle: "Middle Stage (+4D)",
    late: "Late Stage (+6D)",
    terminal: "Terminal (N/A)",
};

export const SKILL_RANK_OPTIONS = {
    untrained: "Untrained",
    learned: "Learned",
    practiced: "Practiced",
    adept: "Adept",
    experienced: "Experienced",
    expert: "Expert",
    mastered: "Mastered",
};

export const BODY_PARTS = ["head", "body", "leftarm", "rightarm", "leftleg", "rightleg"];

/**
 * Pretty-print labels for weapon damage type codes. Used by the item sheet
 * to render the typed Effective Damage breakdown (e.g. "3 Fire + 3 Bludgeoning").
 * Keep in sync with weaponDamageTypeOptions in item-sheet.js.
 */
export const DAMAGE_TYPE_LABELS = {
    "B": "Bludgeoning",
    "S": "Slashing",
    "P": "Piercing",
    "BoP": "Bludgeoning or Piercing",
    "BP": "Bludgeoning & Piercing",
    "SP": "Slashing & Piercing",
    "SoP": "Slashing or Piercing",
    "SoB": "Slashing or Bludgeoning",
    "F": "Fire",
    "C": "Cold",
    "A": "Acid",
    "E": "Electricity",
    "So": "Sonic",
    "Sm": "Smiting",
    "Ex": "Expel",
    "Psi": "Psychokinetic",
    "Co": "Corruption",
    "Ut": "Untyped"
};

export const DEFAULT_WEAPON = {
    damage: 0,
    damageType: "S",
    damageComponents: [],
    critical: 4,
    handedness: "One-Handed",
    range: "Melee",
    integrity: 10,
    weight: 1,
    qualities: "",
    qualityIds: [],
    skill: "Sword",
    attribute: "physique",
    miscBonus: 0,
    isEnchanted: false,
    enchantmentPrice: 0,
    damageIncrease: 0,
    strengtheningPrice: 0,
    enchantmentPowers: [],
    modifications: []
};

export const DEFAULT_ARMOR = {
    ap: 0,
    currentAP: 0,
    isHeavy: false,
    location: "body",
    weight: 1,
    autoBlock: "",
    equipped: false,
    otherLimbAP: 0,
    isEnchanted: false,
    enchantmentPrice: 0,
    apIncrease: 0,
    strengtheningPrice: 0,
    enchantmentPowers: [],
    modifications: []
};

// Enchantment base prices (silver pieces) keyed by weapon skill or armor type
export const WEAPON_ENCHANT_BASE_PRICES = {
    "Bow": 4000,
    "Firearm": 6000,
    "Heavy Weaponry": 6000,
    "default": 2500
};

export const ARMOR_ENCHANT_BASE_PRICE = 2000;

// Weapon strengthening: price = (damage increase)^2 * 1000
// Armor strengthening: price = AP increase * 500
export const WEAPON_STRENGTHENING_OPTIONS = {
    0: "None",
    2: "+2 Damage (4,000 sp.)",
    4: "+4 Damage (16,000 sp.)",
    6: "+6 Damage (36,000 sp.)",
    8: "+8 Damage (64,000 sp.)"
};

export const ARMOR_STRENGTHENING_OPTIONS = {
    0: "None",
    10: "+10 AP (5,000 sp.)",
    30: "+30 AP (15,000 sp.)",
    60: "+60 AP (30,000 sp.)",
    90: "+90 AP (45,000 sp.)"
};

// Modification slot counts
export const WEAPON_MOD_SLOTS = {
    "Light": 1,
    "One-Handed": 2,
    "Two-Handed": 3
};

export const ARMOR_MOD_SLOTS = {
    "Head": 1,
    "Head+": 1,
    "Arms": 1,
    "Arms+": 1,
    "Legs": 2,
    "Legs+": 2,
    "Shield": 2,
    "Body": 3,
    "Body+": 3
};

export const DEFAULT_SKILL = {
    rank: "untrained",
    category: "Combat",
    attribute: "physique",
    description: "",
    miscBonus: 0
};

export const COMBAT_DAMAGE_TYPES = [
    { key: "B", label: "Bludgeoning" },
    { key: "S", label: "Slashing" },
    { key: "P", label: "Piercing" },
    { key: "F", label: "Fire" },
    { key: "C", label: "Cold" },
    { key: "A", label: "Acid" },
    { key: "E", label: "Electricity" },
    { key: "So", label: "Sonic" },
    { key: "Sm", label: "Smiting" },
    { key: "Ex", label: "Expel" },
    { key: "Psi", label: "Psychokinetic" },
    { key: "Co", label: "Corruption" }
];

export const COMBAT_IMMUNITY_DAMAGE_TYPES = COMBAT_DAMAGE_TYPES.filter(type => type.key !== "Co");

export const COMBAT_STATUS_IMMUNITIES = [
    { key: "all", condition: "", label: "All Status Effects" },
    { key: "bleed", condition: "bleed", label: "Bleed" },
    { key: "blindness", condition: "blindness", label: "Blindness" },
    { key: "confusion", condition: "confusion", label: "Confusion" },
    { key: "dazed", condition: "dazed", label: "Dazed" },
    { key: "deafness", condition: "deafness", label: "Deafness" },
    { key: "fatigue", condition: "fatigue", label: "Fatigue" },
    { key: "fear", condition: "fear", label: "Fear" },
    { key: "flatFooted", condition: "flatFooted", label: "Flat-Footed" },
    { key: "illness", condition: "illness", label: "Illness" },
    { key: "pain", condition: "pain", label: "Pain" },
    { key: "paralysis", condition: "paralysis", label: "Paralysis" },
    { key: "sleep", condition: "sleep", label: "Sleep" },
    { key: "staggered", condition: "staggered", label: "Staggered" },
    { key: "stunned", condition: "stunned", label: "Stunned" }
];

export const COMBAT_IMMUNITY_EFFECTS = [
    { key: "poisons", label: "Poisons" },
    { key: "diseases", label: "Diseases" },
    { key: "mindAffecting", label: "Mind-Affecting Effects" },
    { key: "criticalHits", label: "Critical Hits" },
    { key: "deathEffects", label: "Death Effects" }
];

export const VULNERABILITY_SEVERITY_OPTIONS = {
    minor: "Minor (x1.5)",
    moderate: "Moderate (x2)",
    severe: "Severe (x3)"
};

export const UNIVERSAL_ABILITY_CATEGORIES = [
    {
        key: "defensive",
        label: "Defensive",
        abilities: [
            { key: "adaptiveMetabolism", label: "Adaptive Metabolism", description: "Survives on organic material, oxygen-poor environments, and ignores ingested poisons and starvation." },
            { key: "allAroundVision", label: "All-Around Vision", description: "Resists single-target blindness and avoids Sight penalties from limited facing." },
            { key: "amorphous", label: "Amorphous", description: "Can squeeze through very small spaces by reshaping its body." },
            { key: "amphibious", label: "Amphibious", description: "Can live and breathe comfortably on land or underwater." },
            { key: "crystallineBody", label: "Crystalline Body", description: "Immune to Bleed, Fatigue, Illness, and Pain, but vulnerable to Sonic damage." },
            { key: "fortified", label: "Fortified", description: "Retreats into a defensive shell, routing attacks to Body and halving damage before AP." },
            { key: "frightening", label: "Frightening", description: "Causes Sanity damage and fear through its horrifying presence." },
            { key: "incorporeal", label: "Incorporeal", description: "Non-physical or semi-physical, passing through mundane matter and resisting mundane attacks." },
            { key: "mindStatic", label: "Mind Static", description: "Disrupts spellcasting and punishes mind-reading senses within its radius." },
            { key: "reactiveSpines", label: "Reactive Spines", description: "Deals piercing damage back to unarmed or natural attackers." },
            { key: "regeneration", label: "Regeneration", description: "Recovers HP each turn and can regrow lost limbs over time.", amount: { label: "HP / turn", default: 1, min: 1 } },
            { key: "shapeshift", label: "Shapeshift", description: "Changes between forms, altering abilities and physical features." },
            { key: "spellResistance", label: "Spell Resistance", description: "Negates spells through imperfect chance or perfect immunity.", amount: { label: "SR %", default: 50, min: 1, max: 100 } },
            { key: "swarm", label: "Swarm", description: "Acts as one mass of smaller creatures with special immunities, attacks, and weaknesses." },
            { key: "toxicBlood", label: "Toxic Blood", description: "Sprays acidic blood into adjacent hexes when injured by piercing or slashing damage." }
        ]
    },
    {
        key: "mental",
        label: "Mental",
        abilities: [
            { key: "dreamwalker", label: "Dreamwalker", description: "Can enter the dreams of nearby sleeping creatures." },
            { key: "hivemind", label: "Hivemind", description: "Telepathically shares threat awareness with linked creatures." },
            { key: "memoryAssimilation", label: "Memory Assimilation", description: "Steals and experiences memories from a touched creature." },
            { key: "mimic", label: "Mimic", description: "Imitates voices and sounds heard recently." }
        ]
    },
    {
        key: "movement",
        label: "Movement",
        abilities: [
            { key: "dimensionalStep", label: "Dimensional Step", description: "Movement briefly becomes teleportation between start and end hexes." }
        ]
    },
    {
        key: "sensory",
        label: "Sensory",
        abilities: [
            { key: "auraReading", label: "Aura Reading", description: "Detects creatures with auras, including invisible creatures, within range." },
            { key: "blindvision", label: "Blindvision", description: "Sees through nonstandard senses or magic despite blindness." },
            { key: "keenSmell", label: "Keen Smell", description: "Automatically gets Smell checks to notice strong scents in a large area." },
            { key: "lifeSense", label: "Life Sense", description: "Reads life force, death state, and current HP through supernatural sight." },
            { key: "magicalDetection", label: "Magical Detection", description: "Continuously senses nearby magical auras." },
            { key: "thermalVision", label: "Thermal Vision", description: "Detects heat signatures, even through thin walls." },
            { key: "thoughtSense", label: "Thought Sense", description: "Detects sentient thoughts nearby, with rules for resisting and crowded areas." },
            { key: "tremorSense", label: "Tremor Sense", description: "Detects creatures through ground vibrations." },
            { key: "truespeak", label: "Truespeak", description: "Speaks so language-capable creatures understand it in their own language." }
        ]
    },
    {
        key: "weakness",
        label: "Weakness",
        abilities: [
            { key: "sunlightCurse", label: "Sunlight Curse", description: "Sunlight destroys the creature unless the entry says otherwise." }
        ]
    }
];

export const DEFAULT_COMBAT_TRAITS = {
    abilities: {},
    abilityValues: {},
    abilityNotes: "",
    spellResistancePercent: 50,
    resistances: {},
    immunities: {
        damageTypes: {},
        statuses: {},
        effects: {}
    },
    absorption: {},
    vulnerabilities: {},
    vulnerabilitySeverity: {},
    notes: ""
};

export const DEFAULT_TOKEN = "icons/svg/item-bag.svg";

export const PATH_SKILL_TYPES = {
    SPECIFIC_SKILL: "specific",
    SPECIFIC_CUSTOM: "specific-custom",
    CHOOSE_CATEGORY: "choose-category",
    CHOOSE_ANY: "choose-any",
    CHOOSE_LORE: "choose-lore",
    CHOOSE_PERFORM: "choose-perform",
    CHOOSE_CRAFT: "choose-craft",
};

export const DEFAULT_SKILLS = [
    // Combat Skills
    { name: "Axe", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Bow", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Cudgel", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Firearm", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Polearm", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Sword", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Thrown", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Unarmed", category: "Combat", attribute: "physique", rank: "untrained" },

    // Craft Skills
    { name: "Blacksmithing", category: "Craft", attribute: "physique", rank: "untrained" },
    { name: "Carpentry", category: "Craft", attribute: "finesse", rank: "untrained" },
    { name: "Chemistry", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Cooking", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Herbalism", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Toxicology", category: "Craft", attribute: "mind", rank: "untrained" },

    // Knowledge Skills
    { name: "Appraise", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Gambling", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Insight", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Linguistics", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Medicine", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Research", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Symbology", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Tracking", category: "Knowledge", attribute: "mind", rank: "untrained" },

    // Magical Skills
    { name: "Arcana", category: "Magical", attribute: "mind", rank: "untrained" },
    { name: "Spellcasting", category: "Magical", attribute: "soul", rank: "untrained" },
    { name: "Ritual", category: "Magical", attribute: "mind_soul", rank: "untrained" },

    // Physical Skills
    { name: "Acrobatics", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Athletics", category: "Physical", attribute: "physique", rank: "untrained" },
    { name: "Contortion", category: "Physical", attribute: "physique_finesse", rank: "untrained" },
    { name: "Drive", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Flight", category: "Physical", attribute: "physique_finesse", rank: "untrained" },
    { name: "Hunting", category: "Physical", attribute: "physique_mind", rank: "untrained" },
    { name: "Lockpicking", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Ride", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Rope Use", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Sneaking", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Trickery", category: "Physical", attribute: "finesse", rank: "untrained" },

    // Sense Skills
    { name: "Hearing", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Sight", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Smell", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Taste", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Touch", category: "Sense", attribute: "mind", rank: "untrained" },

    // Social Skills
    { name: "Animal Handling", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Deception", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Disguise", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Etiquette", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Haggling", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Intimidate", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Persuasion", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Seduction", category: "Social", attribute: "presence", rank: "untrained" }
];

export const FALLBACK_ACTOR_DATA = {
    attributes: {
        physique: { value: 1, speciesBonus: 0 },
        finesse: { value: 1, speciesBonus: 0 },
        mind: { value: 1, speciesBonus: 0 },
        presence: { value: 1, speciesBonus: 0 },
        soul: { value: 1, speciesBonus: 0 }
    },
    defenses: {
        resilience: 1,
        avoid: 1,
        grit: 1,
        resilienceBonus: 0,
        avoidBonus: 0,
        gritBonus: 0,
        passiveDodge: 0,
        passiveParry: 0,
        facing: "front",
        avoidPenalty: 0
    },
    hp: { value: 1, max: 1 },
    sanity: { value: 10, max: 10 },
    species: {
        name: "",
        baseHP: 0,
        size: "medium",
        abilities: "",
        flexibleBonus: {
            value: 0,
            selectedAttribute: "",
        }
    },
    naturalDeflection: {
        head: { current: 0, max: 0, stacks: false },
        body: { current: 0, max: 0, stacks: false },
        leftarm: { current: 0, max: 0, stacks: false },
        rightarm: { current: 0, max: 0, stacks: false },
        leftleg: { current: 0, max: 0, stacks: false },
        rightleg: { current: 0, max: 0, stacks: false }
    },
    combatTraits: {
        abilities: {},
        abilityValues: {},
        abilityNotes: "",
        spellResistancePercent: 50,
        resistances: {},
        immunities: { damageTypes: {}, statuses: {}, effects: {} },
        absorption: {},
        vulnerabilities: {},
        vulnerabilitySeverity: {},
        notes: ""
    }
};

// Global debug flag for The Fade system
export const DEBUG = false;
if (typeof CONFIG !== 'undefined') {
    CONFIG.debug = CONFIG.debug || {};
    CONFIG.debug.thefade = DEBUG;
}
