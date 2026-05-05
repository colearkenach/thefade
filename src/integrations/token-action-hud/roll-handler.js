// Dispatches Token Action HUD action clicks for The Fade.
import { ACTION_TYPE } from "./constants.js";
import { openOpposedRollDialog, openAidAnotherDialog } from "../../opposed.js";

export function makeRollHandler(coreApi) {
    return class TheFadeRollHandler extends coreApi.RollHandler {
        async handleActionClick(event, encodedValue) {
            const [actionType, id] = encodedValue.split(this.delimiter ?? "|");
            const actor = this.actor;
            if (!actor) return;

            switch (actionType) {
                case ACTION_TYPE.attribute: return this._rollAttribute(actor, id);
                case ACTION_TYPE.skill:     return this._rollSkill(actor, id, event);
                case ACTION_TYPE.weapon:    return this._rollWeapon(actor, id, event);
                case ACTION_TYPE.spell:     return this._openItem(actor, id);
                case ACTION_TYPE.talent:    return this._useTalent(actor, id, event);
                case ACTION_TYPE.item:      return this._openItem(actor, id);
                case ACTION_TYPE.utility:   return this._utility(actor, id);
            }
        }

        // Mirrors npc-sheet/character-sheet attribute roll logic without sheet UI.
        async _rollAttribute(actor, attribute) {
            const value = actor.system?.attributes?.[attribute]?.value || 0;
            const dice = Math.max(1, value);
            const roll = await new Roll(`${dice}d12`).evaluate();
            let successes = 0;
            for (const die of roll.terms[0].results) {
                if (die.result >= 12) successes += 2;
                else if (die.result >= 8) successes += 1;
            }
            const name = attribute.charAt(0).toUpperCase() + attribute.slice(1);
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `${name} Check`,
                content: `<p>${actor.name} rolled ${dice}d12.</p><p>Successes: ${successes}</p>`
            });
        }

        async _rollSkill(actor, skillId, event) {
            // Defer to the character sheet's existing handler so DT prompt &
            // condition modifiers stay consistent.
            const sheet = actor.sheet;
            if (sheet?._onSkillRoll) {
                const fakeEvent = this._fakeItemEvent(event, skillId);
                return sheet._onSkillRoll(fakeEvent);
            }
            // NPC fallback: roll skill's attribute pool directly.
            const skill = actor.items.get(skillId);
            if (!skill) return;
            return this._rollAttribute(actor, skill.system?.attribute || "physique");
        }

        async _rollWeapon(actor, weaponId, event) {
            const sheet = actor.sheet;
            if (sheet?._onAttackRoll) {
                const fakeEvent = this._fakeItemEvent(event, weaponId);
                return sheet._onAttackRoll(fakeEvent);
            }
            // NPC: simple attribute/2 d12 roll, mirrors npc-sheet inline.
            const weapon = actor.items.get(weaponId);
            if (!weapon) return;
            const attr = weapon.system?.attribute || "physique";
            const attrVal = actor.system?.attributes?.[attr]?.value || 1;
            const dice = Math.max(1, Math.floor(attrVal / 2) + (weapon.system?.miscBonus || 0));
            const roll = await new Roll(`${dice}d12`).evaluate();
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `${actor.name} attacks with ${weapon.name} (${dice}d12)`
            });
        }

        async _useTalent(actor, talentId, event) {
            const talent = actor.items.get(talentId);
            if (!talent) return;
            const max = Number(talent.system?.usesPerDay ?? 0);
            // Right-click opens sheet; left-click decrements uses if it's a daily.
            if (this.isRightClick(event) || max <= 0) return talent.sheet.render(true);

            const used = Number(talent.system?.currentUses ?? 0);
            if (used >= max) {
                ui.notifications.warn(`${talent.name}: no uses remaining today.`);
                return;
            }
            await talent.update({ "system.currentUses": used + 1 });
            return ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `<p><strong>${actor.name}</strong> uses <strong>${talent.name}</strong>.</p>` +
                    `<p>Uses remaining: ${Math.max(0, max - (used + 1))}/${max}</p>` +
                    (talent.system?.description ? `<hr>${talent.system.description}` : "")
            });
        }

        async _openItem(actor, itemId) {
            const item = actor.items.get(itemId);
            return item?.sheet.render(true);
        }

        async _utility(actor, id) {
            switch (id) {
                case "sheet":      return actor.sheet.render(true);
                case "opposed":    return openOpposedRollDialog(actor);
                case "aid":        return openAidAnotherDialog(actor);
                case "rest":       return actor.takeRest?.();
                case "initiative": return this._rollInitiative(actor);
            }
        }

        async _rollInitiative(actor) {
            const fin = actor.system?.attributes?.finesse?.value || 0;
            const mnd = actor.system?.attributes?.mind?.value || 0;
            const bonus = Math.floor((fin + mnd) / 2) + (actor.system?.initiativeBonus || 0);
            const roll = await new Roll(`1d12 + ${bonus}`).evaluate();
            if (game.combat) {
                const combatant = game.combat.combatants.find(c => c.actorId === actor.id);
                if (combatant) await game.combat.setInitiative(combatant.id, roll.total);
            }
            return roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `${actor.name} rolls Initiative!`
            });
        }

        isRightClick(event) {
            return event?.type === "contextmenu" || event?.button === 2;
        }

        _fakeItemEvent(event, itemId) {
            return {
                preventDefault: () => {},
                stopPropagation: () => {},
                type: event?.type ?? "click",
                button: event?.button ?? 0,
                currentTarget: {
                    dataset: {},
                    closest: (sel) => sel === ".item" ? { dataset: { itemId } } : null
                }
            };
        }
    };
}
