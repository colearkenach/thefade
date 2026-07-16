// Optional and GM-facing rules from the Bestiary of Morta IV, Heirs to
// Rangar, and The Fade: Abyss core rulebook. Pure table data and helpers live
// here so sheets, chat workflows, and the GM toolkit use the same results.

export const RULE_SOURCES = Object.freeze({
    traps: "Bestiary of Morta IV, pp. 320-329",
    skillChallenges: "Bestiary of Morta IV, pp. 330-334",
    encounterDie: "Bestiary of Morta IV, pp. 335-339",
    alternateRules: "Bestiary of Morta IV, pp. 340-351",
    mutations: "Heirs to Rangar, pp. 21-32",
    crossbreeds: "Heirs to Rangar, pp. 33-47",
    environments: "The Fade: Abyss v1.5, pp. 52-64",
    downtime: "The Fade: Abyss v1.5, pp. 407-414"
});

export const SKILL_CHALLENGE_COMPLEXITIES = Object.freeze({
    simple: { label: "Simple", successes: 4, failures: 2, time: 6 },
    moderate: { label: "Moderate", successes: 6, failures: 3, time: 10 },
    complex: { label: "Complex", successes: 8, failures: 4, time: 15 },
    epic: { label: "Epic", successes: 12, failures: 6, time: 20 }
});

export const ENCOUNTER_DANGER_LEVELS = Object.freeze({
    safe: { label: "Safe Area", threshold: null, example: "Towns, patrolled roads" },
    low: { label: "Low Danger", threshold: 11, example: "Borderlands, sparse wilderness" },
    moderate: { label: "Moderate Danger", threshold: 9, example: "Dense forest, old ruins" },
    high: { label: "High Danger", threshold: 7, example: "Monster lair, active war zone" },
    extreme: { label: "Extreme Danger", threshold: 5, example: "Demonic realm, cursed wastes" }
});

export const ENCOUNTER_MODIFIERS = Object.freeze([
    { label: "Loud activity", value: 2 },
    { label: "Highly visible or open area", value: 1 },
    { label: "Obvious or flashy magic", value: 1 },
    { label: "Moving stealthily or cautiously", value: -1 },
    { label: "Following major roads or used paths", value: -1 },
    { label: "Camouflage or magical concealment", value: -2 }
]);

export function encounterTypeFromRoll(roll, escalation = 0) {
    const hostileMax = Math.min(10, 2 + Math.max(0, Number(escalation) || 0));
    if (roll <= hostileMax) {
        return { key: "hostile", label: "Hostile Encounter", description: "A creature or group seeks to attack the party." };
    }
    if (roll <= hostileMax + 2) {
        return { key: "environmental", label: "Environmental Hazard", description: "Dangerous terrain, a trap, or a weather shift." };
    }
    return { key: "nonHostile", label: "Non-hostile Encounter", description: "Neutral wildlife, travelers, ruins, or another discovery." };
}

export const MUTATION_SEVERITIES = Object.freeze({
    minor: "Minor",
    major: "Major",
    severe: "Severe",
    critical: "Critical",
    corrupted: "Corrupted",
    xenochild: "Xenochild"
});

let mutationTableCache = null;

export async function loadMutationTables() {
    if (mutationTableCache) return mutationTableCache;
    const response = await fetch("systems/thefade/data/mutations.json");
    if (!response.ok) throw new Error(`Unable to load mutation tables (${response.status})`);
    mutationTableCache = await response.json();
    return mutationTableCache;
}

export async function rollMutation(severity = "minor", forcedRoll = null) {
    const tables = await loadMutationTables();
    const table = tables[severity];
    if (!Array.isArray(table) || !table.length) throw new Error(`Unknown mutation table: ${severity}`);
    const roll = forcedRoll == null
        ? await new Roll("1d100").evaluate()
        : { total: Math.min(100, Math.max(1, Number(forcedRoll) || 1)) };
    const total = Number(roll.total) || 1;
    const result = table.find(entry => total >= entry.min && total <= entry.max) ?? table[table.length - 1];
    return { roll: total, result, severity, label: MUTATION_SEVERITIES[severity] ?? severity };
}

export const CROSSBREED_TYPES = Object.freeze({
    HH: "Humanoid (Human)",
    HD: "Humanoid (Demihuman)",
    XG: "Xeno (Goblin)",
    XI: "Xeno (Insect)",
    XM: "Xeno (Mammal)",
    XO: "Xeno (Other)",
    XR: "Xeno (Reptile)",
    EXC: "Extradimensional (Celestial)",
    EXD: "Extradimensional (Demonic)",
    EXO: "Extradimensional (Other)",
    UH: "Undead (High)",
    UL: "Undead (Low)",
    MD: "Magical (Dragon)",
    MF: "Magical (Fae)",
    P: "Plant",
    A: "Artificial"
});

export const CROSSBREED_OUTCOMES = Object.freeze({
    BRTR: { key: "breedTrue", label: "Breed True", characteristicChanges: 0, standardMutationRolls: "None", xenochildRolls: 1 },
    HYBR: { key: "hybrid", label: "Hybrid", characteristicChanges: 1, standardMutationRolls: "None", xenochildRolls: 2 },
    MULE: { key: "mule", label: "Mule", characteristicChanges: 2, standardMutationRolls: "1d4 Minor; 1d2-1 Major", xenochildRolls: 3 },
    DEGN: { key: "degenerate", label: "Degenerate", characteristicChanges: 3, standardMutationRolls: "1d6 Minor; 1d4 Major; 1d4-2 Severe", xenochildRolls: 4 },
    NONV: { key: "nonViable", label: "Non-viable", characteristicChanges: 0, standardMutationRolls: "Not naturally viable", xenochildRolls: 5 },
    SPEC: { key: "special", label: "Special Crossbreed", characteristicChanges: 0, standardMutationRolls: "See the special crossbreed entry", xenochildRolls: 2 }
});

export const XENOCHILD_MODIFIERS = Object.freeze({
    designerSculpting: { label: "Designer Sculpting (+1 Attribute)", rolls: 1 },
    extradimensionalParentage: { label: "Extradimensional Parentage", rolls: 3 },
    dragonParent: { label: "Magic (Dragon) Parent", rolls: 2 },
    faeParent: { label: "Magic (Fae) Parent", rolls: 1 },
    undeadDNA: { label: "Undead DNA", rolls: 2 }
});

const CROSSBREED_ORDER = ["HH", "HD", "XG", "XI", "XM", "XO", "XR", "EXC", "EXD", "EXO", "UH", "UL", "MD", "MF", "P", "A"];
const CROSSBREED_MATRIX = Object.freeze({
    HH:  ["BRTR","HYBR","MULE","NONV","HYBR","DEGN","DEGN","HYBR","HYBR","DEGN","HYBR","NONV","HYBR","NONV","NONV","NONV"],
    HD:  ["HYBR","HYBR","MULE","NONV","HYBR","DEGN","DEGN","HYBR","HYBR","DEGN","HYBR","NONV","HYBR","NONV","NONV","NONV"],
    XG:  ["BRTR","HYBR","BRTR","NONV","MULE","NONV","NONV","HYBR","HYBR","NONV","MULE","NONV","HYBR","MULE","NONV","NONV"],
    XI:  ["NONV","NONV","NONV","BRTR","NONV","NONV","NONV","DEGN","DEGN","NONV","NONV","NONV","DEGN","NONV","NONV","NONV"],
    XM:  ["HYBR","HYBR","MULE","NONV","HYBR","DEGN","DEGN","HYBR","HYBR","DEGN","MULE","NONV","HYBR","NONV","NONV","NONV"],
    XO:  ["DEGN","DEGN","NONV","NONV","DEGN","HYBR","DEGN","HYBR","HYBR","NONV","MULE","NONV","DEGN","NONV","NONV","NONV"],
    XR:  ["DEGN","DEGN","NONV","NONV","DEGN","DEGN","BRTR","HYBR","HYBR","NONV","MULE","NONV","HYBR","NONV","NONV","NONV"],
    EXC: ["HYBR","HYBR","HYBR","NONV","HYBR","HYBR","HYBR","BRTR","SPEC","SPEC","NONV","NONV","DEGN","HYBR","HYBR","NONV"],
    EXD: ["HYBR","HYBR","HYBR","NONV","HYBR","HYBR","HYBR","SPEC","BRTR","SPEC","HYBR","DEGN","DEGN","HYBR","HYBR","NONV"],
    EXO: ["BRTR","BRTR","BRTR","NONV","BRTR","BRTR","BRTR","SPEC","SPEC","BRTR","NONV","NONV","DEGN","BRTR","BRTR","NONV"],
    UH:  ["HYBR","HYBR","MULE","NONV","MULE","MULE","MULE","NONV","HYBR","DEGN","BRTR","DEGN","NONV","NONV","NONV","NONV"],
    UL:  ["NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV"],
    MD:  ["HYBR","HYBR","HYBR","DEGN","HYBR","HYBR","HYBR","DEGN","DEGN","DEGN","NONV","NONV","BRTR","HYBR","NONV","NONV"],
    MF:  ["HYBR","HYBR","MULE","DEGN","HYBR","MULE","MULE","HYBR","HYBR","DEGN","NONV","NONV","HYBR","BRTR","HYBR","NONV"],
    P:   ["NONV","NONV","NONV","NONV","NONV","NONV","NONV","HYBR","HYBR","DEGN","NONV","NONV","NONV","HYBR","BRTR","NONV"],
    A:   ["NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV","NONV"]
});

export function getCrossbreedOutcome(motherCode, fatherCode) {
    const fatherIndex = CROSSBREED_ORDER.indexOf(fatherCode);
    const code = CROSSBREED_MATRIX[motherCode]?.[fatherIndex] ?? "NONV";
    return { code, ...CROSSBREED_OUTCOMES[code] };
}

export function getBestCrossbreedOutcome(firstParentCode, secondParentCode) {
    const firstAsMother = getCrossbreedOutcome(firstParentCode, secondParentCode);
    const secondAsMother = getCrossbreedOutcome(secondParentCode, firstParentCode);
    const rank = { NONV:0, DEGN:1, MULE:2, HYBR:3, SPEC:3, BRTR:4 };
    return (rank[secondAsMother.code] ?? 0) > (rank[firstAsMother.code] ?? 0)
        ? secondAsMother
        : firstAsMother;
}

export function calculateXenochildRolls(outcomeCode, modifiers = {}) {
    const outcome = CROSSBREED_OUTCOMES[outcomeCode] ?? CROSSBREED_OUTCOMES.NONV;
    const breakdown = [];
    let bonus = 0;
    for (const [key, entry] of Object.entries(XENOCHILD_MODIFIERS)) {
        if (!modifiers[key]) continue;
        bonus += entry.rolls;
        breakdown.push({ key, label: entry.label, rolls: entry.rolls });
    }

    // The table adds +2 rolls per additional DNA source when three or more
    // parents participate. This field records sources beyond the first two.
    const additionalParents = Math.max(0, Math.floor(Number(modifiers.additionalParents) || 0));
    if (additionalParents) {
        const rolls = additionalParents * 2;
        bonus += rolls;
        breakdown.push({ key:"additionalParents", label:`${additionalParents} additional DNA source(s)`, rolls });
    }

    return { base:outcome.xenochildRolls, bonus, total:outcome.xenochildRolls + bonus, breakdown };
}

export const QUICK_MONSTER_OPTIONS = Object.freeze({
    attack: { unskilled: "Unskilled", basic: "Basic", competent: "Competent", deadly: "Deadly" },
    defense: { frail: "Frail", average: "Average", aboveAverage: "Above Average" },
    role: { minion: "Minion", standard: "Standard", elite: "Elite", boss: "Boss", epicBoss: "Epic Boss" },
    armor: { unarmored: "Unarmored", light: "Light", medium: "Medium", heavy: "Heavy", fortress: "Fortress", impervious: "Impervious" }
});

const QUICK_ATTACK_BASE = { unskilled: 4, basic: 6, competent: 8, deadly: 10 };
const QUICK_DEFENSE_ROWS = {
    frail: [2,2,3,3,4,4,5,5,6,6],
    average: [3,3,4,4,5,5,6,6,7,7],
    aboveAverage: [4,5,5,6,6,7,7,8,8,9]
};
const QUICK_HP = [12,14,16,18,20,22,25,28,31,35];
const QUICK_AP = [10,14,18,22,26,32,38,44,50,58];
const QUICK_DAMAGE = [3,5,7,9,11,14,17,20,23,27];
const SIZE_MULTIPLIERS = { miniscule:0.1, diminutive:0.25, tiny:0.5, small:0.75, medium:1, large:1.5, massive:2, immense:2.5, enormous:3, titanic:4 };
const ROLE_MULTIPLIERS = { minion:0.6, standard:1, elite:1.5, boss:2, epicBoss:3 };
const ARMOR_MULTIPLIERS = { unarmored:0.3, light:0.6, medium:1, heavy:1.5, fortress:2, impervious:3 };

function extendedBase(level, rows, increment = 1) {
    const el = Math.max(1, Math.floor(Number(level) || 1));
    if (el <= 10) return rows[el - 1];
    return rows[9] + ((el - 10) * increment);
}

function extendedHP(level) {
    const el = Math.max(1, Math.floor(Number(level) || 1));
    if (el <= 10) return QUICK_HP[el - 1];
    let hp = QUICK_HP[9];
    for (let current = 11; current <= el; current++) hp += 4 + Math.floor((current - 10) / 3);
    return hp;
}

export function buildQuickMonsterStats(options = {}) {
    const el = Math.max(1, Math.floor(Number(options.el) || 1));
    const attackTier = options.attackTier in QUICK_ATTACK_BASE ? options.attackTier : "competent";
    const defenseTier = options.defenseTier in QUICK_DEFENSE_ROWS ? options.defenseTier : "average";
    const size = options.size in SIZE_MULTIPLIERS ? options.size : "medium";
    const role = options.role in ROLE_MULTIPLIERS ? options.role : "standard";
    const armor = options.armor in ARMOR_MULTIPLIERS ? options.armor : "unarmored";
    const attackDice = el + QUICK_ATTACK_BASE[attackTier];
    const defense = el <= 10
        ? QUICK_DEFENSE_ROWS[defenseTier][el - 1]
        : QUICK_DEFENSE_ROWS[defenseTier][9] + Math.floor((el - 10 + 1) / 2);
    const baseHP = extendedHP(el);
    const hp = Math.max(1, Math.round(baseHP * SIZE_MULTIPLIERS[size] * ROLE_MULTIPLIERS[role]));
    const baseAP = extendedBase(el, QUICK_AP, 8);
    const ap = Math.max(0, Math.round(baseAP * SIZE_MULTIPLIERS[size] * ARMOR_MULTIPLIERS[armor]));
    const damage = extendedBase(el, QUICK_DAMAGE, 4);
    return { el, attackTier, defenseTier, size, role, armor, attackDice, defense, baseHP, hp, baseAP, ap, damage };
}

export const ANATOMY_OPTIONS = Object.freeze({
    humanoid: "Humanoid (Core)", quadruped: "Quadruped", serpentine: "Serpentine",
    wingedBiped: "Avian / Winged Biped", wingedQuadruped: "Winged Quadruped",
    multiArmed: "Multi-armed Humanoid", taurian: "Taurian", multiHeaded: "Multi-headed",
    insectoid: "Insectoid", octopoid: "Octopi / Tentacled", amorphous: "Amorphous",
    swarm: "Swarm", floater: "Floater"
});

const HUMANOID_ANATOMY_LOCATIONS = Object.freeze([
    { label: "Head", location: "head" },
    { label: "Body", location: "body" },
    { label: "Left Arm", location: "leftarm" },
    { label: "Right Arm", location: "rightarm" },
    { label: "Left Leg", location: "leftleg" },
    { label: "Right Leg", location: "rightleg" }
]);

// Each row is [min, max, left, front, back, right].
export const ANATOMY_TABLES = Object.freeze({
    quadruped: [
        [1,1,"Head","Head","Body","Head"], [2,5,"Body","Body","Body","Body"],
        [6,7,"Body","Front Left Leg","Rear Right Leg","Body"],
        [8,9,"Front Left Leg","Front Right Leg","Rear Left Leg","Front Right Leg"],
        [10,10,"Front Left Leg","Front Left Leg","Rear Right Leg","Front Right Leg"],
        [11,11,"Rear Left Leg","Front Right Leg","Rear Left Leg","Rear Right Leg"],
        [12,12,"Rear Left Leg","Front Left Leg","Rear Right Leg","Rear Right Leg"]
    ],
    serpentine: [
        [1,4,"Head","Head","Tail","Head"], [5,8,"Body","Body","Tail","Body"],
        [9,12,"Tail","Body","Body","Tail"]
    ],
    wingedBiped: [
        [1,1,"Head","Head","Head","Head"], [2,7,"Body","Body","Body","Body"],
        [8,8,"Left Arm","Body","Body","Right Arm"], [9,9,"Left Arm","Left Arm","Left Wing","Right Arm"],
        [10,10,"Left Wing","Right Arm","Left Wing","Right Wing"], [11,11,"Left Leg","Left Leg","Right Wing","Right Leg"],
        [12,12,"Left Leg","Right Leg","Right Wing","Right Leg"]
    ],
    wingedQuadruped: [
        [1,1,"Head","Head","Body","Head"], [2,5,"Body","Body","Body","Body"],
        [6,6,"Left Wing","Body","Body","Right Wing"], [7,8,"Left Wing","Front Left Leg","Left Wing","Right Wing"],
        [9,9,"Front Left Leg","Front Left Leg","Right Wing","Front Right Leg"],
        [10,10,"Front Left Leg","Front Right Leg","Right Wing","Front Right Leg"],
        [11,11,"Rear Left Leg","Front Right Leg","Rear Left Leg","Rear Right Leg"],
        [12,12,"Rear Left Leg","Front Right Leg","Rear Right Leg","Rear Right Leg"]
    ],
    multiArmed: [
        [1,1,"Head","Head","Head","Head"], [2,7,"Body","Body","Body","Body"],
        [8,8,"Upper Left Arm","Upper Left Arm","Upper Right Arm","Upper Right Arm"],
        [9,9,"Upper Left Arm","Upper Right Arm","Upper Left Arm","Upper Right Arm"],
        [10,10,"Lower Left Arm","Lower Left Arm","Lower Right Arm","Lower Right Arm"],
        [11,11,"Lower Left Arm","Lower Right Arm","Lower Left Arm","Lower Right Arm"],
        [12,12,"Left Leg","Left Leg","Right Leg","Right Leg"]
    ],
    taurian: [
        [1,1,"Head","Head","Lower Body","Head"], [2,3,"Upper Body","Upper Body","Lower Body","Upper Body"],
        [4,6,"Lower Body","Upper Body","Lower Body","Lower Body"], [7,8,"Lower Body","Lower Body","Lower Body","Lower Body"],
        [9,9,"Left Arm","Left Arm","Rear Left Leg","Right Arm"], [10,10,"Left Arm","Right Arm","Rear Right Leg","Right Arm"],
        [11,11,"Front Left Leg","Front Left Leg","Rear Left Leg","Front Right Leg"],
        [12,12,"Rear Left Leg","Front Right Leg","Rear Right Leg","Rear Right Leg"]
    ],
    multiHeaded: [
        [1,2,"Left Head(s)","Left Head(s)","Body","Right Head(s)"],
        [3,4,"Left Head(s)","Right Head(s)","Body","Right Head(s)"],
        [5,8,"Body","Body","Body","Body"], [9,9,"Left Arm","Left Arm","Left Arm","Right Arm"],
        [10,10,"Left Arm","Right Arm","Right Arm","Right Arm"], [11,11,"Left Leg","Left Leg","Left Leg","Right Leg"],
        [12,12,"Left Leg","Right Leg","Right Leg","Right Leg"]
    ],
    insectoid: [
        [1,1,"Head","Head","Thorax","Head"], [2,4,"Thorax","Thorax","Abdomen","Thorax"],
        [5,8,"Abdomen","Thorax","Abdomen","Abdomen"],
        [9,10,"Left Front Legs","Left Front Legs","Right Front Legs","Right Front Legs"],
        [11,12,"Left Rear Legs","Right Front Legs","Right Rear Legs","Right Rear Legs"]
    ],
    octopoid: [
        [1,1,"Head","Head","Body","Head"], [2,9,"Body","Body","Body","Body"],
        [10,12,"Tentacles","Tentacles","Tentacles","Tentacles"]
    ]
});

export function canonicalAnatomyLocation(label) {
    const value = String(label || "Body").toLowerCase();
    if (value.includes("head")) return "head";
    if (value.includes("front left leg")) return "leftarm";
    if (value.includes("front right leg")) return "rightarm";
    if (value.includes("left wing") || value.includes("left arm") || value.includes("left front legs") || value.includes("tentacle")) return "leftarm";
    if (value.includes("right wing") || value.includes("right arm") || value.includes("right front legs")) return "rightarm";
    if (value.includes("left") && value.includes("leg")) return "leftleg";
    if (value.includes("right") && value.includes("leg")) return "rightleg";
    return "body";
}

/**
 * Return the distinct named locations an anatomy chart can produce together
 * with the existing armor/ND pool each one uses.
 */
export function anatomyLocationsForPreset(preset = "humanoid") {
    if (!preset || preset === "humanoid") {
        return HUMANOID_ANATOMY_LOCATIONS.map(location => ({ ...location }));
    }

    const special = {
        amorphous: ["Core"],
        swarm: ["Swarm Mass"],
        floater: ["Body"]
    };
    const labels = special[preset]
        || (ANATOMY_TABLES[preset] || []).flatMap(row => row.slice(2));
    const seen = new Set();

    return labels
        .filter(label => {
            const key = String(label || "").trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(label => ({ label, location: canonicalAnatomyLocation(label) }));
}

export function anatomyLocationForRoll(preset, d12, facing = "front", side = 1) {
    if (preset === "humanoid" || !preset) return null;
    if (preset === "amorphous") return { label: "Core", location: "body", column: "Core" };
    if (preset === "swarm") return { label: "Swarm Mass", location: "body", column: "Swarm" };
    if (preset === "floater") return { label: "Body", location: "body", column: "Body" };
    const rows = ANATOMY_TABLES[preset];
    if (!rows) return null;
    const row = rows.find(entry => d12 >= entry[0] && d12 <= entry[1]) ?? rows[rows.length - 1];
    let column = "front";
    if (facing === "back") column = "back";
    else if (facing === "flank" || facing === "backflank") column = side === 1 ? "left" : "right";
    const index = { left:2, front:3, back:4, right:5 }[column];
    const label = row[index];
    return { label, location: canonicalAnatomyLocation(label), column: column.charAt(0).toUpperCase() + column.slice(1) };
}
