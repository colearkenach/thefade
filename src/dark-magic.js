// Sin / Dark Magic enforcement for The Fade - Abyss.
//
// Casting a dark spell pushes current Sin up by the spell's required
// successes (its "DT"). If that pushes current Sin above the actor's
// Sin Threshold (Soul - dark spells learned + bonus), they roll Grit
// vs the excess; failure advances the addiction stage by one step.
//
// Addiction stages carry passive penalties applied during actor data
// prep: Early = -1 Grit, Middle = -2 Grit, Late = -1 Grit and reduced
// Sanity max, Terminal = Soul halved for sin-threshold purposes.
//
// Daily reset (TheFadeActor.restDaily) zeroes currentSin so overnight
// rest scrubs the day's accumulation — stages persist.
//
// Rules source: Core Rulebook Dark Magic chapter (Sin Threshold,
// Addiction progression); AUDIT.md P0 #3.

/**
 * Ordered addiction stage progression.
 */
export const ADDICTION_STAGES = ["none", "early", "middle", "late", "terminal"];

/**
 * Passive effects applied to actor data for each stage.
 * gritDelta / sanityDelta are added to totalGrit / sanity max.
 * soulDivisor halves effective Soul for sin-threshold purposes only
 * (we do not mutate attributes.soul.value).
 */
export const ADDICTION_STAGE_EFFECTS = {
    none:     { gritDelta:  0, sanityDelta: 0, soulDivisor: 1 },
    early:    { gritDelta: -1, sanityDelta: 0, soulDivisor: 1 },
    middle:   { gritDelta: -2, sanityDelta: 0, soulDivisor: 1 },
    late:     { gritDelta: -2, sanityDelta: -2, soulDivisor: 1 },
    terminal: { gritDelta: -2, sanityDelta: -4, soulDivisor: 2 }
};

/**
 * Extract the effective Sin threshold the way _calculateSinThreshold does,
 * but apply the terminal soul-halving. This runs during prep so the sheet
 * shows the penalized value.
 *
 * @param {Object} data - system data (mutates data.darkMagic.sinThreshold)
 */
export function applyAddictionPenalties(data) {
    if (!data.darkMagic || typeof data.darkMagic !== "object") return;
    const stage = data.darkMagic.addictionLevel || "none";
    const effects = ADDICTION_STAGE_EFFECTS[stage] || ADDICTION_STAGE_EFFECTS.none;

    // Grit penalty stacks on whatever's already there (condition + stance).
    if (effects.gritDelta) {
        data.totalGrit = Math.max(0, (data.totalGrit || 0) + effects.gritDelta);
    }
    // Sanity cap shrinks under late/terminal pressure.
    if (effects.sanityDelta && data.sanity) {
        data.sanity.max = Math.max(1, (data.sanity.max || 1) + effects.sanityDelta);
        if (data.sanity.value > data.sanity.max) data.sanity.value = data.sanity.max;
        data.maxSanity = data.sanity.max;
    }
    // Terminal halves the Soul input to sin-threshold recomputation.
    if (effects.soulDivisor > 1) {
        const soul = data.attributes?.soul?.value || 1;
        const spells = Object.values(data.darkMagic.spellsLearned || {}).filter(Boolean).length;
        const bonus = Number(data.darkMagic.sinThresholdBonus) || 0;
        data.darkMagic.sinThreshold = Math.max(0,
            Math.floor(soul / effects.soulDivisor) - spells + bonus);
    }

    // Expose a UI-friendly summary so the sheet can render it without
    // duplicating the table.
    data.darkMagic.stageSummary = summarizeStage(stage);
}

/**
 * Short human-readable blurb for the current addiction stage.
 */
function summarizeStage(stage) {
    switch (stage) {
        case "early":    return "Early: -1 Grit";
        case "middle":   return "Middle: -2 Grit";
        case "late":     return "Late: -2 Grit, -2 Sanity max; risk of Meltdowns";
        case "terminal": return "Terminal: Soul halved, -2 Grit, -4 Sanity max";
        default:         return "None";
    }
}

/**
 * Advance an actor's addiction stage by one step (clamped at terminal).
 * Returns the new stage.
 */
export async function advanceAddictionStage(actor) {
    const current = actor.system.darkMagic?.addictionLevel || "none";
    const idx = ADDICTION_STAGES.indexOf(current);
    if (idx < 0) return current;
    if (idx >= ADDICTION_STAGES.length - 1) return current;
    const next = ADDICTION_STAGES[idx + 1];
    await actor.update({ "system.darkMagic.addictionLevel": next });
    return next;
}

/**
 * Reset currentSin to 0 (daily). Stage progression is persistent.
 */
export async function resetDailySin(actor) {
    await actor.update({ "system.darkMagic.currentSin": 0 });
}

/**
 * Handle a dark-spell cast. Increments Sin by the spell DT; if the new
 * total is over threshold, rolls a Grit test with dice equal to the
 * excess. Failure advances the addiction stage. Posts a summary card.
 *
 * @param {Actor} actor - the caster
 * @param {Item} spell - the spell item
 * @returns {Promise<{sinBefore, sinAfter, threshold, overflow,
 *                    resistSuccesses?, gritTarget?, resisted?, stageAdvanced?}>}
 */
export async function handleDarkCast(actor, spell) {
    if (!spell?.system?.isDarkMagic) return null;

    const dt = Math.max(1, parseInt(spell.system.successes) || 1);
    const sinBefore = Number(actor.system.darkMagic?.currentSin || 0);
    const threshold = Number(actor.system.darkMagic?.sinThreshold || 0);
    const sinAfter = sinBefore + dt;

    const updates = { "system.darkMagic.currentSin": sinAfter };
    let overflow = sinAfter - threshold;
    let resistSuccesses = null;
    let gritTarget = null;
    let resisted = null;
    let stageAdvanced = null;

    if (overflow > 0) {
        // Grit test: dice = overflow, target = totalGrit.
        gritTarget = Number(actor.system.totalGrit || actor.system.defenses?.grit || 1);
        const pool = Math.max(1, overflow);
        const roll = await new Roll(`${pool}d12`).evaluate({ async: true });
        resistSuccesses = 0;
        roll.terms[0].results.forEach(die => {
            if (die.result >= 12) resistSuccesses += 2;
            else if (die.result >= 8) resistSuccesses += 1;
        });
        resisted = resistSuccesses >= gritTarget;
        if (!resisted) {
            const prior = actor.system.darkMagic?.addictionLevel || "none";
            const idx = ADDICTION_STAGES.indexOf(prior);
            if (idx >= 0 && idx < ADDICTION_STAGES.length - 1) {
                updates["system.darkMagic.addictionLevel"] = ADDICTION_STAGES[idx + 1];
                stageAdvanced = ADDICTION_STAGES[idx + 1];
            }
        }
    }

    await actor.update(updates);

    const summary = buildSummary({
        actor: actor.name,
        spell: spell.name,
        dt, sinBefore, sinAfter, threshold, overflow,
        resistSuccesses, gritTarget, resisted, stageAdvanced
    });

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: summary
    });

    return { sinBefore, sinAfter, threshold, overflow,
             resistSuccesses, gritTarget, resisted, stageAdvanced };
}

function buildSummary(o) {
    const parts = [];
    parts.push(`<p><strong>${o.actor}</strong> casts <em>${o.spell}</em> (Dark Magic, DT ${o.dt}).</p>`);
    parts.push(`<p>Sin: ${o.sinBefore} → <strong>${o.sinAfter}</strong> (threshold ${o.threshold}).</p>`);
    if (o.overflow > 0) {
        parts.push(`<p>Sin exceeds threshold by ${o.overflow}. Grit test (${o.overflow}d12 vs ${o.gritTarget}): <strong>${o.resistSuccesses}</strong> successes.</p>`);
        if (o.resisted) {
            parts.push(`<p class="success">The pull is resisted.</p>`);
        } else if (o.stageAdvanced) {
            parts.push(`<p class="failure">The dark takes hold — addiction advances to <strong>${o.stageAdvanced}</strong>.</p>`);
        } else {
            parts.push(`<p class="failure">The dark takes hold — already at terminal stage.</p>`);
        }
    } else {
        parts.push(`<p>Within threshold — no resistance roll required.</p>`);
    }
    return `<div class="thefade-sin-summary">${parts.join("")}</div>`;
}
