// Attack chat cards. The card's state lives in the message flags
// (flags.thefade.attack), so spent successes, crits, and "damage applied"
// are shared by every client and survive reloads. The message author (or a
// GM) spends successes; only a GM applies damage.
import { applyDamage } from "../rules/damage.mjs";
import { locationLabel } from "../rules/hit-location.js";

const TEMPLATE = "systems/thefade/templates/chat/attack-card.hbs";

/** Damage types present on a hit, with compound codes expanded. */
function damageTypes(state) {
    const types = new Set();
    for (const component of state.damage.components) {
        if (component.amount <= 0) continue;
        for (const part of CONFIG.THEFADE.damageTypeParts[component.type] ?? [component.type]) types.add(part);
    }
    return types;
}

/** Spendable options for a card's remaining successes. */
export function attackOptions(state) {
    if (!state.hit) return [];
    const options = [];
    if (state.critThreshold) {
        options.push({ key: "crit", label: game.i18n.format("THEFADE.Attack.crit", { damage: state.damage.critValue }), cost: state.critThreshold, repeatable: true });
    }
    for (const type of damageTypes(state)) {
        for (const effect of CONFIG.THEFADE.damageEffects[type] ?? []) {
            const bought = state.spent.find(s => s.key === effect.key);
            if (bought && !effect.perExtra) continue;
            options.push({
                key: effect.key,
                label: game.i18n.localize(effect.label),
                cost: bought ? 1 : effect.cost,
                extend: !!bought
            });
        }
    }
    if (state.ripping) {
        options.push({ key: "ripping", label: game.i18n.localize("THEFADE.Attack.rippingExtend"), cost: 2, repeatable: true });
    }
    for (const option of options) option.affordable = option.cost <= state.remaining;
    return options;
}

/** Display data for the card template. */
async function cardContext(state, message) {
    const attacker = await fromUuid(state.attackerUuid);
    const roll = message?.rolls?.[0];
    const crits = state.damage.crits;
    const components = state.damage.components.map((c, i) => ({
        ...c, amount: c.amount + (i === 0 ? crits * state.damage.critValue : 0)
    }));
    return {
        state,
        attackerName: attacker?.name ?? "",
        faces: roll?.faces ?? [],
        poolSize: roll?.poolSize ?? 0,
        components,
        totalDamage: components.reduce((sum, c) => sum + c.amount, 0),
        options: attackOptions(state),
        canSpend: !message || message.isOwner,
        canApply: game.user.isGM && !!state.targetUuid,
        facingLabel: state.facing ? game.i18n.localize(`THEFADE.Facing.${state.facing}`) : ""
    };
}

/** Create the chat message for an attack. */
export async function createAttackMessage({ actor, rolls, rollMode, state }) {
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, await cardContext(state, { rolls, isOwner: true }));
    const data = {
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        content,
        rolls,
        flags: { thefade: { attack: state } }
    };
    ChatMessage.implementation.applyRollMode(data, rollMode ?? game.settings.get("core", "rollMode"));
    return ChatMessage.implementation.create(data);
}

/** Re-render a card after its state changed. */
async function updateCard(message, state) {
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, await cardContext(state, message));
    return message.update({ content, "flags.thefade.attack": state });
}

/** Spend remaining successes on an option ("crit" or a damage-effect key). */
export async function spendAttackOption(message, key) {
    const state = foundry.utils.deepClone(message.getFlag("thefade", "attack"));
    if (!state || state.applied) return;
    const option = attackOptions(state).find(o => o.key === key);
    if (!option) return;
    if (option.cost > state.remaining) return ui.notifications.warn("THEFADE.Attack.notEnough", { localize: true });
    state.remaining -= option.cost;

    if (key === "crit") {
        state.damage.crits += 1;
    } else if (key === "ripping") {
        state.ripping.extra += 1;
        state.ripping.rounds += 1;
        const entry = state.spent.find(s => s.key === "ripping");
        if (entry) {
            entry.cost += option.cost;
            entry.rounds = state.ripping.rounds;
        } else {
            state.spent.push({ key, label: game.i18n.localize("THEFADE.Attack.rippingBleed"), cost: option.cost, rounds: state.ripping.rounds });
        }
    } else {
        const effect = Object.values(CONFIG.THEFADE.damageEffects).flat().find(e => e.key === key);
        const existing = state.spent.find(s => s.key === key);
        if (existing) {
            existing.rounds = (existing.rounds ?? 0) + 1;
            existing.cost += 1;
        } else {
            let rounds = null;
            if (effect.duration === "half") rounds = Math.max(1, Math.floor(state.damage.total / 2));
            else if (typeof effect.duration === "string") rounds = (await new Roll(effect.duration).evaluate()).total;
            else if (Number.isFinite(effect.duration)) rounds = effect.duration;
            state.spent.push({ key, label: game.i18n.localize(effect.label), cost: option.cost, rounds, condition: effect.condition ?? null, intensity: effect.intensity ?? null, sanity: effect.sanity ?? null });
        }
    }
    return updateCard(message, state);
}

/** Refund every spent success on a card (before damage is applied). */
export async function resetAttackSpending(message) {
    const state = foundry.utils.deepClone(message.getFlag("thefade", "attack"));
    if (!state || state.applied) return;
    const refund = state.spent.reduce((sum, s) => sum + s.cost, 0) + state.damage.crits * (state.critThreshold ?? 0);
    state.remaining += refund;
    state.spent = [];
    state.damage.crits = 0;
    if (state.ripping) Object.assign(state.ripping, { rounds: state.ripping.rounds - state.ripping.extra, extra: 0 });
    return updateCard(message, state);
}

/** Apply a card's damage (and bought conditions) to its target. GM only. */
export async function applyAttackDamage(message) {
    if (!game.user.isGM) return ui.notifications.warn("THEFADE.Attack.gmOnly", { localize: true });
    const state = foundry.utils.deepClone(message.getFlag("thefade", "attack"));
    if (!state?.hit || state.applied) return;
    const target = await fromUuid(state.targetUuid);
    const actor = target?.actor ?? target;
    if (!actor?.system) return ui.notifications.error("THEFADE.Attack.noTarget", { localize: true });

    const context = await cardContext(state, message);
    const location = state.location?.key ?? "body";
    const summaries = [];
    const immune = type => actor.system.combatTraits?.immunities?.damageTypes?.[type] === true;
    const firstNonImmune = context.components.findIndex(c => !immune(c.type));
    let hpDealt = 0;
    if (state.damage.track === "sanity") {
        // Hazards that attack the mind skip armor and resistances entirely.
        const loss = context.totalDamage;
        await actor.update({ "system.sanity.value": actor.system.sanity.value - loss });
        summaries.push(`<p>${game.i18n.format("THEFADE.Attack.sanityLoss", { amount: loss })}</p>`);
    }
    else for (const [index, component] of context.components.entries()) {
        if (component.amount <= 0) continue;
        const result = await applyDamage(actor, {
            amount: component.amount,
            type: component.type,
            location,
            calledShot: !!state.location?.called,
            bypassArmor: state.damage.bypassArmor === true,
            minimumHpDamage: index === firstNonImmune ? state.damage.minimumHp : 0,
            sourceName: state.itemName
        });
        hpDealt += result.hpDamage ?? 0;
        summaries.push(result.summary);
    }

    // Ripping bleeds only when the hit reached HP.
    if (state.ripping && hpDealt > 0) {
        const bleed = await actor.setCondition("bleed", { active: true, intensity: "trivial", rounds: state.ripping.rounds, keepHigher: true });
        if (bleed) summaries.push(`<p>${game.i18n.format("THEFADE.Attack.rippingApplied", { rounds: state.ripping.rounds })}</p>`);
    }

    // Bonus effects: conditions with durations, and Psychokinetic Sanity damage.
    for (const effect of state.spent) {
        if (effect.condition) {
            await actor.setCondition(effect.condition, { active: true, intensity: effect.intensity ?? undefined, rounds: effect.rounds, keepHigher: true });
            summaries.push(`<p>${game.i18n.format("THEFADE.Attack.conditionApplied", { condition: effect.label, rounds: effect.rounds ?? "—" })}</p>`);
        }
        if (effect.sanity === "half") {
            const loss = Math.floor(context.totalDamage / 2);
            await actor.update({ "system.sanity.value": actor.system.sanity.value - loss });
            summaries.push(`<p>${game.i18n.format("THEFADE.Attack.sanityLoss", { amount: loss })}</p>`);
        }
    }

    state.applied = true;
    await updateCard(message, state);
    await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        content: `<div class="thefade chat-note damage">${summaries.join("")}</div>`
    });
}

export { locationLabel };
