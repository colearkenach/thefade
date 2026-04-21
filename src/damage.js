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
 * Split armor absorption between Natural Deflection and equipped armor.
 * Mirrors the rules: ND stacks (if flagged) or takes the higher of the two;
 * the attacker reduces whichever applies first (we reduce ND first if
 * stacking, else armor first, matching the existing AP-reduction helper).
 *
 * Returns { absorbed, updates: {actorUpdates, itemUpdates} }.
 * Does NOT persist — caller merges updates into a batch.
 */
function computeArmorAbsorption(actor, location, damage) {
    let remaining = damage;
    let absorbed = 0;
    const actorUpdates = {};
    const itemUpdates = [];

    const nd = actor.system.naturalDeflection?.[location];
    const equippedArmor = actor.equippedArmor?.[location] || [];

    // Natural Deflection: if stacks, reduce it first alongside armor.
    if (nd && nd.stacks && (nd.current || 0) > 0 && remaining > 0) {
        const take = Math.min(nd.current, remaining);
        actorUpdates[`system.naturalDeflection.${location}.current`] = nd.current - take;
        remaining -= take;
        absorbed += take;
    }

    // Armor pieces at the struck location.
    for (const armor of equippedArmor) {
        if (remaining <= 0) break;
        const currentAP = Number(armor.system.currentAP) || 0;
        if (currentAP <= 0) continue;
        const take = Math.min(currentAP, remaining);
        itemUpdates.push({ _id: armor._id, "system.currentAP": currentAP - take });
        remaining -= take;
        absorbed += take;
    }

    // Derived limb armor (parent arms/legs armor covers both children, with
    // side-specific pools tracked as derivedLeftAP / derivedRightAP). The
    // sheet displays these fields directly — writing the generic currentAP
    // here would absorb damage invisibly.
    const decrementDerived = (armorList, derivedProp) => {
        for (const armor of armorList) {
            if (remaining <= 0) break;
            const raw = armor.system[derivedProp];
            const startPool = (raw === undefined || raw === null)
                ? (Number(armor.system.ap) || 0) + (Number(armor.system.apIncrease) || 0)
                : Number(raw) || 0;
            if (startPool <= 0) continue;
            const take = Math.min(startPool, remaining);
            itemUpdates.push({ _id: armor._id, [`system.${derivedProp}`]: startPool - take });
            remaining -= take;
            absorbed += take;
        }
    };
    if (remaining > 0 && (location === "leftarm" || location === "rightarm")) {
        const prop = location === "leftarm" ? "derivedLeftAP" : "derivedRightAP";
        decrementDerived(actor.equippedArmor?.arms || [], prop);
    }
    if (remaining > 0 && (location === "leftleg" || location === "rightleg")) {
        const prop = location === "leftleg" ? "derivedLeftAP" : "derivedRightAP";
        decrementDerived(actor.equippedArmor?.legs || [], prop);
    }

    // Non-stacking Natural Deflection: acts as a floor — contributes after
    // armor is exhausted, up to its remaining pool.
    if (nd && !nd.stacks && (nd.current || 0) > 0 && remaining > 0) {
        const take = Math.min(nd.current, remaining);
        actorUpdates[`system.naturalDeflection.${location}.current`] = nd.current - take;
        remaining -= take;
        absorbed += take;
    }

    return { absorbed, carryToHp: remaining, actorUpdates, itemUpdates };
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

    const hpBefore = Number(actor.system.hp?.value ?? 0);
    const hpMax = Number(actor.system.hp?.max ?? 1);
    const mitigation = actor.system.damageMitigation || { noExcessToHp: false, halveHp: false };

    // 1) Armor/ND absorbs the front of the damage.
    const armor = computeArmorAbsorption(actor, location, amount);

    // 2) Brace for Impact: excess past armor never reaches HP.
    let toHp = armor.carryToHp;
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
    if (applyBleed && calledShot && toHp > 0 && BLEED_TYPES.has(type)) {
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
        absorbed: armor.absorbed, toHp, hpBefore, hpAfter,
        mitigation, bleedApplied, knockedOut
    });

    return { absorbed: armor.absorbed, hpBefore, hpAfter, hpDamage: toHp, bleedApplied, knockedOut, summary };
}

/**
 * HTML snippet summarizing a damage application, for chat reporting.
 */
function buildSummary(o) {
    const parts = [];
    parts.push(`<strong>${o.target}</strong> takes <strong>${o.amount}</strong> ${o.type} damage to ${o.location} from ${o.sourceName}.`);
    if (o.absorbed > 0) parts.push(`Armor/ND absorbed ${o.absorbed}.`);
    if (o.mitigation.noExcessToHp && o.amount > o.absorbed) {
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
