// Damage application pipeline for The Fade - Abyss.
//
// Central cascade: incoming damage is absorbed first by armor (Natural
// Deflection + Armored Protection at the struck location), then any excess
// flows to the central HP pool. Stances and damage-type rules can modify
// the cascade (Brace for Impact stops HP transfer or halves it).
//
// Rules source: Core Rulebook damage & armor chapter, plus Brace for Impact
// (stances page). See AUDIT.md for traceability of P1 #4/#5/#6/#7/#8.

import { BODY_PARTS, DAMAGE_TYPE_LABELS } from './constants.js';
import { locationLabel } from './hit-location.js';
import { armorProtectionPools } from './protection.js';

/**
 * Body locations valid for hit-location selection.
 */
export const DAMAGE_LOCATIONS = [...BODY_PARTS];

/**
 * Damage-type codes that cause Bleed (weapons list them in `damageType`).
 * S = slashing, P = piercing, BP/SP/SoP/BoP compound types include them.
 */
const BLEED_TYPES = new Set(["S", "P", "SP", "SoP", "BP", "BoP"]);

/**
 * Damage-type codes that ignore armor and Natural Deflection entirely,
 * routing the full amount straight to HP.
 */
export const ARMOR_BYPASS_TYPES = new Set(["So", "Psi", "Ex"]);

/**
 * Build a presence-set + per-type booleans for a primary damage type plus
 * any per-component types (weapons can carry multiple typed components).
 * Used by chat templates to surface damage-type bonus options whenever a
 * type is present, not just when it's the primary.
 */
export function damageTypeFlags(primary, components) {
    const present = new Set();
    if (Array.isArray(components)) {
        for (const c of components) if (c?.type) present.add(c.type);
    }
    if (primary) present.add(primary);
    return {
        isFire: present.has("F"),
        isCold: present.has("C"),
        isAcid: present.has("A"),
        isElectricity: present.has("E"),
        isSonic: present.has("So"),
        isSmiting: present.has("Sm"),
        isExpel: present.has("Ex"),
        isPsychokinetic: present.has("Psi"),
        isCorruption: present.has("Co")
    };
}

/**
 * Split protection absorption between Natural Deflection and equipped armor.
 * Stacking protection cascades from ND into armor. Non-stacking protection
 * commits the whole attack to the single highest current pool; any excess
 * goes to HP instead of spilling into another protection pool.
 *
 * Returns { absorbed, updates: {actorUpdates, itemUpdates} }.
 * Does NOT persist — caller merges updates into a batch.
 */
function computeArmorAbsorption(actor, location, damage) {
    let remaining = damage;
    let absorbed = 0;
    const actorUpdates = {};
    const itemUpdateMap = new Map();

    const nd = actor.system.naturalDeflection?.[location];
    const ndCurrent = Math.max(0, Number(nd?.current) || 0);
    const armorPools = armorProtectionPools(actor, location)
        .filter(pool => pool.current > 0);

    const reduceNatural = () => {
        if (remaining <= 0 || ndCurrent <= 0) return;
        const take = Math.min(ndCurrent, remaining);
        actorUpdates[`system.naturalDeflection.${location}.current`] = ndCurrent - take;
        remaining -= take;
        absorbed += take;
    };

    const reduceArmor = pool => {
        if (remaining <= 0 || !pool || pool.current <= 0) return;
        const take = Math.min(pool.current, remaining);
        const update = itemUpdateMap.get(pool.itemId) || { _id: pool.itemId };
        update[pool.property] = pool.current - take;
        itemUpdateMap.set(pool.itemId, update);
        remaining -= take;
        absorbed += take;
    };

    if (nd?.stacks === true) {
        // ND always takes precedence. Once it is exhausted, armor pieces act
        // as one cascading pool, consuming the lowest remaining piece first.
        reduceNatural();
        armorPools
            .sort((a, b) => (a.current - b.current) || a.key.localeCompare(b.key))
            .forEach(reduceArmor);
    } else {
        // One protection pool owns this attack. Ties favor ND; overflow goes
        // directly to HP and other pools remain available for later attacks.
        const highestArmor = armorPools
            .sort((a, b) => (b.current - a.current) || a.key.localeCompare(b.key))[0];
        if (ndCurrent > 0 && (!highestArmor || ndCurrent >= highestArmor.current)) {
            reduceNatural();
        } else {
            reduceArmor(highestArmor);
        }
    }

    return {
        absorbed,
        carryToHp: remaining,
        actorUpdates,
        itemUpdates: Array.from(itemUpdateMap.values())
    };
}

/** Vulnerability damage multipliers (Core pp. 40-44). */
const VULNERABILITY_MULTIPLIERS = { minor: 1.5, moderate: 2, severe: 3 };

/**
 * Main entrypoint.
 *
 * @param {Actor} actor - The target taking damage
 * @param {Object} opts
 * @param {number} opts.amount - Raw damage dealt
 * @param {string} [opts.type] - Damage type code (S/P/B/etc.)
 * @param {string} [opts.location] - Body location hit (default "body")
 * @param {string} [opts.sourceName] - For chat log; e.g. attacker name
 * @param {boolean} [opts.applyBleed=true] - Whether S/P damage auto-applies Bleed
 * @param {boolean} [opts.calledShot=false] - True when the attack was declared
 *   as a called shot. Only called shots apply location-tied status effects
 *   (e.g. Bleed on S/P). Random and Default hits deal damage only.
 * @param {number} [opts.minimumHpDamage=0] - Minimum HP damage after armor for
 *   qualities such as Savage. Immunity and Brace for Impact still win.
 * @returns {Promise<{absorbed, hpBefore, hpAfter, hpDamage, bleedApplied,
 *                   knockedOut, summary}>}
 */
export async function applyDamage(actor, opts) {
    if (!actor) throw new Error("applyDamage: actor is required");

    const amount = Math.max(0, Math.floor(Number(opts?.amount) || 0));
    const type = opts?.type || "Ut";
    const location = DAMAGE_LOCATIONS.includes(opts?.location) ? opts.location : "body";
    const sourceName = opts?.sourceName || "damage";
    const applyBleed = opts?.applyBleed !== false;
    const calledShot = !!opts?.calledShot;

    // Typed traits apply before armor: absorption heals, immunity negates,
    // resistance halves, vulnerability multiplies. Untyped and Corruption
    // damage can't be resisted.
    const traits = actor.system.combatTraits || {};
    const resistible = !["Ut", "Co"].includes(type);
    const damageAbsorbed = resistible && traits.absorption?.[type] === true;
    const damageImmune = resistible && !damageAbsorbed && traits.immunities?.damageTypes?.[type] === true;
    const damageResistant = resistible && !damageImmune && !damageAbsorbed && traits.resistances?.[type] === true;
    const vulnerability = !damageImmune && !damageAbsorbed && traits.vulnerabilities?.[type] === true
        ? (traits.vulnerabilitySeverity?.[type] || "minor") : null;
    let mitigatedAmount = damageImmune || damageAbsorbed ? 0 : damageResistant ? Math.floor(amount / 2) : amount;
    if (vulnerability) mitigatedAmount = Math.floor(mitigatedAmount * (VULNERABILITY_MULTIPLIERS[vulnerability] || 1));

    const hpBefore = Number(actor.system.hp?.value ?? 0);
    const hpMax = Number(actor.system.hp?.max ?? 1);
    const mitigation = actor.system.damageMitigation || { noExcessToHp: false, halveHp: false };

    // 1) Armor/ND absorbs the front of the damage — unless the type bypasses
    //    armor (Sonic, Psychokinetic, Expel route straight to HP).
    const bypassArmor = opts?.bypassArmor === true || ARMOR_BYPASS_TYPES.has(type);
    const armor = bypassArmor
        ? { absorbed: 0, carryToHp: mitigatedAmount, actorUpdates: {}, itemUpdates: [] }
        : computeArmorAbsorption(actor, location, mitigatedAmount);

    // 2) Brace for Impact: excess past armor never reaches HP.
    let toHp = armor.carryToHp;
    const minimumHpDamage = Math.max(0, Math.floor(Number(opts?.minimumHpDamage) || 0));
    if (!damageImmune && amount > 0 && minimumHpDamage > 0) {
        toHp = Math.max(toHp, minimumHpDamage);
    }
    if (mitigation.noExcessToHp) toHp = 0;

    // 3) Halve HP-bound damage (still Brace), min 1 if any got through.
    if (mitigation.halveHp && toHp > 0) toHp = Math.max(1, Math.floor(toHp / 2));

    // 4) Apply to HP (absorption heals by the full amount, up to maximum).
    const healed = damageAbsorbed ? Math.min(amount, Math.max(0, hpMax - hpBefore)) : 0;
    const hpAfter = damageAbsorbed ? hpBefore + healed : hpBefore - toHp;
    const hpUpdates = {};
    if (hpAfter !== hpBefore) hpUpdates["system.hp.value"] = hpAfter;
    const knockedOut = hpBefore > 0 && hpAfter <= 0;

    // 5) Commit protection and HP in one batch.
    const actorUpdates = { ...armor.actorUpdates, ...hpUpdates };
    if (Object.keys(actorUpdates).length) await actor.update(actorUpdates);
    if (armor.itemUpdates.length) await actor.updateEmbeddedDocuments("Item", armor.itemUpdates);

    // 6) Bleed on slashing/piercing that reached HP: only on called shots;
    // random and default hits deal damage without location-tied effects.
    let bleedApplied = false;
    if (applyBleed && calledShot && toHp > 0 && BLEED_TYPES.has(type) && !actor.system.conditions?.bleed?.active) {
        bleedApplied = !!(await actor.setCondition?.("bleed", { active: true, intensity: "trivial" }));
    }

    // 7) Dropping to 0 HP leaves the target unconscious: helpless and flat-footed.
    if (knockedOut) {
        await actor.setCondition?.("sleep", { active: true });
        await actor.setCondition?.("flatFooted", { active: true });
    }

    const summary = buildSummary({
        target: actor.name, sourceName, location, amount, type,
        mitigatedAmount, damageImmune, damageResistant, damageAbsorbed, vulnerability, healed,
        absorbed: armor.absorbed, toHp, hpBefore, hpAfter,
        mitigation, bleedApplied, knockedOut, bypassArmor
    });

    return {
        absorbed: armor.absorbed,
        hpBefore,
        hpAfter,
        hpDamage: toHp,
        bleedApplied,
        knockedOut,
        damageImmune,
        damageResistant,
        mitigatedAmount,
        summary
    };
}

/**
 * HTML snippet summarizing a damage application, for chat reporting.
 */
function buildSummary(o) {
    const esc = foundry.utils.escapeHTML;
    const f = (key, data = {}) => game.i18n.format(`THEFADE.Damage.${key}`, data);
    const type = DAMAGE_TYPE_LABELS[o.type] ?? o.type;
    const parts = [f("takes", {
        target: `<strong>${esc(o.target)}</strong>`, amount: `<strong>${o.amount}</strong>`, type,
        location: locationLabel(o.location), source: esc(o.sourceName)
    })];
    if (o.damageAbsorbed) parts.push(`<em>${f("absorbedHeal", { type, healed: o.healed })}</em>`);
    else if (o.vulnerability) parts.push(`<em>${f("vulnerable", { severity: o.vulnerability, amount: o.mitigatedAmount })}</em>`);
    else if (o.damageImmune) parts.push(`<em>${f("immune", { type })}</em>`);
    else if (o.damageResistant) parts.push(`<em>${f("resisted", { amount: o.mitigatedAmount })}</em>`);
    if (o.bypassArmor && o.mitigatedAmount > 0) parts.push(`<em>${f("bypassesArmor", { type })}</em>`);
    if (o.absorbed > 0) parts.push(f("armorAbsorbed", { amount: o.absorbed }));
    if (o.mitigation.noExcessToHp && o.mitigatedAmount > o.absorbed) parts.push(`<em>${f("braceBlocked")}</em>`);
    else if (o.mitigation.halveHp && o.toHp > 0) parts.push(`<em>${f("braceHalved")}</em>`);
    if (o.damageAbsorbed) parts.push(f("hpChange", { before: o.hpBefore, after: o.hpAfter }));
    else if (o.toHp > 0) parts.push(f("hpLoss", { before: o.hpBefore, after: o.hpAfter, amount: o.toHp }));
    else parts.push(f("noHp"));
    if (o.bleedApplied) parts.push(`<strong>${f("bleed")}</strong>`);
    if (o.knockedOut) parts.push(`<strong>${f("down", { target: esc(o.target) })}</strong>`);
    return `<div class="thefade-damage-summary">${parts.join(" ")}</div>`;
}

