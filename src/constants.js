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

export const DEFAULT_WEAPON = {
    damage: 0,
    damageType: "S",
    critical: 4,
    handedness: "One-Handed",
    range: "Melee",
    integrity: 10,
    weight: 1,
    qualities: "",
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

export const DEFAULT_TOKEN = "icons/svg/item-bag.svg";

export const PATH_SKILL_TYPES = {
    SPECIFIC_SKILL: "specific",
    SPECIFIC_CUSTOM: "specific-custom",
    CHOOSE_CATEGORY: "choose-category",
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
    }
};

// Global debug flag for The Fade system
export const DEBUG = false;
if (typeof CONFIG !== 'undefined') {
    CONFIG.debug = CONFIG.debug || {};
    CONFIG.debug.thefade = DEBUG;
}
