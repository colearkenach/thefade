import {
    COMBAT_DAMAGE_TYPES,
    COMBAT_IMMUNITY_DAMAGE_TYPES,
    COMBAT_IMMUNITY_EFFECTS,
    COMBAT_STATUS_IMMUNITIES,
    UNIVERSAL_ABILITY_CATEGORIES,
    VULNERABILITY_SEVERITY_OPTIONS
} from "./constants.js";

const LEGACY_STAT_TYPES = new Set([
    "physique", "finesse", "mind", "presence", "soul",
    "hp", "sanity", "initiative", "sinThreshold"
]);

const LEGACY_DEFENSE_TYPES = new Set([
    "avoid", "grit", "resilience", "passiveDodge", "passiveParry"
]);

export const MECHANICAL_BONUS_TYPE_OPTIONS = {
    stat: "Stat",
    defense: "Defense",
    skill: "Skill",
    attack: "Attack",
    damage: "Damage",
    spell: "Spellcasting",
    resistance: "Resistance",
    immunity: "Immunity",
    absorption: "Absorption",
    vulnerability: "Vulnerability",
    universalAbility: "Universal Ability"
};

export const MECHANICAL_BONUS_STAT_OPTIONS = {
    physique: "Physique (PHY)",
    finesse: "Finesse (FIN)",
    mind: "Mind (MND)",
    presence: "Presence (PRS)",
    soul: "Soul (SOL)",
    hp: "Max HP",
    sanity: "Max Sanity",
    initiative: "Initiative",
    sinThreshold: "Sin Threshold"
};

export const MECHANICAL_BONUS_DEFENSE_OPTIONS = {
    avoid: "Avoid",
    grit: "Grit",
    resilience: "Resilience",
    passiveParry: "Passive Parry",
    passiveDodge: "Passive Dodge"
};

export const MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS = Object.fromEntries(
    COMBAT_DAMAGE_TYPES.map(type => [type.key, type.label])
);

export const MECHANICAL_BONUS_ABSORPTION_OPTIONS = Object.fromEntries(
    COMBAT_IMMUNITY_DAMAGE_TYPES.map(type => [type.key, type.label])
);

export const MECHANICAL_BONUS_IMMUNITY_OPTIONS = {
    ...Object.fromEntries(COMBAT_IMMUNITY_DAMAGE_TYPES.map(type => [`damage:${type.key}`, `Damage — ${type.label}`])),
    ...Object.fromEntries(COMBAT_STATUS_IMMUNITIES.map(status => [`status:${status.key}`, `Status — ${status.label}`])),
    ...Object.fromEntries(COMBAT_IMMUNITY_EFFECTS.map(effect => [`effect:${effect.key}`, `Effect — ${effect.label}`]))
};

export const MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS = Object.fromEntries(
    UNIVERSAL_ABILITY_CATEGORIES.flatMap(category =>
        category.abilities.map(ability => [`${category.key}:${ability.key}`, `${category.label} — ${ability.label}`])
    )
);

export const MECHANICAL_BONUS_VULNERABILITY_SEVERITY_OPTIONS = VULNERABILITY_SEVERITY_OPTIONS;

export const MECHANICAL_BONUS_TARGET_SELECTORS = {
    stat: ".bonus-stat-target",
    defense: ".bonus-defense-target",
    resistance: ".bonus-resistance-target",
    immunity: ".bonus-immunity-target",
    absorption: ".bonus-absorption-target",
    vulnerability: ".bonus-vulnerability-target",
    universalAbility: ".bonus-universal-ability-target"
};

const TEXT_TARGET_TYPES = new Set(["skill", "attack", "damage"]);
const ALWAYS_NUMERIC_TYPES = new Set(["stat", "defense", "skill", "attack", "damage", "spell"]);

function normalizeImmunityTarget(target) {
    const value = String(target || "").trim();
    if (MECHANICAL_BONUS_IMMUNITY_OPTIONS[value]) return value;

    const damage = COMBAT_IMMUNITY_DAMAGE_TYPES.find(type => type.key.toLowerCase() === value.toLowerCase());
    if (damage) return `damage:${damage.key}`;
    const status = COMBAT_STATUS_IMMUNITIES.find(entry => entry.key.toLowerCase() === value.toLowerCase());
    if (status) return `status:${status.key}`;
    const effect = COMBAT_IMMUNITY_EFFECTS.find(entry => entry.key.toLowerCase() === value.toLowerCase());
    if (effect) return `effect:${effect.key}`;
    return "damage:B";
}

/** Convert old flat bonus types into the grouped editor representation. */
export function normalizeMechanicalBonus(bonus = {}) {
    const normalized = { ...bonus };
    const rawType = String(bonus.type || "skill");
    const rawTarget = String(bonus.target || "").trim();

    if (LEGACY_STAT_TYPES.has(rawType)) {
        normalized.type = "stat";
        normalized.target = rawType;
    } else if (LEGACY_DEFENSE_TYPES.has(rawType)) {
        normalized.type = "defense";
        normalized.target = rawType;
    } else {
        normalized.type = rawType;
        normalized.target = rawTarget;
    }

    switch (normalized.type) {
        case "stat":
            if (!MECHANICAL_BONUS_STAT_OPTIONS[normalized.target]) normalized.target = "physique";
            break;
        case "defense":
            if (!MECHANICAL_BONUS_DEFENSE_OPTIONS[normalized.target]) normalized.target = "avoid";
            break;
        case "resistance":
        case "vulnerability":
            if (!MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS[normalized.target]) normalized.target = "B";
            break;
        case "absorption":
            if (!MECHANICAL_BONUS_ABSORPTION_OPTIONS[normalized.target]) normalized.target = "B";
            break;
        case "immunity":
            normalized.target = normalizeImmunityTarget(normalized.target);
            break;
        case "universalAbility":
            if (!MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS[normalized.target]) {
                normalized.target = "defensive:adaptiveMetabolism";
            }
            break;
    }

    normalized.value = Number(bonus.value) || 0;
    normalized.severity = ["minor", "moderate", "severe"].includes(bonus.severity)
        ? bonus.severity
        : "minor";
    return normalized;
}

export function getUniversalAbilityDefinition(target) {
    const [categoryKey, abilityKey] = String(target || "").split(":");
    const category = UNIVERSAL_ABILITY_CATEGORIES.find(entry => entry.key === categoryKey);
    const ability = category?.abilities.find(entry => entry.key === abilityKey);
    return category && ability ? { category, ability } : null;
}

export function getMechanicalBonusAmountConfig(bonus) {
    const normalized = normalizeMechanicalBonus(bonus);
    if (ALWAYS_NUMERIC_TYPES.has(normalized.type)) return { default: 1 };
    if (normalized.type !== "universalAbility") return null;
    return getUniversalAbilityDefinition(normalized.target)?.ability?.amount || null;
}

export function parseMechanicalBonusImmunity(target) {
    const normalized = normalizeImmunityTarget(target);
    const [group, key] = normalized.split(":");
    return { group, key };
}

export function getMechanicalBonusTargetFromRow(row, type) {
    if (TEXT_TARGET_TYPES.has(type)) return String(row.find(".bonus-target-text").val() || "");
    const selector = MECHANICAL_BONUS_TARGET_SELECTORS[type];
    return selector ? String(row.find(selector).val() || "") : "";
}

export function addMechanicalBonusSheetOptions(data) {
    data.mechanicalBonusTypeOptions = MECHANICAL_BONUS_TYPE_OPTIONS;
    data.mechanicalBonusStatOptions = MECHANICAL_BONUS_STAT_OPTIONS;
    data.mechanicalBonusDefenseOptions = MECHANICAL_BONUS_DEFENSE_OPTIONS;
    data.mechanicalBonusDamageTypeOptions = MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS;
    data.mechanicalBonusImmunityOptions = MECHANICAL_BONUS_IMMUNITY_OPTIONS;
    data.mechanicalBonusAbsorptionOptions = MECHANICAL_BONUS_ABSORPTION_OPTIONS;
    data.mechanicalBonusUniversalAbilityOptions = MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS;
    data.mechanicalBonusVulnerabilitySeverityOptions = MECHANICAL_BONUS_VULNERABILITY_SEVERITY_OPTIONS;
    return data;
}

/** Show only the target/value controls used by the row's selected mechanic. */
export function updateMechanicalBonusRow(row, { resetAmount = false } = {}) {
    const type = String(row.find(".bonus-type").val() || "skill");
    row.find(".bonus-target-control").hide();

    if (TEXT_TARGET_TYPES.has(type)) row.find(".bonus-target-text").show();
    const targetSelector = MECHANICAL_BONUS_TARGET_SELECTORS[type];
    if (targetSelector) row.find(targetSelector).show();

    const severity = row.find(".bonus-vulnerability-severity");
    severity.toggle(type === "vulnerability");

    const target = getMechanicalBonusTargetFromRow(row, type);
    const amount = getMechanicalBonusAmountConfig({ type, target });
    const valueInput = row.find(".bonus-value");
    valueInput.toggle(!!amount);
    valueInput.removeAttr("min max step title");
    if (amount) {
        if (amount.min !== undefined) valueInput.attr("min", amount.min);
        if (amount.max !== undefined) valueInput.attr("max", amount.max);
        if (amount.step !== undefined) valueInput.attr("step", amount.step);
        if (amount.label) valueInput.attr("title", amount.label).attr("aria-label", amount.label);
        const current = Number(valueInput.val());
        if (resetAmount || !Number.isFinite(current) || (amount.min !== undefined && current < amount.min)) {
            valueInput.val(amount.default ?? 1);
        }
    }
}

/** Read and normalize one editor row into the persisted bonus shape. */
export function readMechanicalBonusRow(row) {
    const type = String(row.find(".bonus-type").val() || "skill");
    const target = getMechanicalBonusTargetFromRow(row, type);
    const amount = getMechanicalBonusAmountConfig({ type, target });
    return normalizeMechanicalBonus({
        id: row.attr("data-bonus-id") || row.data("bonus-id"),
        type,
        target,
        value: amount ? (Number(row.find(".bonus-value").val()) || amount.default || 0) : 0,
        severity: type === "vulnerability"
            ? (row.find(".bonus-vulnerability-severity").val() || "minor")
            : undefined
    });
}

export function mechanicalBonusSummary(bonus) {
    const normalized = normalizeMechanicalBonus(bonus);
    const amount = getMechanicalBonusAmountConfig(normalized);
    const signedValue = `${normalized.value >= 0 ? "+" : ""}${normalized.value}`;
    const targetLabels = {
        stat: MECHANICAL_BONUS_STAT_OPTIONS,
        defense: MECHANICAL_BONUS_DEFENSE_OPTIONS,
        resistance: MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS,
        immunity: MECHANICAL_BONUS_IMMUNITY_OPTIONS,
        absorption: MECHANICAL_BONUS_ABSORPTION_OPTIONS,
        vulnerability: MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS,
        universalAbility: MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS
    };
    const typeLabel = MECHANICAL_BONUS_TYPE_OPTIONS[normalized.type] || normalized.type || "Bonus";
    const targetLabel = targetLabels[normalized.type]?.[normalized.target] || normalized.target;

    if (normalized.type === "vulnerability") {
        return `${typeLabel}: ${targetLabel || "Unknown"} (${VULNERABILITY_SEVERITY_OPTIONS[normalized.severity] || normalized.severity})`;
    }
    if (["resistance", "immunity", "absorption"].includes(normalized.type)) {
        return `${typeLabel}: ${targetLabel || "Unknown"}`;
    }
    if (normalized.type === "universalAbility") {
        return amount
            ? `${targetLabel || typeLabel}: ${normalized.value || amount.default}${amount.label ? ` ${amount.label}` : ""}`
            : (targetLabel || typeLabel);
    }
    const target = targetLabel || normalized.target;
    return `${target || typeLabel}: ${signedValue}`;
}
