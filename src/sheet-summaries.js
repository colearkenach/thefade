import {
    COMBAT_DAMAGE_TYPES, COMBAT_IMMUNITY_DAMAGE_TYPES, COMBAT_STATUS_IMMUNITIES,
    COMBAT_IMMUNITY_EFFECTS, UNIVERSAL_ABILITY_CATEGORIES, VULNERABILITY_SEVERITY_OPTIONS
} from "./constants.js";

// Read prepared traits so grants from equipment and species appear alongside
// manual traits. These summaries never write to the actor or replace editors.
export function buildCombatTraitSummary(system) {
    const traits = system.combatTraits || {};
    const groups = [];
    const abilities = [];
    for (const category of UNIVERSAL_ABILITY_CATEGORIES) {
        for (const ability of category.abilities) {
            if (!traits.abilities?.[category.key]?.[ability.key]) continue;
            const value = ability.key === "spellResistance"
                ? `${traits.spellResistancePercent ?? 50}%`
                : ability.amount ? traits.abilityValues?.[category.key]?.[ability.key] ?? ability.amount.min ?? 0 : "";
            abilities.push({ label: `${ability.label}${value !== "" ? ` (${value})` : ""}`, description: ability.description });
        }
    }
    groups.push({ label: "Abilities", entries: abilities });
    for (const [label, options, active] of [
        ["Resistant", COMBAT_DAMAGE_TYPES, traits.resistances],
        ["Immune", COMBAT_IMMUNITY_DAMAGE_TYPES, traits.immunities?.damageTypes],
        ["Status immunity", COMBAT_STATUS_IMMUNITIES, traits.immunities?.statuses],
        ["Effect immunity", COMBAT_IMMUNITY_EFFECTS, traits.immunities?.effects],
        ["Absorbs", COMBAT_IMMUNITY_DAMAGE_TYPES, traits.absorption]
    ]) {
        const selected = options.filter(option => active?.[option.key]);
        groups.push({ label, entries: selected.map(option => ({ label: option.label })) });
    }
    groups.push({ label: "Custom immunity", entries: (traits.itemGrantedCustomImmunities || []).map(entry => ({ label: entry.label, description: `Granted by ${entry.source}` })) });
    groups.push({ label: "Vulnerable", entries: COMBAT_DAMAGE_TYPES.filter(type => traits.vulnerabilities?.[type.key]).map(type => ({
        label: `${type.label} — ${VULNERABILITY_SEVERITY_OPTIONS[traits.vulnerabilitySeverity?.[type.key] || "minor"] || "Minor (x1.5)"}`
    })) });
    return groups.filter(group => group.entries.length);
}

export function buildInjurySummary(system) {
    const limbs = { head: "Head", body: "Body", leftArm: "Left arm", rightArm: "Right arm", leftLeg: "Left leg", rightLeg: "Right leg" };
    return [
        ...Object.entries(limbs).filter(([key]) => system.injuries?.[key]?.severed).map(([, label]) => `${label} severed`),
        ...(system.mentalDisorders || []).map(disorder => disorder.name || disorder.type)
    ];
}
