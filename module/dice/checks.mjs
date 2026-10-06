// Shared check workflow: configure → apply condition modifiers → roll → chat.
import FadeRoll from "./fade-roll.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Should this click skip the configuration dialog? Shift-click rolls
 * immediately with the defaults (unless the user setting inverts it).
 * @param {Event} [event]
 */
export function isFastForward(event) {
    const invert = game.settings.get("thefade", "skipRollDialog");
    const shift = !!(event?.shiftKey);
    return invert ? !shift : shift;
}

/**
 * Prompt for a roll's Difficulty Threshold, extra dice, and roll mode.
 * @param {object} options
 * @param {string} options.title
 * @param {number} options.dice          Base pool before extra dice.
 * @param {number|null} [options.dt]     Default DT (null = none).
 * @param {boolean} [options.allowNoDT]  Offer "No DT" (e.g. opposed or GM-hidden checks).
 * @param {string[]} [options.notes]     Condition/situational notes to show.
 * @returns {Promise<{dt: number|null, extraDice: number, rollMode: string}|null>}
 */
export async function configureRoll({ title, dice, dt = 3, allowNoDT = true, notes = [] }) {
    const difficulties = Object.entries(CONFIG.THEFADE.difficulties).map(([value, label]) => ({
        value: Number(value), label: game.i18n.localize(label), selected: Number(value) === dt
    }));
    const content = await foundry.applications.handlebars.renderTemplate("systems/thefade/templates/dialogs/roll-config.hbs", {
        dice, dt, allowNoDT, difficulties, notes,
        rollModes: Object.entries(CONFIG.Dice.rollModes).map(([value, mode]) => ({
            value, label: game.i18n.localize(mode.label ?? mode), selected: value === game.settings.get("core", "rollMode")
        }))
    });
    return DialogV2.wait({
        window: { title, icon: "fa-solid fa-dice-d20" },
        classes: ["thefade", "thefade-roll-dialog"],
        position: { width: 380 },
        content,
        buttons: [{
            action: "roll",
            label: "THEFADE.Roll.roll",
            icon: "fa-solid fa-dice-d20",
            default: true,
            callback: (event, button) => {
                const form = button.form.elements;
                const noDT = form.noDT?.checked;
                const value = Number(form.dt.value);
                return {
                    dt: noDT ? null : (Number.isFinite(value) && value > 0 ? value : null),
                    extraDice: Math.trunc(Number(form.extraDice.value) || 0),
                    rollMode: form.rollMode.value
                };
            }
        }],
        render: (event, dialog) => {
            // Picking a named difficulty fills the DT box.
            const element = dialog.element;
            element.querySelector("[name=difficulty]")?.addEventListener("change", ev => {
                element.querySelector("[name=dt]").value = ev.currentTarget.value;
            });
        },
        rejectClose: false
    });
}

/**
 * Roll a d12 success pool for an actor, applying condition modifiers and
 * posting the result to chat.
 *
 * @param {Actor} actor
 * @param {object} options
 * @param {number} options.dice             Base dice before conditions/extra dice.
 * @param {string} options.label            e.g. "Sword", "Physique"
 * @param {string} [options.flavor]         Chat flavor line.
 * @param {object} [options.context]        Condition context ({kind, skillName, skillCategory, attributeName}).
 * @param {number|null} [options.dt]        Default DT.
 * @param {Event} [options.event]           Triggering event (shift = skip dialog).
 * @param {string[]} [options.notes]        Extra notes for the card.
 * @param {object} [options.flags]          Extra message flags under `thefade`.
 * @param {boolean} [options.createMessage=true]
 * @returns {Promise<FadeRoll|null>}
 */
export async function rollCheck(actor, {
    dice, label, flavor, context = { kind: "generic" }, dt = 3, event, notes = [], flags = {}, createMessage = true, infirm = false
} = {}) {
    const mods = actor?.getConditionRollModifiers?.(context) ?? { bonusDice: 0, penaltyDice: 0, notes: [], autoFail: false };
    const situational = [...notes, ...mods.notes];
    if (mods.bonusDice) situational.unshift(game.i18n.format("THEFADE.Roll.conditionBonus", { dice: mods.bonusDice }));
    if (mods.penaltyDice) situational.unshift(game.i18n.format("THEFADE.Roll.conditionPenalty", { dice: mods.penaltyDice }));
    if (infirm) situational.unshift(game.i18n.localize("THEFADE.Roll.infirm"));
    const autoFail = mods.autoFail || infirm;
    const basePool = Math.max(0, dice + mods.bonusDice - mods.penaltyDice);

    let config = { dt, extraDice: 0, rollMode: game.settings.get("core", "rollMode") };
    if (!isFastForward(event)) {
        config = await configureRoll({ title: label, dice: basePool, dt, notes: situational });
        if (!config) return null;
    }

    const total = autoFail ? 0 : Math.max(0, basePool + config.extraDice);
    if (config.extraDice) situational.push(game.i18n.format("THEFADE.Roll.extraDice", { dice: `${config.extraDice > 0 ? "+" : ""}${config.extraDice}` }));
    const roll = FadeRoll.pool(total, { dt: config.dt, label, flavor, notes: situational, autoFail });
    await roll.evaluate();
    if (createMessage) {
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor,
            flags: { thefade: { check: { label, dt: config.dt, ...flags } } }
        }, { rollMode: config.rollMode });
    }
    return roll;
}
