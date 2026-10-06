// Combat: turn-start effects (Bleed, Regeneration, stance expiry) and
// temporary-bonus expiry. Foundry runs these hooks only on the active GM,
// once per combatant turn, including when a round wraps.
import { computePerRoundDamage } from "../rules/conditions.js";
import { getActiveTemporaryBonusEntries } from "../rules/abilities.js";
import { STANCES } from "../rules/stances.js";

export default class TheFadeCombat extends Combat {

    /** @override */
    async _onStartTurn(combatant, context) {
        await super._onStartTurn(combatant, context);
        const actor = combatant.actor;
        if (!actor || actor.type !== "character" && actor.type !== "npc") return;
        const lines = [];
        const update = {};

        // Timed conditions (e.g. 1d6 rounds of Fear) end at the start of the creature's turn once their rounds run out.
        const expired = actor.effects.filter(effect => effect.statuses.size && effect.duration.type === "turns"
            && effect.duration.rounds > 0 && effect.duration.remaining <= 0);
        if (expired.length) {
            lines.push(game.i18n.format("THEFADE.Combat.conditionsEnd", { conditions: expired.map(e => e.name).join(", ") }));
            await actor.deleteEmbeddedDocuments("ActiveEffect", expired.map(e => e.id));
        }
        const system = actor.system;

        // A defensive stance lasts until the start of the stancee's next turn.
        if (system.activeStance && system.activeStance !== "none") {
            lines.push(game.i18n.format("THEFADE.Combat.stanceEnds", { stance: STANCES[system.activeStance]?.label ?? system.activeStance }));
            update["system.activeStance"] = "none";
        }

        // Periodic damage (Bleed) and Regeneration.
        let hp = system.hp.value;
        const effective = Object.fromEntries(Object.entries(system.conditions ?? {}).filter(([key]) => !system.statusImmunityLocks?.[key]));
        for (const tick of computePerRoundDamage(effective)) {
            hp -= tick.damage;
            lines.push(game.i18n.format("THEFADE.Combat.bleedTick", {
                condition: tick.label, intensity: game.i18n.localize(`THEFADE.Intensity.${tick.intensity}`), damage: tick.damage
            }));
        }
        if (system.regeneration > 0 && hp < system.hp.max && hp > system.hp.deathThreshold) {
            const healed = Math.min(system.regeneration, system.hp.max - hp);
            hp += healed;
            lines.push(game.i18n.format("THEFADE.Combat.regeneration", { healed }));
        }
        if (hp !== system.hp.value) update["system.hp.value"] = hp;

        if (foundry.utils.isEmpty(update) && !lines.length) return;
        if (!foundry.utils.isEmpty(update)) await actor.update(update);
        if (hp !== system.hp.value || lines.length) {
            await ChatMessage.implementation.create({
                speaker: ChatMessage.implementation.getSpeaker({ actor, token: combatant.token }),
                content: `<div class="thefade chat-note"><p><strong>${foundry.utils.escapeHTML(actor.name)}</strong>: ${lines.join(" ")}</p>${
                    update["system.hp.value"] !== undefined ? `<p class="hint">HP ${system.hp.value} → ${hp}</p>` : ""}</div>`
            });
        }
    }

    /** @override */
    async _onStartRound(context) {
        await super._onStartRound(context);
        // Drop expired temporary ability bonuses from combatants.
        for (const combatant of this.combatants) {
            const actor = combatant.actor;
            const stored = actor?.system?.temporaryBonuses;
            if (!stored?.length) continue;
            const active = getActiveTemporaryBonusEntries(actor);
            if (active.length !== stored.length) await actor.update({ "system.temporaryBonuses": active });
        }
    }
}
