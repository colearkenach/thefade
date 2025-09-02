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
    miscBonus: 0
};

export const DEFAULT_ARMOR = {
    ap: 0,
    currentAP: 0,
    isHeavy: false,
    location: "body",
    weight: 1,
    autoBlock: "",
    equipped: false,
    otherLimbAP: 0
};

export const DEFAULT_SKILL = {
    rank: "untrained",
    category: "Combat",
    attribute: "physique",
    description: "",
    miscBonus: 0
};

// Global debug flag for The Fade system
export const DEBUG = false;
if (typeof CONFIG !== 'undefined') {
    CONFIG.debug = CONFIG.debug || {};
    CONFIG.debug.thefade = DEBUG;
}

