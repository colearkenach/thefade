import { DAMAGE_TYPE_LABELS } from "./constants.js";

function quality(id, label, description, mechanics = {}) {
    return { id, label, description, mechanics };
}

export const WEAPON_QUALITIES = [
    quality("accurate", "Accurate", "You can't Dodge this weapon; this negates Passive Dodge.", { negatesPassiveDodge: true }),
    quality("antiCavalry", "Anti-Cavalry", "Deals 6 additional damage against mounted foes or a foe's mount.", { mountedDamage: 6 }),
    quality("agile", "Agile", "Add +½ FIN to damage. Light weapons use FIN for attack rolls instead of PHY.", { damageAttribute: "finesse", lightAttackAttribute: "finesse" }),
    quality("agilePlus", "Agile+", "Add full Finesse to damage instead of half.", { damageAttribute: "fullFinesse", lightAttackAttribute: "finesse" }),
    quality("aether", "Æther", "Use Soul for attack rolls and add half Soul to damage.", { damageAttribute: "soul", attackAttribute: "soul" }),
    quality("auto", "Auto", "Make a bonus ranged attack as a Minor Action at -2D to hit."),
    quality("balanced", "Balanced", "Imposes no penalties for two-weapon fighting with it."),
    quality("brace", "Brace", "Spend a Major Action to Brace. Until your next turn, enemies entering reach provoke a free attack; attacks after the first cost a Reaction."),
    quality("breach", "Breach", "Deals 5 additional damage to inanimate objects and walls."),
    quality("brutish", "Brutish", "Add half Physique to damage.", { damageAttribute: "physique" }),
    quality("brutishPlus", "Brutish+", "Add full Physique to damage instead of half.", { damageAttribute: "fullPhysique" }),
    quality("bulky", "Bulky", "Cannot be hidden. All Two-Handed weapons possess this quality by default."),
    quality("bursting", "Bursting", "Deals half damage to all adjacent hexes as well."),
    quality("choking", "Choking", "Deals damage automatically after a successful grapple, bypassing armor. A foe brought to 0 HP begins suffocating."),
    quality("composite", "Composite", "Add half Physique or Finesse to damage, whichever is higher. Bow only.", { damageAttribute: "higherPhysiqueFinesse" }),
    quality("concealable", "Concealable", "Gain +2D Trickery to hide this weapon. All Light weapons possess this quality by default."),
    quality("cruel", "Cruel", "Deals 3 additional damage against a target suffering from Pain, Fear, or Fatigue.", { afflictedDamage: 3 }),
    quality("cruelPlus", "Cruel+", "Deals 6 additional damage against a target suffering from Pain, Fear, or Fatigue instead of 3.", { afflictedDamage: 6 }),
    quality("deadly", "Deadly", "Deals 4 additional damage on each critical hit, in addition to critical damage.", { criticalDamage: 4 }),
    quality("deadlyPlus", "Deadly+", "Deals 8 additional damage on each critical hit instead of 4.", { criticalDamage: 8 }),
    quality("disarm", "Disarm", "On a successful hit, deal half damage to disarm the foe."),
    quality("double", "Double", "Can be used for two-weapon fighting; the second attack deals half damage."),
    quality("dualTrigger", "Dual-Trigger", "Squeeze both firearm triggers at once to deal 1.5× damage, expending all ammunition.", { damageMultiplier: 1.5 }),
    quality("fatiguing", "Fatiguing", "Inflicts Trivial Fatigue. Spend 2 successes to increase its duration by 1 round."),
    quality("feinting", "Feinting", "Gain +1D on Feint attempts made with this weapon.", { feintDice: 1 }),
    quality("fencing", "Fencing", "Against opponents without a Fencing weapon, reduce their Passive Parry by 1, minimum 0.", { reducePassiveParry: 1 }),
    quality("formation", "Formation", "While adjacent to an ally also wielding a Formation weapon, gain +1 Passive Parry.", { formationPassiveParry: 1 }),
    quality("fragile", "Fragile", "Loses 1 Integrity when striking non-leather armor."),
    quality("grappling", "Grappling", "Can initiate grapples at its listed reach without being adjacent."),
    quality("hook", "Hook", "On a successful hit, spend 2 successes to pull the target 1 hex closer."),
    quality("impaling", "Impaling", "After moving at least half your movement before attacking, gain +2D to the attack."),
    quality("injection", "Injection", "Injury-based poisons used with this weapon gain +1D to their attack roll."),
    quality("jousting", "Jousting", "While mounted, treat the weapon's Critical as 2."),
    quality("loud", "Loud", "Increase Hearing DT by 5 within 12 hexes, except checks to hear this weapon gain +5D."),
    quality("parrying", "Parrying", "Increase Passive Parry by 1 while using this weapon.", { passiveParry: 1 }),
    quality("parryingPlus", "Parrying+", "Increase Passive Parry by 2 while using this weapon.", { passiveParry: 2 }),
    quality("pounding", "Pounding", "Deals 4 additional damage against armored foes, but not Natural Deflection."),
    quality("powerful", "Powerful", "Can't be Parried; this negates Passive Parry.", { negatesPassiveParry: true }),
    quality("puncture", "Puncture", "Reduce Critical by 1 against armored foes. On a critical hit, damage only armor, not HP."),
    quality("pushing", "Pushing", "If the weapon deals HP damage, push the opponent back 1 hex."),
    quality("reach", "Reach", "Increase melee reach by 1, typically allowing attacks out to 2 hexes."),
    quality("readying", "Readying", "Gain +1D to attacks made as a Reaction, including Ripostes."),
    quality("returning", "Returning", "Returns to your hand after throwing it. Thrown weapons only."),
    quality("ripping", "Ripping", "Inflicts Trivial Bleed. Spend 2 successes to increase its duration by 1 round."),
    quality("savage", "Savage", "Always deals at least 1 HP damage, even when armor would absorb all damage.", { minimumHpDamage: 1 }),
    quality("savagePlus", "Savage+", "Always deals at least 3 HP damage, even when armor would absorb all damage.", { minimumHpDamage: 3 }),
    quality("scatter", "Scatter", "Attacks in a cone out to its range and deals half damage beyond half range."),
    quality("semi", "Semi", "Can be fired continuously until it needs to be reloaded."),
    quality("shieldBreaker", "Shield Breaker", "Deals twice its damage to Shields."),
    quality("shielding", "Shielding", "Can be used as a Shield; its Integrity becomes its Armored Protection."),
    quality("siege", "Siege", "Requires a Major Action and both Minor Actions to attack with and cannot be used while mounted."),
    quality("single", "Single", "Can fire only once before it must be cocked as a Minor Action or reloaded."),
    quality("sting", "Sting", "If one attack deals half the opponent's HP, they take -2D to all checks for 1 day."),
    quality("subduing", "Subduing", "Can be used nonlethally without penalty."),
    quality("sunder", "Sunder", "Deals 5 additional damage to Integrity and Armored Protection."),
    quality("switch", "Switch", "Has a Two-Handed Reach mode and a One-Handed Balanced mode; switching is a Minor Action."),
    quality("targeting", "Targeting", "Ranged attacks with this weapon don't provoke attacks when used in melee."),
    quality("thrown", "Thrown", "Can be thrown without penalty out to the listed range."),
    quality("trigger", "Trigger", "Has two modes with different weapon types and qualities; switching is a Minor Action."),
    quality("trip", "Trip", "On a successful hit, deal half damage to trip the foe."),
    quality("tripod", "Tripod", "Must be braced on a wall or tripod; otherwise the wielder falls prone after every attack."),
    quality("unwieldy", "Unwieldy", "Can't Parry with this weapon; Passive Parry is 0 while using it.", { passiveParryOverride: 0 }),
    quality("versatile", "Versatile", "Can alternatively use the weapon skill listed in parentheses.")
];

const QUALITY_BY_ID = new Map(WEAPON_QUALITIES.map(entry => [entry.id, entry]));
const QUALITY_BY_LABEL = new Map(WEAPON_QUALITIES.map(entry => [entry.label.toLowerCase(), entry]));

export const WEAPON_DAMAGE_ATTRIBUTE_OPTIONS = {
    none: "N/A",
    physique: "½ PHY",
    fullPhysique: "PHY",
    finesse: "½ FIN",
    fullFinesse: "FIN",
    mind: "½ MND",
    fullMind: "MND",
    presence: "½ PRS",
    fullPresence: "PRS",
    soul: "½ SOL",
    fullSoul: "SOL",
    higherPhysiqueFinesse: "½ higher PHY / FIN"
};

export function isNaturalWeapon(system) {
    return ["natural", "natural weapon"].includes(String(system?.handedness || "").trim().toLowerCase());
}

function explicitQualityIds(system) {
    return [...new Set((Array.isArray(system?.qualityIds) ? system.qualityIds : []).filter(id => QUALITY_BY_ID.has(id)))];
}

function customQualityTokens(system) {
    return String(system?.qualities || "")
        .split(/[;,\n]+/)
        .map(value => value.trim())
        .filter(Boolean);
}

function legacyQualityIds(system) {
    return customQualityTokens(system)
        .map(label => QUALITY_BY_LABEL.get(label.toLowerCase())?.id)
        .filter(Boolean);
}

export function getEffectiveWeaponQualityIds(system) {
    const ids = new Set([...explicitQualityIds(system), ...legacyQualityIds(system)]);
    if (system?.handedness === "Two-Handed") ids.add("bulky");
    if (system?.handedness === "Light") ids.add("concealable");
    return [...ids];
}

export function hasWeaponQuality(system, id) {
    const ids = new Set(getEffectiveWeaponQualityIds(system));
    if (ids.has(id)) return true;
    const upgraded = {
        agile: "agilePlus",
        brutish: "brutishPlus",
        deadly: "deadlyPlus",
        parrying: "parryingPlus",
        savage: "savagePlus",
        cruel: "cruelPlus"
    };
    return upgraded[id] ? ids.has(upgraded[id]) : false;
}

export function buildWeaponQualitySelector(system) {
    const explicit = new Set(explicitQualityIds(system));
    const automatic = new Set();
    if (system?.handedness === "Two-Handed" && !explicit.has("bulky")) automatic.add("bulky");
    if (system?.handedness === "Light" && !explicit.has("concealable")) automatic.add("concealable");
    const selected = WEAPON_QUALITIES
        .filter(entry => explicit.has(entry.id) || automatic.has(entry.id))
        .map(entry => ({ ...entry, automatic: automatic.has(entry.id) }));
    const unavailable = new Set([...explicit, ...automatic]);
    const available = WEAPON_QUALITIES.filter(entry => !unavailable.has(entry.id));
    return { selected, available };
}

export function weaponQualityDisplay(system) {
    const effective = new Set(getEffectiveWeaponQualityIds(system));
    const labels = WEAPON_QUALITIES.filter(entry => effective.has(entry.id)).map(entry => entry.label);
    const custom = customQualityTokens(system).filter(label => !QUALITY_BY_LABEL.has(label.toLowerCase()));
    return [...labels, ...custom].join(", ");
}

export function getWeaponQualityRules(system) {
    const effective = new Set(getEffectiveWeaponQualityIds(system));
    return WEAPON_QUALITIES.filter(entry => effective.has(entry.id));
}

export function getWeaponQualityRule(id) {
    return QUALITY_BY_ID.get(id) || null;
}

export function normalizeDamageAttribute(value) {
    const key = String(value || "none");
    if (key === "N/A") return "none";
    return WEAPON_DAMAGE_ATTRIBUTE_OPTIONS[key] ? key : "none";
}

export function getQualityDamageAttributeOverride(system) {
    const order = ["aether", "agilePlus", "brutishPlus", "composite", "agile", "brutish"];
    for (const id of order) {
        if (!hasWeaponQuality(system, id)) continue;
        const rule = QUALITY_BY_ID.get(id);
        if (rule?.mechanics?.damageAttribute) {
            return { key: rule.mechanics.damageAttribute, source: rule.label };
        }
    }
    return null;
}

export function resolveWeaponDamageAttribute(system) {
    return getQualityDamageAttributeOverride(system) || {
        key: normalizeDamageAttribute(system?.attribute),
        source: ""
    };
}

export function getWeaponAttackAttributeOverride(system) {
    if (hasWeaponQuality(system, "aether")) return { key: "soul", source: "Æther" };
    if (system?.handedness === "Light" && hasWeaponQuality(system, "agile")) {
        return { key: "finesse", source: hasWeaponQuality(system, "agilePlus") ? "Agile+" : "Agile" };
    }
    return null;
}

function attributeTotal(actor, key) {
    const value = actor?.system?.attributes?.[key];
    return Number(value?.total ?? value?.value ?? 0) || 0;
}

export function calculateWeaponDamageAttributeBonus(actor, attributeKey) {
    const key = normalizeDamageAttribute(attributeKey);
    if (key === "none") return 0;
    if (key === "higherPhysiqueFinesse") {
        return Math.floor(Math.max(attributeTotal(actor, "physique"), attributeTotal(actor, "finesse")) / 2);
    }
    const full = key.startsWith("full");
    const raw = full ? `${key.charAt(4).toLowerCase()}${key.slice(5)}` : key;
    const total = attributeTotal(actor, raw);
    return full ? total : Math.floor(total / 2);
}

export function getWeaponDamageComponents(system) {
    const stored = Array.isArray(system?.damageComponents) ? system.damageComponents : [];
    const components = stored.map((entry, index) => ({
        id: entry.id || `component-${index}`,
        amount: Number(entry.amount) || 0,
        type: entry.type || "Ut"
    }));
    if (!components.length && (Number(system?.damage) || 0) > 0) {
        components.push({ id: "legacy", amount: Number(system.damage) || 0, type: system.damageType || "Ut" });
    }
    return components;
}

export function formatWeaponDamageComponents(system, { labels = false } = {}) {
    const components = getWeaponDamageComponents(system).filter(entry => entry.amount !== 0);
    if (!components.length) return "—";
    return components.map(entry => `${entry.amount} ${labels ? (DAMAGE_TYPE_LABELS[entry.type] || entry.type) : entry.type}`).join(" + ");
}

function targetHasCruelCondition(targetActor) {
    const conditions = targetActor?.system?.conditions || {};
    return ["pain", "fear", "fatigue"].some(key => conditions[key]?.active === true);
}

export function getWeaponConditionalDamageAdjustments(system, targetActor, context = {}) {
    let bonus = 0;
    let multiplier = 1;
    const notes = [];

    if (context.targetMounted && hasWeaponQuality(system, "antiCavalry")) {
        bonus += 6;
        notes.push("Anti-Cavalry: +6 damage against a mounted target or mount");
    }
    if (targetHasCruelCondition(targetActor)) {
        if (hasWeaponQuality(system, "cruelPlus")) {
            bonus += 6;
            notes.push("Cruel+: +6 damage against a target suffering Pain, Fear, or Fatigue");
        } else if (hasWeaponQuality(system, "cruel")) {
            bonus += 3;
            notes.push("Cruel: +3 damage against a target suffering Pain, Fear, or Fatigue");
        }
    }
    if (context.dualTrigger && hasWeaponQuality(system, "dualTrigger")) {
        multiplier = 1.5;
        notes.push("Dual-Trigger: 1.5× damage; all ammunition is expended");
    }

    return { bonus, multiplier, notes };
}

export function buildWeaponDamageProfile(actor, system, context = {}) {
    const components = getWeaponDamageComponents(system).filter(entry => entry.amount !== 0);
    if (!components.length) components.push({ id: "untyped", amount: 0, type: system?.damageType || "Ut" });

    const resolvedAttribute = resolveWeaponDamageAttribute(system);
    const attributeBonus = calculateWeaponDamageAttributeBonus(actor, resolvedAttribute.key);
    const strengthening = isNaturalWeapon(system) ? 0 : (Number(system?.damageIncrease) || 0);
    const skillKey = String(system?.skill || "").toLowerCase();
    const equipped = actor?.system?.equippedBonuses;
    const equippedBonus = equipped
        ? (Number(equipped.damage) || 0) + (Number(equipped[`damage_${skillKey}`]) || 0)
        : 0;
    components[0].amount += attributeBonus + strengthening + equippedBonus;

    const conditional = getWeaponConditionalDamageAdjustments(system, context.targetActor, context);
    components[0].amount += conditional.bonus;
    if (conditional.multiplier !== 1) {
        for (const component of components) component.amount = Math.floor(component.amount * conditional.multiplier);
    }

    const rendered = components.map(entry => ({
        ...entry,
        label: DAMAGE_TYPE_LABELS[entry.type] || entry.type || "Untyped"
    }));
    return {
        components: rendered,
        total: rendered.reduce((sum, entry) => sum + entry.amount, 0),
        primaryType: rendered[0]?.type || "Ut",
        display: rendered.map(entry => `${entry.amount} ${entry.label}`).join(" + "),
        attributeKey: resolvedAttribute.key,
        attributeSource: resolvedAttribute.source,
        attributeBonus,
        strengthening,
        equippedBonus,
        conditionalBonus: conditional.bonus,
        conditionalMultiplier: conditional.multiplier,
        conditionalNotes: conditional.notes
    };
}

export function getWeaponCriticalDamageBonus(system) {
    if (hasWeaponQuality(system, "deadlyPlus")) return 8;
    if (hasWeaponQuality(system, "deadly")) return 4;
    return 0;
}

export function getWeaponMinimumHpDamage(system) {
    if (hasWeaponQuality(system, "savagePlus")) return 3;
    if (hasWeaponQuality(system, "savage")) return 1;
    return 0;
}
