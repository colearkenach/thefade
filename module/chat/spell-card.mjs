// Spell chat cards. State lives in flags.thefade.spell (see attack-card.mjs).
import { applyDamage } from "../rules/damage.mjs";

const TEMPLATE = "systems/thefade/templates/chat/spell-card.hbs";
const SPELL_CRIT = 4;

function spellOptions(state) {
    if (!state.success) return [];
    const options = [];
    const d = state.damage;
    if (d.canCrit) options.push({ key: "crit", label: game.i18n.format("THEFADE.Attack.crit", { damage: d.critValue }), cost: SPELL_CRIT });
    if (d.total) options.push({ key: "damage", label: game.i18n.localize("THEFADE.Spell.moreDamage"), cost: d.increaseCost });
    if (state.range) options.push({ key: "range", label: game.i18n.localize("THEFADE.Spell.moreRange"), cost: 1 });
    if (state.time && !/^instant/i.test(state.time)) options.push({ key: "duration", label: game.i18n.localize("THEFADE.Spell.moreDuration"), cost: state.durationCost });
    if (state.bonusEffect && !state.spent.some(s => s.key === "bonus")) options.push({ key: "bonus", label: state.bonusEffect, cost: 1 });
    const types = new Set(d.components.filter(c => c.amount > 0).flatMap(c => CONFIG.THEFADE.damageTypeParts[c.type] ?? [c.type]));
    for (const type of types) {
        for (const effect of CONFIG.THEFADE.damageEffects[type] ?? []) {
            if (state.spent.some(s => s.key === effect.key)) continue;
            options.push({ key: effect.key, label: game.i18n.localize(effect.label), cost: effect.cost, damageEffect: true });
        }
    }
    for (const option of options) option.affordable = option.cost <= state.remaining;
    return options;
}

async function cardContext(state, message) {
    const caster = await fromUuid(state.casterUuid);
    const roll = message?.rolls?.[0];
    const d = state.damage;
    const components = d.components.map((c, i) => ({ ...c, amount: c.amount + (i === 0 ? d.increase + d.crits * d.critValue : 0) }));
    const counts = {};
    for (const s of state.spent) counts[s.key] = (counts[s.key] ?? 0) + 1;
    return {
        state,
        casterName: caster?.name ?? "",
        faces: roll?.faces ?? [],
        components,
        totalDamage: components.reduce((sum, c) => sum + c.amount, 0),
        options: spellOptions(state),
        increases: Object.entries(counts).filter(([k]) => ["range", "duration"].includes(k)).map(([k, n]) => ({ label: game.i18n.localize(k === "range" ? "THEFADE.Spell.moreRange" : "THEFADE.Spell.moreDuration"), n })),
        mishapLabel: state.mishap ? game.i18n.localize(`THEFADE.Spell.mishap.${state.mishap}`) : ""
    };
}

export async function createSpellMessage({ actor, rolls, rollMode, state }) {
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, await cardContext(state, { rolls }));
    const data = { speaker: ChatMessage.implementation.getSpeaker({ actor }), content, rolls, flags: { thefade: { spell: state } } };
    ChatMessage.implementation.applyRollMode(data, rollMode ?? game.settings.get("core", "rollMode"));
    return ChatMessage.implementation.create(data);
}

async function updateCard(message, state) {
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, await cardContext(state, message));
    return message.update({ content, "flags.thefade.spell": state });
}

/** Parse "3 rounds", "1d6 round", "2d12 rounds" into a number of rounds. */
async function parseRounds(text) {
    const match = String(text ?? "").match(/^\s*(\d+(?:d\d+)?)\s*rounds?/i);
    if (!match) return null;
    return match[1].includes("d") ? (await new Roll(match[1]).evaluate()).total : Number(match[1]);
}

/** Dispatch a click on a spell card control. */
export async function handleSpellCardAction(message, button) {
    const state = foundry.utils.deepClone(message.getFlag("thefade", "spell"));
    if (!state || state.applied) return;
    const op = button.dataset.op;

    if (op === "spend") {
        const option = spellOptions(state).find(o => o.key === button.dataset.option);
        if (!option) return;
        if (option.cost > state.remaining) return ui.notifications.warn("THEFADE.Attack.notEnough", { localize: true });
        state.remaining -= option.cost;
        if (option.key === "crit") state.damage.crits += 1;
        else if (option.key === "damage") state.damage.increase += 1;
        let rounds = null;
        const effect = option.damageEffect ? Object.values(CONFIG.THEFADE.damageEffects).flat().find(e => e.key === option.key) : null;
        if (effect?.duration === "half") rounds = Math.max(1, Math.floor(state.damage.total / 2));
        else if (typeof effect?.duration === "string") rounds = (await new Roll(effect.duration).evaluate()).total;
        else if (Number.isFinite(effect?.duration)) rounds = effect.duration;
        state.spent.push({ key: option.key, label: option.label, cost: option.cost, rounds, condition: effect?.condition ?? null, intensity: effect?.intensity ?? null, sanity: effect?.sanity ?? null });
        return updateCard(message, state);
    }

    if (op === "reset") {
        state.remaining += state.spent.reduce((sum, s) => sum + s.cost, 0);
        state.spent = [];
        state.damage.crits = 0;
        state.damage.increase = 0;
        return updateCard(message, state);
    }

    if (op === "apply") {
        if (!game.user.isGM) return ui.notifications.warn("THEFADE.Attack.gmOnly", { localize: true });
        const target = await fromUuid(state.targetUuid);
        const actor = target?.actor ?? target;
        if (!actor?.system) return ui.notifications.error("THEFADE.Attack.noTarget", { localize: true });
        const context = await cardContext(state, message);
        const summaries = [];
        for (const component of context.components) {
            if (component.amount <= 0) continue;
            const result = await applyDamage(actor, { amount: component.amount, type: component.type, location: "body", sourceName: state.itemName });
            summaries.push(result.summary);
        }
        if (state.sanityDamage) {
            const loss = (await new Roll(String(state.sanityDamage)).evaluate()).total;
            await actor.update({ "system.sanity.value": actor.system.sanity.value - loss });
            summaries.push(`<p>${game.i18n.format("THEFADE.Attack.sanityLoss", { amount: loss })}</p>`);
        }
        const spell = await fromUuid(state.itemUuid);
        for (const status of spell?.system.statusEffects ?? []) {
            const rounds = await parseRounds(status.duration);
            const applied = await actor.setCondition(status.status, { active: true, intensity: status.intensity || undefined, rounds });
            if (applied) summaries.push(`<p>${game.i18n.format("THEFADE.Attack.conditionApplied", { condition: applied.name, rounds: rounds ?? status.duration ?? "—" })}</p>`);
        }
        for (const effect of state.spent) {
            if (effect.condition) {
                await actor.setCondition(effect.condition, { active: true, intensity: effect.intensity ?? undefined, rounds: effect.rounds });
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
            content: `<div class="thefade chat-note damage">${summaries.join("") || game.i18n.localize("THEFADE.Spell.nothingApplied")}</div>`
        });
    }
}
