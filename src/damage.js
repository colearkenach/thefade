// Damage application pipeline for The Fade - Abyss.
//
// Central cascade: incoming damage is absorbed first by armor (Natural
// Deflection + Armored Protection at the struck location), then any excess
// flows to the central HP pool. Stances and damage-type rules can modify
// the cascade (Brace for Impact stops HP transfer or halves it).
//
// Rules source: Core Rulebook damage & armor chapter, plus Brace for Impact
// (stances page). See AUDIT.md for traceability of P1 #4/#5/#6/#7/#8.

import { BODY_PARTS } from './constants.js';
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

/**
 * Apply HP-threshold conditions: at 0 HP, an actor is rendered helpless
 * and flat-footed (Core Rulebook HP states). Returns a partial update
 * object to merge.
 */
function computeHpStateConditions(newHp, maxHp) {
    const updates = {};
    if (newHp <= 0) {
        // Unconscious at 0; Dying in negative band; both are flat-footed/helpless.
        updates["system.conditions.flatFooted.active"] = true;
        updates["system.conditions.sleep.active"] = true; // "sleep" models unconscious/helpless
    }
    return updates;
}

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

    // Typed resistance and immunity apply before armor. Resistance halves
    // incoming damage; immunity negates it completely.
    const traits = actor.system.combatTraits || {};
    const damageImmune = traits.immunities?.damageTypes?.[type] === true;
    const damageResistant = !damageImmune && traits.resistances?.[type] === true;
    const mitigatedAmount = damageImmune
        ? 0
        : damageResistant ? Math.floor(amount / 2) : amount;

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

    // 4) Apply to HP.
    const hpAfter = hpBefore - toHp;
    const hpUpdates = {};
    if (toHp !== 0) hpUpdates["system.hp.value"] = hpAfter;

    // 5) Bleed on slashing/piercing if damage reached HP — ONLY on called shots.
    // Random and Default hits deal damage without location-tied status effects.
    let bleedApplied = false;
    const bleedImmune = actor.system.statusImmunityLocks?.bleed === true
        || traits.immunities?.statuses?.all === true
        || traits.immunities?.statuses?.bleed === true;
    if (applyBleed && calledShot && toHp > 0 && BLEED_TYPES.has(type) && !bleedImmune) {
        // Existing Bleed doesn't stack (higher wins) — we set trivial if off,
        // otherwise leave alone so GM can escalate manually on crits.
        const existing = actor.system.conditions?.bleed;
        if (!existing?.active) {
            hpUpdates["system.conditions.bleed.active"] = true;
            hpUpdates["system.conditions.bleed.intensity"] = "trivial";
            bleedApplied = true;
        }
    }

    // 6) Threshold conditions (unconscious at 0 HP).
    const threshold = computeHpStateConditions(hpAfter, hpMax);
    Object.assign(hpUpdates, threshold);
    const knockedOut = hpBefore > 0 && hpAfter <= 0;

    // 7) Commit in one batch.
    const actorUpdates = { ...armor.actorUpdates, ...hpUpdates };
    if (Object.keys(actorUpdates).length) {
        await actor.update(actorUpdates);
    }
    if (armor.itemUpdates.length) {
        await actor.updateEmbeddedDocuments("Item", armor.itemUpdates);
    }

    const summary = buildSummary({
        target: actor.name, sourceName, location, amount, type,
        mitigatedAmount, damageImmune, damageResistant,
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
    const parts = [];
    parts.push(`<strong>${o.target}</strong> takes <strong>${o.amount}</strong> ${o.type} damage to ${o.location} from ${o.sourceName}.`);
    if (o.damageImmune) {
        parts.push(`<em>Immunity negates all ${o.type} damage.</em>`);
    } else if (o.damageResistant) {
        parts.push(`<em>Resistance reduces damage to ${o.mitigatedAmount}.</em>`);
    }
    if (o.bypassArmor && o.mitigatedAmount > 0) parts.push(`<em>${o.type} damage bypasses armor.</em>`);
    if (o.absorbed > 0) parts.push(`Armor/ND absorbed ${o.absorbed}.`);
    if (o.mitigation.noExcessToHp && o.mitigatedAmount > o.absorbed) {
        parts.push(`<em>Brace for Impact:</em> excess blocked from HP.`);
    } else if (o.mitigation.halveHp && o.toHp > 0) {
        parts.push(`<em>Brace for Impact:</em> HP damage halved.`);
    }
    if (o.toHp > 0) parts.push(`HP ${o.hpBefore} → ${o.hpAfter} (−${o.toHp}).`);
    else parts.push(`No HP damage.`);
    if (o.bleedApplied) parts.push(`<strong>Bleed</strong> applied.`);
    if (o.knockedOut) parts.push(`<strong>${o.target} is down!</strong>`);
    return `<div class="thefade-damage-summary">${parts.join(" ")}</div>`;
}

/**
 * Post a damage-summary chat card authored by the target, so everyone
 * (including players who weren't the attacker) sees what happened.
 */
export async function postDamageChat(actor, summaryHtml) {
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: summaryHtml
    });
}
