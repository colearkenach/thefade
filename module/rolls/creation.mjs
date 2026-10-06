// Character creation helpers. Random attributes (Core p. 6): roll 1d6 five
// times; a 6 rolls once more and adds. Crossbreed heritage (Heirs to Rangar
// pp. 33–47) and mutation tables (Heirs to Rangar pp. 21–32).
import {
    CROSSBREED_TYPES, MUTATION_SEVERITIES, XENOCHILD_MODIFIERS,
    calculateXenochildRolls, getBestCrossbreedOutcome, getCrossbreedOutcome, rollMutation
} from "../rules/rules.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;
const { escapeHTML } = foundry.utils;

const ASSIGN_DIALOG = "systems/thefade/templates/dialogs/attribute-array.hbs";
const ATTRIBUTE_CARD = "systems/thefade/templates/chat/attribute-array.hbs";
const HERITAGE_DIALOG = "systems/thefade/templates/dialogs/heritage.hbs";
const HERITAGE_CARD = "systems/thefade/templates/chat/heritage-card.hbs";
const MUTATION_CARD = "systems/thefade/templates/chat/mutation-card.hbs";

/** 1d6; a 6 rolls once more and adds (Core p. 6), so results run 1–12. */
const ATTRIBUTE_FORMULA = "1d6xo";

/** Localize a rules-table label if a translation exists, else keep the table's English. */
function localizeOr(key, fallback) {
    return game.i18n.has(key) ? game.i18n.localize(key) : fallback;
}

function attributeLabel(key) {
    return game.i18n.localize(CONFIG.THEFADE.attributes[key].label);
}

/** Post a chat card with the user's current roll mode. */
async function postCard(actor, template, context, { rolls = [], flags = {} } = {}) {
    const data = {
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        content: await renderTemplate(template, context),
        rolls,
        flags: { thefade: flags }
    };
    ChatMessage.implementation.applyRollMode(data, game.settings.get("core", "rollMode"));
    return ChatMessage.implementation.create(data);
}

/* -------------------------------------------- */
/*  Random attributes                           */
/* -------------------------------------------- */

/**
 * Roll a random attribute array: five rolls of 1d6 (a 6 rolls once more and
 * adds, for a maximum of 12). The results are written in rolled order and posted to
 * chat, then the player may rearrange which attribute gets which result.
 * @param {Actor} actor
 * @returns {Promise<Actor|null>}
 */
export async function rollAttributeArray(actor) {
    const confirmed = await DialogV2.confirm({
        window: { title: game.i18n.localize("THEFADE.Creation.rollTitle"), icon: "fa-solid fa-dice" },
        classes: ["thefade"],
        content: `<p>${game.i18n.localize("THEFADE.Creation.rollConfirm")}</p>`,
        rejectClose: false
    });
    if (!confirmed) return null;

    const keys = CONFIG.THEFADE.attributeKeys;
    const rolls = [];
    for (let i = 0; i < keys.length; i++) rolls.push(await new Roll(ATTRIBUTE_FORMULA).evaluate());
    const results = rolls.map((roll, index) => ({
        index,
        number: index + 1,
        total: roll.total,
        value: roll.total,
        dice: roll.dice[0]?.results.map(r => r.result).join(" + ") ?? String(roll.total)
    }));

    // The rolls are binding: apply them in rolled order and put them on record first.
    let order = keys.map((key, slot) => slot);
    await actor.update(attributeUpdate(keys, results, order));
    const cardContext = assigned => ({
        actorName: actor.name,
        rolled: results.map(r => r.value).join(", "),
        rearranged: assigned.some((index, slot) => index !== slot),
        rows: keys.map((key, slot) => ({ label: attributeLabel(key), ...results[assigned[slot]] }))
    });
    const message = await postCard(actor, ATTRIBUTE_CARD, cardContext(order), { rolls, flags: { attributeArray: { values: results.map(r => r.value) } } });

    // Optional rearrangement; closing the dialog keeps the rolled order.
    const chosen = await assignAttributes(keys, results);
    if (chosen && chosen.some((index, slot) => index !== slot)) {
        order = chosen;
        await actor.update(attributeUpdate(keys, results, order));
        await message?.update({
            content: await renderTemplate(ATTRIBUTE_CARD, cardContext(order)),
            "flags.thefade.attributeArray.order": order
        });
    }
    return actor;
}

function attributeUpdate(keys, results, order) {
    return Object.fromEntries(keys.map((key, slot) => [`system.attributes.${key}.value`, results[order[slot]].value]));
}

/**
 * Ask which rolled result goes to each attribute. Selecting a result already
 * used elsewhere swaps the two, so the choice is always a permutation.
 * @returns {Promise<number[]|null>}  Result index per attribute slot, or null if closed.
 */
async function assignAttributes(keys, results) {
    const content = await renderTemplate(ASSIGN_DIALOG, {
        results,
        slots: keys.map((key, index) => ({ key, index, label: attributeLabel(key) }))
    });
    return DialogV2.wait({
        window: { title: game.i18n.localize("THEFADE.Creation.assignTitle"), icon: "fa-solid fa-arrow-right-arrow-left" },
        classes: ["thefade"],
        position: { width: 380 },
        content,
        buttons: [{
            action: "assign", label: "THEFADE.Creation.assign", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => {
                const order = keys.map(key => Number(button.form.elements[key].value));
                const valid = order.every(i => Number.isInteger(i) && results[i]) && new Set(order).size === keys.length;
                return valid ? order : null;
            }
        }],
        render: (event, dialog) => {
            const selects = [...dialog.element.querySelectorAll("select[data-slot]")];
            for (const select of selects) {
                select.dataset.previous = select.value;
                select.addEventListener("change", () => {
                    const clash = selects.find(other => other !== select && other.value === select.value);
                    if (clash) {
                        clash.value = select.dataset.previous;
                        clash.dataset.previous = clash.value;
                    }
                    select.dataset.previous = select.value;
                });
            }
        },
        rejectClose: false
    });
}

/* -------------------------------------------- */
/*  Crossbreed heritage                         */
/* -------------------------------------------- */

function typeLabel(code) {
    return localizeOr(`THEFADE.Heritage.types.${code}`, CROSSBREED_TYPES[code] ?? code);
}

function outcomeLabel(outcome) {
    return localizeOr(`THEFADE.Heritage.outcomes.${outcome.key}`, outcome.label);
}

function mutationRollsLabel(outcome) {
    return localizeOr(`THEFADE.Heritage.mutationRolls.${outcome.key}`, outcome.standardMutationRolls);
}

/** Crossbreed outcome for a pair: Xenochildren use the better of either parent order. */
function resolveOutcome(motherType, fatherType, isXenochild) {
    return isXenochild ? getBestCrossbreedOutcome(motherType, fatherType) : getCrossbreedOutcome(motherType, fatherType);
}

/**
 * Open the heritage calculator: choose each parent's creature type (and, for
 * a Xenochild, the situational modifiers), then store the crossbreed outcome
 * on the actor and post it to chat.
 * @param {Actor} actor
 * @returns {Promise<ChatMessage|null>}
 */
export async function calculateHeritage(actor) {
    const heritage = actor.system.heritage ?? {};
    const stored = heritage.xenochildModifiers ?? {};
    const content = await renderTemplate(HERITAGE_DIALOG, {
        types: Object.keys(CROSSBREED_TYPES).map(code => ({ code, label: typeLabel(code) })),
        motherType: heritage.motherType ?? "",
        fatherType: heritage.fatherType ?? "",
        isXenochild: !!actor.system.personalDetails?.xenochild,
        modifiers: Object.entries(XENOCHILD_MODIFIERS).map(([key, entry]) => ({
            key, rolls: entry.rolls, checked: !!stored[key],
            label: localizeOr(`THEFADE.Heritage.modifiers.${key}`, entry.label)
        })),
        additionalParents: stored.additionalParents ?? 0
    });

    const readForm = form => {
        const f = form.elements;
        return {
            motherType: f.motherType.value,
            fatherType: f.fatherType.value,
            isXenochild: f.isXenochild.checked,
            xenochildModifiers: {
                ...Object.fromEntries(Object.keys(XENOCHILD_MODIFIERS).map(key => [key, !!f[key]?.checked])),
                additionalParents: Math.max(0, Math.floor(Number(f.additionalParents.value) || 0))
            }
        };
    };

    const choice = await DialogV2.wait({
        window: { title: game.i18n.localize("THEFADE.Heritage.title"), icon: "fa-solid fa-dna" },
        classes: ["thefade"],
        position: { width: 440 },
        content,
        buttons: [{
            action: "calculate", label: "THEFADE.Heritage.calculate", icon: "fa-solid fa-dna", default: true,
            callback: (event, button) => readForm(button.form)
        }],
        render: (event, dialog) => {
            const form = dialog.element.querySelector("form");
            const preview = form.querySelector("[data-preview]");
            const refresh = () => {
                const data = readForm(form);
                form.querySelector("[data-xenochild-modifiers]").hidden = !data.isXenochild;
                if (!data.motherType || !data.fatherType) {
                    preview.textContent = "";
                    return;
                }
                const outcome = resolveOutcome(data.motherType, data.fatherType, data.isXenochild);
                preview.textContent = game.i18n.format("THEFADE.Heritage.preview", { outcome: outcomeLabel(outcome) });
            };
            form.addEventListener("change", refresh);
            refresh();
        },
        rejectClose: false
    });
    if (!choice) return null;
    const { motherType, fatherType, isXenochild, xenochildModifiers } = choice;
    if (!motherType || !fatherType) {
        ui.notifications.warn("THEFADE.Heritage.needTypes", { localize: true });
        return null;
    }

    const outcome = resolveOutcome(motherType, fatherType, isXenochild);
    const xenochild = calculateXenochildRolls(outcome.code, xenochildModifiers);
    const label = outcomeLabel(outcome);
    const mutationRolls = mutationRollsLabel(outcome);
    await actor.update({
        "system.personalDetails.xenochild": isXenochild,
        "system.heritage.motherType": motherType,
        "system.heritage.fatherType": fatherType,
        "system.heritage.outcome": outcome.key,
        "system.heritage.outcomeLabel": label,
        "system.heritage.characteristicChanges": outcome.characteristicChanges,
        "system.heritage.standardMutationRolls": mutationRolls,
        "system.heritage.isXenochild": isXenochild,
        "system.heritage.xenochildModifiers": xenochildModifiers,
        "system.heritage.xenochildRolls": isXenochild ? xenochild.total : 0
    });

    let details;
    if (!isXenochild) details = game.i18n.format("THEFADE.Heritage.naturalDetails", { changes: outcome.characteristicChanges, rolls: mutationRolls });
    else if (xenochild.bonus) details = game.i18n.format("THEFADE.Heritage.xenochildDetailsBonus", { total: xenochild.total, base: xenochild.base, bonus: xenochild.bonus });
    else details = game.i18n.format("THEFADE.Heritage.xenochildDetails", { total: xenochild.total, base: xenochild.base });

    return postCard(actor, HERITAGE_CARD, {
        actorName: actor.name,
        parents: game.i18n.format("THEFADE.Heritage.parents", { mother: typeLabel(motherType), father: typeLabel(fatherType) }),
        outcome: label,
        details,
        breakdown: isXenochild ? xenochild.breakdown.map(entry => ({
            label: entry.key === "additionalParents"
                ? game.i18n.format("THEFADE.Heritage.additionalSources", { count: xenochildModifiers.additionalParents })
                : localizeOr(`THEFADE.Heritage.modifiers.${entry.key}`, entry.label),
            rolls: entry.rolls
        })) : []
    }, { flags: { heritage: { outcome: outcome.code, xenochild: isXenochild, xenochildRolls: isXenochild ? xenochild.total : 0 } } });
}

/* -------------------------------------------- */
/*  Mutations                                   */
/* -------------------------------------------- */

/**
 * Roll d100 on a mutation table, add the result to the actor as a mutation
 * item, and post it to chat.
 * @param {Actor} actor
 * @param {string} [severity="minor"]  A key of MUTATION_SEVERITIES.
 * @returns {Promise<Item|null>}  The created mutation.
 */
export async function rollMutationForActor(actor, severity = "minor") {
    if (!(severity in MUTATION_SEVERITIES)) {
        ui.notifications.warn("THEFADE.Mutation.unknownSeverity", { format: { severity } });
        return null;
    }
    try {
        const roll = await new Roll("1d100").evaluate();
        const rolled = await rollMutation(severity, roll.total);
        const { result } = rolled;
        const severityLabel = localizeOr(`THEFADE.Mutation.severities.${severity}`, rolled.label);
        const [item] = await actor.createEmbeddedDocuments("Item", [{
            name: result.name,
            type: "mutation",
            img: "icons/svg/biohazard.svg",
            system: {
                severity,
                rollRange: result.roll,
                effect: result.description,
                description: `<p>${escapeHTML(result.description)}</p>`,
                source: game.i18n.format("THEFADE.Mutation.source", { page: result.sourcePage })
            },
            flags: { thefade: { mutationTableId: result.id, mutationRoll: rolled.roll } }
        }]);
        await postCard(actor, MUTATION_CARD, {
            title: game.i18n.format("THEFADE.Mutation.cardTitle", { severity: severityLabel }),
            actorName: actor.name,
            roll: rolled.roll,
            range: result.roll,
            name: result.name,
            description: result.description,
            added: game.i18n.format("THEFADE.Mutation.added", { name: actor.name })
        }, { rolls: [roll], flags: { mutation: { severity, roll: rolled.roll, tableId: result.id, itemUuid: item?.uuid ?? null } } });
        return item ?? null;
    } catch (error) {
        console.error("The Fade | Mutation roll failed", error);
        ui.notifications.error("THEFADE.Mutation.failed", { format: { error: error.message } });
        return null;
    }
}
