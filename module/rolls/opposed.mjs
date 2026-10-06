// Opposed rolls and Aid Another (Core p. 150). In an opposed roll both sides
// roll their pools and the side with more successes wins; a tie goes to the
// opponent (defender). Aid Another: a helper with the skill at Learned or
// better rolls it at DT 1; on a success the ally gains +1D on their check.
import FadeRoll from "../dice/fade-roll.mjs";
import { calculateSkillDice, getAllSkills, getRankValue, getSkillByKey } from "../rules/skills.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

const OPPOSED_DIALOG = "systems/thefade/templates/dialogs/opposed-roll.hbs";
const OPPOSED_CARD = "systems/thefade/templates/chat/opposed-card.hbs";
const AID_DIALOG = "systems/thefade/templates/dialogs/aid-another.hbs";

/** Aid Another is rolled at DT 1 and needs the skill at Learned or better. */
const AID_DT = 1;
const AID_MIN_RANK = "learned";

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** "Sword (Adept)"; the rank is hidden from users who can't observe the actor. */
function skillLabel(actor, skill) {
    if (!actor.testUserPermission(game.user, "OBSERVER")) return skill.name;
    const rank = game.i18n.localize(CONFIG.THEFADE.skillRanks[skill.rank]?.label ?? skill.rank);
    return `${skill.name} (${rank})`;
}

/** Skill choices for an actor, sorted by name, optionally limited to a minimum rank. */
function skillOptions(actor, { minRank = null } = {}) {
    return getAllSkills(actor)
        .filter(skill => skill && (!minRank || getRankValue(skill.rank) >= getRankValue(minRank)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(skill => ({ value: skill.key, label: skillLabel(actor, skill) }));
}

function attributeOptions() {
    return CONFIG.THEFADE.attributeKeys.map(key => ({ value: key, label: game.i18n.localize(CONFIG.THEFADE.attributes[key].label) }));
}

function rollModeOptions() {
    const current = game.settings.get("core", "rollMode");
    return Object.entries(CONFIG.Dice.rollModes).map(([value, mode]) => ({
        value, label: game.i18n.localize(mode.label ?? mode), selected: value === current
    }));
}

/**
 * Everyone else who can take part: one entry per actor with a token on the
 * current scene (GM-hidden tokens only for the GM), or, with no tokens, every
 * world actor the user can see. Actors without attributes (parties, shops)
 * are skipped. Unlinked tokens keep their own synthetic actor.
 * @param {Actor} actor  The actor opening the dialog (excluded).
 * @returns {{uuid: string, name: string, actor: Actor}[]}
 */
function otherParticipants(actor) {
    const entries = new Map();
    const add = (other, name) => {
        if (!other?.system?.attributes || other.uuid === actor.uuid || entries.has(other.uuid)) return;
        entries.set(other.uuid, { uuid: other.uuid, name, actor: other });
    };
    if (canvas?.ready) {
        for (const token of canvas.tokens.placeables) {
            if (!token.document.hidden || game.user.isGM) add(token.actor, token.name);
        }
    }
    if (!entries.size) {
        for (const other of game.actors) if (other.visible) add(other, other.name);
    }
    return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The uuid of the user's first targeted actor other than `actor`, if any. */
function targetedUuid(actor) {
    return [...game.user.targets].map(token => token.actor).find(other => other && other.uuid !== actor.uuid)?.uuid ?? "";
}

function signed(value) {
    return `${value > 0 ? "+" : ""}${value}`;
}

/**
 * Roll one side: a skill (if chosen) or a bare attribute, with the actor's
 * condition modifiers and any extra dice. An Infirm pool fails automatically.
 * @param {Actor} actor
 * @param {object} options
 * @param {string} [options.skillKey]
 * @param {string} [options.attribute]
 * @param {number} [options.extraDice=0]
 * @param {number|null} [options.dt=null]
 * @returns {Promise<FadeRoll>}
 */
async function rollSide(actor, { skillKey = "", attribute = "physique", extraDice = 0, dt = null } = {}) {
    const skill = skillKey ? getSkillByKey(actor, skillKey) : null;
    let dice, label, context, infirm;
    if (skill) {
        dice = calculateSkillDice(actor, skill);
        label = skillLabel(actor, skill);
        context = { kind: "skill", skillName: skill.name, skillCategory: skill.category, attributeName: skill.attribute };
        infirm = dice === 0;
    } else {
        const data = actor.system.attributes?.[attribute];
        dice = Number(data?.total) || 0;
        label = game.i18n.localize(CONFIG.THEFADE.attributes[attribute]?.label ?? attribute);
        context = { kind: "attribute", attributeName: attribute };
        infirm = data?.infirm ?? dice <= 0;
    }

    const mods = actor.getConditionRollModifiers?.(context) ?? { bonusDice: 0, penaltyDice: 0, notes: [], autoFail: false };
    const notes = [...mods.notes];
    if (mods.bonusDice) notes.unshift(game.i18n.format("THEFADE.Roll.conditionBonus", { dice: mods.bonusDice }));
    if (mods.penaltyDice) notes.unshift(game.i18n.format("THEFADE.Roll.conditionPenalty", { dice: mods.penaltyDice }));
    if (infirm) notes.unshift(game.i18n.localize("THEFADE.Roll.infirm"));
    if (extraDice) notes.push(game.i18n.format("THEFADE.Roll.extraDice", { dice: signed(extraDice) }));

    const autoFail = infirm || !!mods.autoFail;
    const pool = autoFail ? 0 : Math.max(1, dice + mods.bonusDice - mods.penaltyDice + extraDice);
    const roll = FadeRoll.pool(pool, { dt, label, notes, autoFail });
    await roll.evaluate();
    return roll;
}

/* -------------------------------------------- */
/*  Opposed roll                                */
/* -------------------------------------------- */

/**
 * Open the opposed-roll dialog for an actor, roll both sides, and post one
 * card comparing them. More successes wins; ties go to the opponent.
 * @param {Actor} actor  The initiating actor.
 * @returns {Promise<ChatMessage|null>}
 */
export async function openOpposedRollDialog(actor) {
    const participants = otherParticipants(actor);
    if (!participants.length) {
        ui.notifications.warn("THEFADE.Opposed.noActors", { localize: true });
        return null;
    }
    const preselect = targetedUuid(actor);
    const content = await renderTemplate(OPPOSED_DIALOG, {
        actorName: actor.name,
        selfSkills: skillOptions(actor),
        attributes: attributeOptions(),
        participants: participants.map(p => ({ uuid: p.uuid, name: p.name, selected: p.uuid === preselect })),
        rollModes: rollModeOptions()
    });

    const choice = await DialogV2.wait({
        window: { title: game.i18n.localize("THEFADE.Opposed.title"), icon: "fa-solid fa-people-arrows" },
        classes: ["thefade", "thefade-roll-dialog"],
        position: { width: 440 },
        content,
        buttons: [{
            action: "roll", label: "THEFADE.Roll.roll", icon: "fa-solid fa-dice-d20", default: true,
            callback: (event, button) => {
                const f = button.form.elements;
                return {
                    self: { skillKey: f.selfSkill.value, attribute: f.selfAttribute.value, extraDice: Math.trunc(Number(f.selfExtra.value) || 0) },
                    opponentUuid: f.opponent.value,
                    opponent: { skillKey: f.opponentSkill.value, attribute: f.opponentAttribute.value, extraDice: Math.trunc(Number(f.opponentExtra.value) || 0) },
                    rollMode: f.rollMode.value
                };
            }
        }],
        render: (event, dialog) => {
            const form = dialog.element.querySelector("form");
            const f = form.elements;
            // The attribute only matters when no skill is picked.
            const syncAttribute = side => { f[`${side}Attribute`].disabled = !!f[`${side}Skill`].value; };
            const fillOpponentSkills = () => {
                const other = participants.find(p => p.uuid === f.opponent.value)?.actor;
                const options = other ? skillOptions(other) : [];
                f.opponentSkill.replaceChildren(
                    new Option(game.i18n.localize("THEFADE.Opposed.attributeOnly"), ""),
                    ...options.map(o => new Option(o.label, o.value))
                );
                syncAttribute("opponent");
            };
            f.opponent.addEventListener("change", fillOpponentSkills);
            f.selfSkill.addEventListener("change", () => syncAttribute("self"));
            f.opponentSkill.addEventListener("change", () => syncAttribute("opponent"));
            fillOpponentSkills();
            syncAttribute("self");
        },
        rejectClose: false
    });
    if (!choice) return null;

    const opponent = participants.find(p => p.uuid === choice.opponentUuid);
    if (!opponent) {
        ui.notifications.warn("THEFADE.Opposed.notFound", { localize: true });
        return null;
    }

    const initiatorRoll = await rollSide(actor, choice.self);
    const opponentRoll = await rollSide(opponent.actor, choice.opponent);
    const mine = initiatorRoll.successes;
    const theirs = opponentRoll.successes;
    const winner = mine > theirs ? "initiator" : theirs > mine ? "opponent" : "tie";
    const outcome = {
        initiator: { cls: "success", text: game.i18n.format("THEFADE.Opposed.wins", { name: actor.name }) },
        opponent: { cls: "failure", text: game.i18n.format("THEFADE.Opposed.wins", { name: opponent.name }) },
        tie: { cls: "failure", text: game.i18n.format("THEFADE.Opposed.tie", { name: opponent.name }) }
    }[winner];

    const side = (name, roll, won) => ({
        name, won,
        label: roll.options.label,
        poolSize: roll.poolSize,
        faces: roll.faces,
        successes: roll.successes,
        autoFail: !!roll.options.autoFail,
        notes: roll.options.notes ?? []
    });
    const content2 = await renderTemplate(OPPOSED_CARD, {
        initiatorName: actor.name,
        opponentName: opponent.name,
        sides: [side(actor.name, initiatorRoll, winner === "initiator"), side(opponent.name, opponentRoll, winner !== "initiator")],
        outcome
    });
    const data = {
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        content: content2,
        rolls: [initiatorRoll, opponentRoll],
        flags: {
            thefade: {
                opposed: {
                    initiatorUuid: actor.uuid, opponentUuid: opponent.uuid,
                    initiatorSuccesses: mine, opponentSuccesses: theirs, winner
                }
            }
        }
    };
    ChatMessage.implementation.applyRollMode(data, choice.rollMode);
    return ChatMessage.implementation.create(data);
}

/* -------------------------------------------- */
/*  Aid Another                                 */
/* -------------------------------------------- */

/**
 * Open the Aid Another dialog: pick an ally and a skill the actor has at
 * Learned or better, roll it at DT 1, and post the result (a success grants
 * the ally +1D on their check with that skill).
 * @param {Actor} actor  The helping actor.
 * @returns {Promise<ChatMessage|null>}
 */
export async function openAidAnotherDialog(actor) {
    const participants = otherParticipants(actor);
    if (!participants.length) {
        ui.notifications.warn("THEFADE.Aid.noActors", { localize: true });
        return null;
    }
    const skills = skillOptions(actor, { minRank: AID_MIN_RANK });
    if (!skills.length) {
        ui.notifications.warn("THEFADE.Aid.noSkills", { format: { name: actor.name } });
        return null;
    }
    const preselect = targetedUuid(actor);
    const content = await renderTemplate(AID_DIALOG, {
        dt: AID_DT,
        skills,
        participants: participants.map(p => ({ uuid: p.uuid, name: p.name, selected: p.uuid === preselect })),
        rollModes: rollModeOptions()
    });

    const choice = await DialogV2.wait({
        window: { title: game.i18n.localize("THEFADE.Aid.title"), icon: "fa-solid fa-hands-helping" },
        classes: ["thefade", "thefade-roll-dialog"],
        position: { width: 420 },
        content,
        buttons: [{
            action: "roll", label: "THEFADE.Aid.roll", icon: "fa-solid fa-hands-helping", default: true,
            callback: (event, button) => {
                const f = button.form.elements;
                return {
                    allyUuid: f.ally.value,
                    skillKey: f.skill.value,
                    extraDice: Math.trunc(Number(f.extraDice.value) || 0),
                    rollMode: f.rollMode.value
                };
            }
        }],
        rejectClose: false
    });
    if (!choice) return null;

    const ally = participants.find(p => p.uuid === choice.allyUuid);
    if (!ally) {
        ui.notifications.warn("THEFADE.Aid.notFound", { localize: true });
        return null;
    }
    const skill = getSkillByKey(actor, choice.skillKey);
    if (!skill || getRankValue(skill.rank) < getRankValue(AID_MIN_RANK)) {
        const rank = game.i18n.localize(CONFIG.THEFADE.skillRanks[skill?.rank]?.label ?? "THEFADE.Rank.untrained");
        ui.notifications.warn("THEFADE.Aid.requiresRank", { format: { rank } });
        return null;
    }

    const roll = await rollSide(actor, { skillKey: skill.key, extraDice: choice.extraDice, dt: AID_DT });
    roll.options.notes.push(roll.isSuccess
        ? game.i18n.format("THEFADE.Aid.success", { ally: ally.name, skill: skill.name })
        : game.i18n.localize("THEFADE.Aid.failure"));
    const escape = foundry.utils.escapeHTML;
    return roll.toMessage({
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        flavor: game.i18n.format("THEFADE.Aid.flavor", { helper: escape(actor.name), ally: escape(ally.name), skill: escape(skill.name) }),
        flags: { thefade: { aid: { allyUuid: ally.uuid, skill: skill.key, dt: AID_DT, success: !!roll.isSuccess } } }
    }, { rollMode: choice.rollMode });
}
