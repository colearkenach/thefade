// Aura Ignition (Core Rulebook pp. 369–371; Aura Rules table p. 373).
//
// Igniting costs a Minor Action and extends the initiator's aura to its
// Intensity radius (Faint 3 hex, Moderate 2, Intense 1). Allies inside the
// radius may join: a free action on their turn, a Reaction outside it. While
// active, everyone in the Ignition gets +1D to attack rolls and the
// initiator's aura skill bonuses (Color + Shape skills at the Intensity's
// dice), and any participant may perform each Ignition Action once (spent for
// everyone). It lasts 1 minute (10 rounds, Core p. 163) per participant, up
// to the initiator's Total Level in minutes; afterwards everyone who took
// part recovers for 1 hour per ally who joined.
//
// The character data model has no ignition field, so state lives in actor
// flags (flags.thefade.ignition): the initiator holds the full state, each
// ally a pointer back to it. The public card mirrors the state in its own
// message flags. Writes that touch documents the user doesn't own (other
// participants, the initiator's card) run on the active GM via socket.mjs.
import { registerGMHandler, requestGM } from "../socket.mjs";

const { DialogV2 } = foundry.applications.api;

const SCOPE = "thefade";
const KEY = "ignition";
const FLAG_PATH = `flags.${SCOPE}.==${KEY}`;
const TEMPLATE = "systems/thefade/templates/chat/ignition.hbs";
const ACTOR_TYPES = new Set(["character", "npc"]);
const END_REASONS = new Set(["ended", "expired", "flare"]);
const MINUTE = 60;
const HOUR = 3600;
const ROUND_SECONDS = 6;
const EPSILON = 0.001;

/** Aura Intensity → Ignition radius (hexes) and aura skill bonus dice (Core p. 373). */
export const IGNITION_INTENSITY = Object.freeze({
    faint: { radius: 3, dice: 1 },
    moderate: { radius: 2, dice: 2 },
    intense: { radius: 1, dice: 3 }
});

/** Radius in hexes by Aura Intensity. */
export const IGNITION_INTENSITY_RADIUS = Object.freeze(
    Object.fromEntries(Object.entries(IGNITION_INTENSITY).map(([key, tier]) => [key, tier.radius]))
);

/** Aura Color → skill bonus (Core p. 373). */
export const AURA_COLOR_SKILLS = Object.freeze({
    red: "Athletics", blue: "Medicine", green: "Herbalism", yellow: "Research", purple: "Arcana",
    orange: "Etiquette", pink: "Seduction", gold: "Gambling", silver: "Symbology", turquoise: "Sight",
    indigo: "Ritual", brown: "Linguistics", violet: "Insight", gray: "Intimidate", black: "Toxicology",
    white: "Lore (Religion)"
});

/** Aura Shape → secondary skill bonus (Core p. 373). */
export const AURA_SHAPE_SKILLS = Object.freeze({
    circular: "Etiquette", jagged: "Trickery", flowing: "Persuasion", spiky: "Lockpicking",
    radiant: "Deception", dense: "Medicine", wispy: "Sneaking", geometric: "Research"
});

/**
 * Ignition Actions (Core p. 371). Keys match the v1 module so spent actions
 * in existing worlds carry over.
 *  - allies:    other participants the performer designates (up to)
 *  - minor:     costs a Minor Action
 *  - heal:      healing rolled once and applied to everyone in the Ignition
 *  - damagePer: bonus damage per participant (performer included)
 *  - ends:      performing it ends the Ignition for everyone
 */
export const IGNITION_ACTIONS = Object.freeze({
    "shared-surge": { i18n: "sharedSurge", allies: 1, minor: true },
    "interlinked-defense": { i18n: "interlinkedDefense", allies: 2 },
    "echoed-strikes": { i18n: "echoedStrikes" },
    "harmonic-flow": { i18n: "harmonicFlow" },
    "resonant-healing": { i18n: "resonantHealing", minor: true, heal: "2d12" },
    "combat-unity": { i18n: "combatUnity", minor: true },
    "flare-of-purpose": { i18n: "flareOfPurpose", damagePer: 15, ends: true }
});

const AURA_COLOR_HEX = {
    red: 0xff4040, blue: 0x4080ff, green: 0x40c060, yellow: 0xffe040,
    purple: 0x9040ff, orange: 0xff8040, pink: 0xff80c0, gold: 0xffd040,
    silver: 0xc0c0d0, turquoise: 0x40e0d0, indigo: 0x4040ff, brown: 0x8b5a2b,
    violet: 0x8a2be2, gray: 0x808080, black: 0x303030, white: 0xf0f0f0
};
const DEFAULT_AURA_HEX = 0xff8040;

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** Localize (or format, when `data` is given) a THEFADE.Ignition key. */
function t(key, data) {
    const path = `THEFADE.Ignition.${key}`;
    return data ? game.i18n.format(path, data) : game.i18n.localize(path);
}

const fail = (key, data) => new Error(t(key, data));

function warn(key, data) {
    ui.notifications.warn(t(key, data));
    return null;
}

function intensityLabel(key) {
    return IGNITION_INTENSITY[key] ? t(`intensity.${key}`) : "";
}

function actionLabel(key) {
    const action = IGNITION_ACTIONS[key];
    return action ? t(`action.${action.i18n}.label`) : key;
}

function actionHint(key) {
    const action = IGNITION_ACTIONS[key];
    return action ? t(`action.${action.i18n}.hint`) : "";
}

/** The raw Ignition flag on an actor, or null. */
export function getIgnitionState(actor) {
    return actor?.getFlag?.(SCOPE, KEY) ?? null;
}

/** A mutable copy of an initiator's state, with gaps in v1-era flags filled. */
function cloneState(state) {
    const s = foundry.utils.deepClone(state);
    s.participants ??= [];
    s.spentActions ??= [];
    s.actionLog ??= [];
    s.tokenUuid ??= s.participants[0]?.tokenUuid ?? "";
    s.initiatorName ??= s.participants[0]?.name ?? "";
    s.aura ??= {};
    s.maxMinutes ??= Math.max(1, Number(s.maxParticipants) || 1);
    s.combatId ??= "";
    s.startRound ??= null;
    return s;
}

/** Ignition duration: 1 minute per participant, max = initiator's Total Level. */
function durationFor(state) {
    return Math.min(state.participants.length, state.maxMinutes) * MINUTE;
}

function totalLevel(actor) {
    return Math.max(1, Number(actor.system?.level) || 1);
}

/** Seconds of Ignition recovery an actor still has to wait. */
function recoveryRemaining(actor) {
    const state = getIgnitionState(actor);
    if (!state || state.active) return 0;
    return Math.max(0, (Number(state.recoveryUntil) || 0) - game.time.worldTime);
}

/** Has an active Ignition run out (combat rounds while its combat lasts, else world time)? */
function isExpired(state) {
    const combat = state.combatId ? game.combats.get(state.combatId) : null;
    if (combat?.started && Number.isFinite(state.startRound)) {
        return (Number(combat.round) || 0) >= state.startRound + Math.ceil((state.durationSec || 0) / ROUND_SECONDS);
    }
    return (Number(state.startedAt) || 0) + (Number(state.durationSec) || 0) <= game.time.worldTime;
}

/** Hexes between two token documents on the same scene (center to center). */
function hexesBetween(a, b) {
    const grid = a.parent?.grid ?? canvas?.grid;
    if (!grid) return Infinity;
    const p = a.getCenterPoint();
    const q = b.getCenterPoint();
    const path = grid.measurePath([{ x: p.x, y: p.y }, { x: q.x, y: q.y }]);
    return grid.isGridless ? path.distance / (grid.distance || 1) : path.spaces;
}

/** The token representing an actor on a scene. */
function sceneTokenFor(scene, actor) {
    if (!scene || !actor) return null;
    if (actor.isToken) return actor.token?.parent === scene ? actor.token : null;
    return scene.tokens.find(token => token.actorLink && token.actorId === actor.id) ?? null;
}

/** The initiator's token on the viewed scene, preferring a controlled one. */
function activeTokenFor(actor) {
    if (!canvas?.ready) return null;
    const tokens = actor.getActiveTokens();
    return (tokens.find(token => token.controlled) ?? tokens[0])?.document ?? null;
}

/** Owners of an actor plus every GM (invite recipients). */
function ownerIds(actor) {
    return game.users.filter(user => user.isGM || actor.testUserPermission(user, "OWNER")).map(user => user.id);
}

async function participantActors(state) {
    const actors = await Promise.all(state.participants.map(p => fromUuid(p.actorUuid)));
    return actors.filter(Boolean);
}

function cardMessage(state) {
    return state.cardId ? game.messages.get(state.cardId) ?? null : null;
}

/** Aura skill bonuses: Color skill and Shape skill at the Intensity's dice; a shared skill only gains +1D (Core p. 373). */
export function getAuraSkillBonuses({ color, shape, intensity } = {}) {
    const dice = IGNITION_INTENSITY[intensity]?.dice ?? 0;
    if (!dice) return [];
    const bonuses = [];
    const colorSkill = AURA_COLOR_SKILLS[color];
    const shapeSkill = AURA_SHAPE_SKILLS[shape];
    if (colorSkill) bonuses.push({ skill: colorSkill, dice });
    if (shapeSkill === colorSkill && colorSkill) bonuses[0].dice += 1;
    else if (shapeSkill) bonuses.push({ skill: shapeSkill, dice });
    return bonuses;
}

/**
 * Replace an actor's Ignition entry in its temporary bonuses. The entry is
 * dropped when `state` is inactive or the ally is outside the radius.
 */
function bonusUpdate(actor, state, inRange = true) {
    const current = actor._source.system?.temporaryBonuses;
    if (!Array.isArray(current)) return {};
    const kept = current.filter(entry => entry.key !== KEY);
    if (state?.active && inRange) {
        kept.push({
            id: foundry.utils.randomID(16),
            key: KEY,
            source: t("title"),
            ability: t("bonusLabel", { name: state.initiatorName }),
            bonuses: [
                { type: "attack", target: "", value: 1 },
                ...getAuraSkillBonuses({ ...state.aura, intensity: state.intensity }).map(b => ({ type: "skill", target: b.skill, value: b.dice }))
            ],
            durationRounds: Math.max(1, Math.ceil(state.durationSec / ROUND_SECONDS)),
            // Time-based so the bonus survives the end of a combat; the Ignition's own end removes it.
            combatId: "",
            startRound: null,
            expiresRound: null,
            expiresAt: state.startedAt + state.durationSec
        });
    }
    return { "system.temporaryBonuses": kept };
}

/** The flag an ally carries while in someone else's Ignition. */
function allyFlag(state) {
    return {
        active: true,
        role: "participant",
        initiatorUuid: state.initiatorUuid,
        initiatorName: state.initiatorName,
        cardId: state.cardId,
        intensity: state.intensity,
        radius: state.radius,
        participantCount: state.participants.length,
        startedAt: state.startedAt,
        durationSec: state.durationSec,
        combatId: state.combatId,
        startRound: state.startRound,
        recoveryUntil: 0
    };
}

function postNote(actor, text, icon = "fa-fire") {
    return ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        content: `<div class="thefade chat-note ignition"><p><i class="fa-solid ${icon}"></i> ${foundry.utils.escapeHTML(text)}</p></div>`
    });
}

/* -------------------------------------------- */
/*  Rendering                                   */
/* -------------------------------------------- */

function render(context) {
    return foundry.applications.handlebars.renderTemplate(TEMPLATE, context);
}

function effectLines(state) {
    return [
        t("effectAttack"),
        ...getAuraSkillBonuses({ ...state.aura, intensity: state.intensity }).map(b => t("effectSkill", { dice: b.dice, skill: b.skill })),
        t("effectSense")
    ];
}

function endedLine(state) {
    const reason = t(`reason.${END_REASONS.has(state.endedReason) ? state.endedReason : "ended"}`);
    const hours = Math.max(0, state.participants.length - 1);
    return hours ? t("endedLine", { reason, hours }) : t("endedNoRecovery", { reason });
}

function renderCard(state) {
    return render({
        isCard: true,
        active: state.active,
        img: state.img || "icons/svg/fire.svg",
        subtitle: t("subtitle", { name: state.initiatorName, intensity: intensityLabel(state.intensity), radius: state.radius }),
        minutes: Math.round(state.durationSec / MINUTE),
        maxMinutes: state.maxMinutes,
        participants: state.participants.map(p => ({ name: p.name, isInitiator: p.role === "initiator", outOfRange: p.inRange === false })),
        effects: effectLines(state),
        actions: Object.keys(IGNITION_ACTIONS).map(key => ({
            key, label: actionLabel(key), hint: actionHint(key), spent: state.spentActions.includes(key)
        })),
        log: state.actionLog.map(entry => ({ label: actionLabel(entry.key), performer: entry.performer, targets: (entry.targets ?? []).join(", ") })),
        endedLine: state.active ? "" : endedLine(state)
    });
}

function renderInvite(invite) {
    return render({
        isInvite: true,
        img: invite.img || "icons/svg/fire.svg",
        subtitle: t("inviteLine", { initiator: invite.initiatorName, ally: invite.allyName }),
        meta: t("subtitleShort", { intensity: intensityLabel(invite.intensity), radius: invite.radius }),
        pending: invite.status === "pending",
        accepted: invite.status === "accepted"
    });
}

/** Re-render the public card from the initiator's state. */
async function syncCard(state) {
    const message = cardMessage(state);
    if (!message) return;
    await message.update({ content: await renderCard(state), [FLAG_PATH]: { kind: "card", ...state } });
}

async function setInviteStatus(message, status) {
    const invite = message?.getFlag(SCOPE, KEY);
    if (invite?.kind !== "invite") return;
    const next = { ...invite, status };
    await message.update({ content: await renderInvite(next), [FLAG_PATH]: next });
}

/* -------------------------------------------- */
/*  Privileged operations                       */
/* -------------------------------------------- */

/** Load an initiator and a mutable copy of its live state, or throw. */
async function liveIgnition(initiatorUuid) {
    const initiator = await fromUuid(initiatorUuid);
    const state = getIgnitionState(initiator);
    if (!state?.active || state.role !== "initiator") throw fail("notActive");
    return { initiator, state: cloneState(state) };
}

/** Write the initiator's state, every ally's flag and bonus, and the card. */
async function commit(initiator, state) {
    await initiator.update({ [FLAG_PATH]: state, ...bonusUpdate(initiator, state) });
    for (const p of state.participants) {
        if (p.actorUuid === initiator.uuid) continue;
        const actor = await fromUuid(p.actorUuid);
        if (actor) await actor.update({ [FLAG_PATH]: allyFlag(state), ...bonusUpdate(actor, state, p.inRange !== false) });
    }
    await syncCard(state);
}

/** End an Ignition for everyone: recovery of 1 hour per ally who joined (Core p. 370). */
async function finishIgnition(initiator, state, reason = "ended") {
    const now = game.time.worldTime;
    const hours = Math.max(0, state.participants.length - 1);
    Object.assign(state, { active: false, endedAt: now, endedReason: reason, recoveryUntil: now + hours * HOUR });
    const ended = role => ({ active: false, role, initiatorUuid: state.initiatorUuid, recoveryUntil: state.recoveryUntil, endedAt: now });
    await initiator.update({ [FLAG_PATH]: ended("initiator"), ...bonusUpdate(initiator, null) });
    for (const p of state.participants) {
        if (p.actorUuid === initiator.uuid) continue;
        const actor = await fromUuid(p.actorUuid);
        if (actor) await actor.update({ [FLAG_PATH]: ended("participant"), ...bonusUpdate(actor, null) });
    }
    await syncCard(state);
    const reasonLabel = t(`reason.${reason}`);
    await postNote(initiator, hours
        ? t("endedNote", { name: state.initiatorName, reason: reasonLabel, hours })
        : t("endedNoteNoRecovery", { name: state.initiatorName, reason: reasonLabel }), "fa-fire-extinguisher");
}

async function opJoin({ initiatorUuid, allyUuid, inviteId = null, force = false }, userId) {
    const user = game.users.get(userId);
    const { initiator, state } = await liveIgnition(initiatorUuid);
    const invite = inviteId ? game.messages.get(inviteId) : null;
    const inviteData = invite?.getFlag(SCOPE, KEY);
    if (inviteId && (inviteData?.kind !== "invite" || inviteData.allyUuid !== allyUuid || inviteData.cardId !== state.cardId)) throw fail("notActive");
    const ally = await fromUuid(allyUuid);
    if (!ally?.system) throw fail("notActive");
    if (!ally.testUserPermission(user, "OWNER")) throw fail("notOwner", { name: ally.name });
    if (state.participants.some(p => p.actorUuid === ally.uuid)) throw fail("alreadyJoined", { name: ally.name });
    if (getIgnitionState(ally)?.active) throw fail("inAnother", { name: ally.name });
    const recovery = recoveryRemaining(ally);
    if (recovery && !(force && user.isGM)) throw fail("recovering", { name: ally.name, minutes: Math.ceil(recovery / MINUTE) });

    const initiatorToken = await fromUuid(state.tokenUuid);
    if (!initiatorToken) throw fail("noInitiatorToken");
    const allyToken = sceneTokenFor(initiatorToken.parent, ally);
    if (!allyToken) throw fail("noAllyToken", { name: ally.name });
    if (hexesBetween(initiatorToken, allyToken) > state.radius + EPSILON) throw fail("outOfRadius", { name: ally.name, radius: state.radius });

    state.participants.push({ actorUuid: ally.uuid, tokenUuid: allyToken.uuid, name: ally.name, role: "ally" });
    state.durationSec = durationFor(state);
    await commit(initiator, state);
    if (invite) await setInviteStatus(invite, "accepted");
    await postNote(ally, t("joinedNote", { ally: ally.name, initiator: state.initiatorName }));
    return true;
}

async function opSpend({ initiatorUuid, key, performerUuid, targetUuids = [] }, userId) {
    const user = game.users.get(userId);
    const { initiator, state } = await liveIgnition(initiatorUuid);
    const action = IGNITION_ACTIONS[key];
    if (!action) throw fail("unknownAction");
    if (state.spentActions.includes(key)) throw fail("actionSpent", { action: actionLabel(key) });
    if (state.participants.length < 2) throw fail("needAlly");
    const performer = state.participants.some(p => p.actorUuid === performerUuid) ? await fromUuid(performerUuid) : null;
    if (!performer) throw fail("notParticipant");
    if (!performer.testUserPermission(user, "OWNER")) throw fail("notOwner", { name: performer.name });
    const targets = state.participants
        .filter(p => p.actorUuid !== performerUuid && targetUuids.includes(p.actorUuid))
        .slice(0, action.allies ?? 0);
    if (action.allies && !targets.length) throw fail("needTargets");

    // Spend first so a second click can't use it twice.
    state.spentActions.push(key);
    state.actionLog.push({ key, performer: performer.name, targets: targets.map(p => p.name) });
    await initiator.update({ [FLAG_PATH]: state });
    await syncCard(state);

    const context = {
        isAction: true,
        img: performer.img,
        label: actionLabel(key),
        subtitle: targets.length ? t("performedOn", { name: performer.name, targets: targets.map(p => p.name).join(", ") }) : performer.name,
        hint: actionHint(key),
        minor: !!action.minor
    };
    const rolls = [];
    const record = { kind: "action", key, initiatorUuid, performerUuid, targetUuids: targets.map(p => p.actorUuid) };

    if (action.heal) {
        const roll = await new Roll(action.heal).evaluate();
        rolls.push(roll);
        const amount = roll.total;
        const rows = [];
        for (const actor of await participantActors(state)) {
            const hp = actor.system?.hp;
            if (!hp) continue;
            const from = Number(hp.value) || 0;
            const to = Math.max(from, Math.min(Number(hp.max) || from, from + amount));
            if (to !== from) await actor.update({ "system.hp.value": to });
            rows.push(t("healRow", { name: actor.name, from, to }));
        }
        context.healing = { amount, faces: roll.dice.flatMap(die => die.results.map(r => r.result)), rows };
        record.healing = amount;
    }
    if (action.damagePer) {
        const damage = action.damagePer * state.participants.length;
        context.flare = t("flareDamage", { damage, count: state.participants.length });
        record.damage = damage;
    }
    context.ends = !!action.ends;

    await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor: performer }),
        content: await render(context),
        rolls,
        flags: { [SCOPE]: { [KEY]: record } }
    });
    if (action.ends) await finishIgnition(initiator, state, "flare");
    return true;
}

async function opEnd({ initiatorUuid, reason = "ended" }, userId) {
    const user = game.users.get(userId);
    const { initiator, state } = await liveIgnition(initiatorUuid);
    if (!initiator.testUserPermission(user, "OWNER")) throw fail("onlyInitiator", { name: initiator.name });
    await finishIgnition(initiator, state, END_REASONS.has(reason) ? reason : "ended");
    return true;
}

async function opRespond({ messageId, status }, userId) {
    const user = game.users.get(userId);
    const message = game.messages.get(messageId);
    const invite = message?.getFlag(SCOPE, KEY);
    if (invite?.kind !== "invite" || invite.status !== "pending") return false;
    const ally = await fromUuid(invite.allyUuid);
    if (ally && !ally.testUserPermission(user, "OWNER")) throw fail("notOwner", { name: ally.name });
    await setInviteStatus(message, status === "accepted" ? "accepted" : "declined");
    return true;
}

// Ops run one at a time so two quick clicks can't both pass a check.
let queue = Promise.resolve();
function serial(fn) {
    return (...args) => {
        const run = queue.then(() => fn(...args));
        queue = run.catch(() => {});
        return run;
    };
}

/**
 * Allies outside the radius lose the Ignition's bonuses until they return
 * (designer ruling, 2026-10-06). The initiator always keeps them.
 */
async function opRange({ initiatorUuid }) {
    const { initiator, state } = await liveIgnition(initiatorUuid);
    const origin = (state.tokenUuid && await fromUuid(state.tokenUuid)) || activeTokenFor(initiator);
    if (!origin) return null;
    let changed = false;
    for (const p of state.participants) {
        if (p.actorUuid === initiator.uuid) continue;
        const actor = await fromUuid(p.actorUuid);
        if (!actor) continue;
        const token = sceneTokenFor(origin.parent, actor);
        const inRange = !!token && hexesBetween(origin, token) <= state.radius + EPSILON;
        if ((p.inRange !== false) === inRange) continue;
        p.inRange = inRange;
        changed = true;
        await actor.update(bonusUpdate(actor, state, inRange));
        await postNote(actor, t(inRange ? "backInRange" : "outOfRange", { name: actor.name, initiator: state.initiatorName }));
    }
    if (!changed) return null;
    await initiator.update({ [FLAG_PATH]: state });
    await syncCard(state);
    return state;
}

const OPS = {
    join: serial(opJoin),
    spend: serial(opSpend),
    end: serial(opEnd),
    respond: serial(opRespond),
    range: serial(opRange)
};

/**
 * Run an op here when this user can write every document it touches,
 * otherwise on the active GM. Errors become a warning; resolves null.
 */
async function perform(op, data, documents = []) {
    try {
        const local = game.user.isGM || documents.every(doc => !doc || doc.isOwner);
        return local ? await OPS[op](data, game.user.id) : await requestGM(`ignition.${op}`, data);
    } catch (err) {
        ui.notifications.warn(err.message);
        return null;
    }
}

/* -------------------------------------------- */
/*  Dialogs                                     */
/* -------------------------------------------- */

/** GMs may override recovery; players are told how long is left. */
async function checkRecovery(actor) {
    const remaining = recoveryRemaining(actor);
    if (!remaining) return { ok: true, force: false };
    const minutes = Math.ceil(remaining / MINUTE);
    if (!game.user.isGM) {
        warn("recovering", { name: actor.name, minutes });
        return { ok: false };
    }
    const ok = await DialogV2.confirm({
        window: { title: t("title"), icon: "fa-solid fa-fire" },
        classes: ["thefade"],
        content: `<p>${foundry.utils.escapeHTML(t("recoveringOverride", { name: actor.name, minutes }))}</p>`,
        rejectClose: false
    });
    return { ok: !!ok, force: !!ok };
}

/** Pick one actor from a list (no dialog when there is only one). */
async function pickActor(actors, prompt) {
    if (actors.length <= 1) return actors[0] ?? null;
    const options = actors.map((actor, i) => `<label class="checkbox"><input type="radio" name="choice" value="${i}" ${i === 0 ? "checked" : ""}> ${foundry.utils.escapeHTML(actor.name)}</label>`).join("");
    const index = await DialogV2.wait({
        window: { title: t("title"), icon: "fa-solid fa-fire" },
        classes: ["thefade"],
        position: { width: 340 },
        content: `<p>${foundry.utils.escapeHTML(prompt)}</p>${options}`,
        buttons: [{
            action: "ok", label: "THEFADE.Ignition.confirm", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => Number(button.form.elements.choice.value)
        }],
        rejectClose: false
    });
    return Number.isInteger(index) ? actors[index] ?? null : null;
}

/** Designate up to `count` other participants; resolves their UUIDs, or null if cancelled. */
async function pickTargets(actors, count, actionName) {
    if (!actors.length) return warn("noTargets");
    const type = count === 1 ? "radio" : "checkbox";
    const options = actors.map((actor, i) => `<label class="checkbox"><input type="${type}" name="target" value="${actor.uuid}" ${type === "radio" && i === 0 ? "checked" : ""}> ${foundry.utils.escapeHTML(actor.name)}</label>`).join("");
    const prompt = count === 1 ? t("chooseTarget") : t("chooseTargets", { count });
    const uuids = await DialogV2.wait({
        window: { title: actionName, icon: "fa-solid fa-fire" },
        classes: ["thefade"],
        position: { width: 340 },
        content: `<p>${foundry.utils.escapeHTML(prompt)}</p>${options}`,
        buttons: [{
            action: "ok", label: "THEFADE.Ignition.confirm", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => [...button.form.querySelectorAll("input[name=target]:checked")].map(input => input.value)
        }],
        render: (event, dialog) => {
            // Never more than `count` boxes ticked.
            dialog.element.addEventListener("change", ev => {
                const boxes = dialog.element.querySelectorAll("input[name=target]:checked");
                if (boxes.length > count) ev.target.checked = false;
            });
        },
        rejectClose: false
    });
    if (!uuids) return null;
    if (!uuids.length) return warn("needTargets");
    return uuids.slice(0, count);
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Ignite an actor's aura: post the public card, grant the Ignition bonus, and
 * whisper invites to same-disposition characters inside the radius.
 * @param {Actor} actor
 * @returns {Promise<object|null>} The new Ignition state.
 */
export async function startIgnition(actor) {
    if (!actor?.system) return null;
    const intensity = actor.system.aura?.intensity;
    const tier = IGNITION_INTENSITY[intensity];
    if (!tier) return warn("needIntensity");
    if (getIgnitionState(actor)?.active) return warn("alreadyActive", { name: actor.name });
    const recovery = await checkRecovery(actor);
    if (!recovery.ok) return null;
    const token = activeTokenFor(actor);
    if (!token) {
        ui.notifications.error(t("noToken", { name: actor.name }));
        return null;
    }

    const combat = game.combat?.started && game.combat.combatants.some(c => c.actor?.uuid === actor.uuid) ? game.combat : null;
    const state = {
        active: true,
        role: "initiator",
        initiatorUuid: actor.uuid,
        initiatorName: actor.name,
        img: actor.img,
        tokenUuid: token.uuid,
        intensity,
        radius: tier.radius,
        aura: { color: actor.system.aura.color ?? "", shape: actor.system.aura.shape ?? "" },
        participants: [{ actorUuid: actor.uuid, tokenUuid: token.uuid, name: actor.name, role: "initiator" }],
        spentActions: [],
        actionLog: [],
        startedAt: game.time.worldTime,
        combatId: combat?.id ?? "",
        startRound: combat ? Number(combat.round) || 0 : null,
        maxMinutes: totalLevel(actor),
        durationSec: MINUTE,
        recoveryUntil: 0,
        cardId: null
    };
    state.durationSec = durationFor(state);

    const card = await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor, token }),
        content: await renderCard(state),
        flags: { [SCOPE]: { [KEY]: { kind: "card", ...state } } }
    });
    state.cardId = card?.id ?? null;
    await actor.update({ [FLAG_PATH]: state, ...bonusUpdate(actor, state) });

    const candidates = inviteCandidates(token, tier.radius);
    for (const ally of candidates) await postInvite(actor, state, ally);
    if (candidates.length) ui.notifications.info(t("invitesSent", { count: candidates.length }));
    drawIgnitionOverlay();
    return state;
}

/** Same-disposition characters within the radius who are free to join. */
function inviteCandidates(tokenDoc, radius) {
    const initiatorUuid = tokenDoc.actor?.uuid;
    const found = new Map();
    for (const token of tokenDoc.parent?.tokens ?? []) {
        const actor = token.actor;
        if (!actor || token === tokenDoc || actor.uuid === initiatorUuid || !ACTOR_TYPES.has(actor.type)) continue;
        if (token.disposition !== tokenDoc.disposition || found.has(actor.uuid)) continue;
        if (getIgnitionState(actor)?.active || recoveryRemaining(actor) > 0) continue;
        if (hexesBetween(tokenDoc, token) > radius + EPSILON) continue;
        found.set(actor.uuid, actor);
    }
    return [...found.values()];
}

async function postInvite(initiator, state, ally) {
    const invite = {
        kind: "invite",
        status: "pending",
        initiatorUuid: state.initiatorUuid,
        initiatorName: state.initiatorName,
        allyUuid: ally.uuid,
        allyName: ally.name,
        cardId: state.cardId,
        img: state.img,
        intensity: state.intensity,
        radius: state.radius
    };
    return ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor: initiator }),
        whisper: ownerIds(ally),
        content: await renderInvite(invite),
        flags: { [SCOPE]: { [KEY]: invite } }
    });
}

/**
 * Add an ally to an active Ignition. The ally's token must be within the
 * radius of the initiator's token; joining is a free action on the ally's
 * turn or a Reaction outside it (the table polices the action economy).
 * @param {string} initiatorUuid
 * @param {string} allyUuid
 * @param {object} [options]
 * @param {string} [options.inviteId]  The invite message being accepted.
 * @returns {Promise<boolean>}
 */
export async function joinIgnition(initiatorUuid, allyUuid, { inviteId = null } = {}) {
    const ally = await fromUuid(allyUuid);
    if (!ally) return false;
    if (!ally.isOwner) return !!warn("notOwner", { name: ally.name });
    const initiator = await fromUuid(initiatorUuid);
    const state = getIgnitionState(initiator);
    if (!state?.active || state.role !== "initiator") return !!warn("notActive");
    const recovery = await checkRecovery(ally);
    if (!recovery.ok) return false;
    const s = cloneState(state);
    const documents = [initiator, ...await participantActors(s), ally, cardMessage(s), inviteId ? game.messages.get(inviteId) : null];
    const result = await perform("join", { initiatorUuid, allyUuid, inviteId, force: recovery.force }, documents);
    drawIgnitionOverlay();
    return !!result;
}

/**
 * Perform an Ignition Action. Any participant may use it once per Ignition;
 * the user picks which of their participants performs it and, where the
 * action says so, which allies they designate.
 * @param {string} initiatorUuid
 * @param {string} key  An IGNITION_ACTIONS key.
 * @returns {Promise<boolean|null>}
 */
export async function useIgnitionAction(initiatorUuid, key) {
    const action = IGNITION_ACTIONS[key];
    const initiator = await fromUuid(initiatorUuid);
    const live = getIgnitionState(initiator);
    if (!action || !live?.active || live.role !== "initiator") return warn("notActive");
    const state = cloneState(live);
    const label = actionLabel(key);
    if (state.spentActions.includes(key)) return warn("actionSpent", { action: label });
    if (state.participants.length < 2) return warn("needAlly");
    const members = await participantActors(state);
    const mine = members.filter(actor => actor.isOwner);
    if (!mine.length) return warn("noOwnedParticipant");
    const performer = await pickActor(mine, t("choosePerformer", { action: label }));
    if (!performer) return null;
    let targetUuids = [];
    if (action.allies) {
        targetUuids = await pickTargets(members.filter(actor => actor.uuid !== performer.uuid), action.allies, label);
        if (!targetUuids) return null;
    }
    const touchesAll = action.heal || action.ends;
    const documents = [initiator, cardMessage(state), ...(touchesAll ? members : [])];
    return perform("spend", { initiatorUuid, key, performerUuid: performer.uuid, targetUuids }, documents);
}

/**
 * End an Ignition for everyone (a free action). Called with an ally, it ends
 * the Ignition they are in if the user owns its initiator; an ally flag whose
 * Ignition is already gone is simply cleared.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {"ended"|"expired"|"flare"} [options.reason="ended"]
 * @returns {Promise<boolean>}
 */
export async function endIgnition(actor, { reason = "ended" } = {}) {
    const state = getIgnitionState(actor);
    if (!state?.active) {
        ui.notifications.info(t("notInIgnition", { name: actor?.name ?? "" }));
        return false;
    }
    let initiator = actor;
    if (state.role !== "initiator") {
        initiator = await fromUuid(state.initiatorUuid);
        const live = getIgnitionState(initiator);
        if (!live?.active || !(live.participants ?? []).some(p => p.actorUuid === actor.uuid)) {
            await actor.update({ [FLAG_PATH]: { active: false, recoveryUntil: 0 }, ...bonusUpdate(actor, null) });
            drawIgnitionOverlay();
            return true;
        }
        if (!initiator.isOwner) return !!warn("onlyInitiator", { name: initiator.name });
    }
    const s = cloneState(getIgnitionState(initiator));
    const result = await perform("end", { initiatorUuid: initiator.uuid, reason }, [initiator, ...await participantActors(s), cardMessage(s)]);
    drawIgnitionOverlay();
    return !!result;
}

/**
 * Sheet view-model for an actor's Ignition.
 * @param {Actor} actor
 * @returns {{active: boolean, isInitiator: boolean, recovering: boolean, canIgnite: boolean,
 *   intensityLabel: string, radius: number, participantCount: number, remaining: string,
 *   recoveryMin: number, summary: string}}
 */
export function getIgnitionStatus(actor) {
    const state = getIgnitionState(actor);
    const tier = IGNITION_INTENSITY[actor?.system?.aura?.intensity];
    const active = !!state?.active;
    const isInitiator = active && state.role === "initiator";
    const now = game.time.worldTime;
    const recoverySec = active ? 0 : Math.max(0, (Number(state?.recoveryUntil) || 0) - now);
    const count = isInitiator ? (state.participants?.length ?? 1) : (state?.participantCount ?? 0);
    const intensity = intensityLabel(state?.intensity ?? actor?.system?.aura?.intensity);

    let remaining = "";
    if (active) {
        const combat = state.combatId ? game.combats.get(state.combatId) : null;
        if (combat?.started && Number.isFinite(state.startRound)) {
            const rounds = Math.max(0, state.startRound + Math.ceil((state.durationSec || 0) / ROUND_SECONDS) - (Number(combat.round) || 0));
            remaining = t("roundsLeft", { rounds });
        } else {
            const seconds = Math.max(0, (Number(state.startedAt) || 0) + (Number(state.durationSec) || 0) - now);
            remaining = t("minutesLeft", { minutes: Math.ceil(seconds / MINUTE) });
        }
    }

    let summary = "";
    if (isInitiator) summary = t("statusInitiator", { intensity, radius: state.radius, count, remaining });
    else if (active) summary = t("statusAlly", { name: state.initiatorName ?? "", remaining });
    else if (recoverySec) summary = t("statusRecovering", { minutes: Math.ceil(recoverySec / MINUTE) });

    return {
        active,
        isInitiator,
        recovering: recoverySec > 0,
        canIgnite: !!tier && !active && !recoverySec,
        /** Ignite can be attempted while recovering: a GM may override, a player is told how long is left. */
        canAttempt: !!tier && !active,
        intensityLabel: intensity,
        radius: state?.radius ?? tier?.radius ?? 0,
        participantCount: count,
        remaining,
        recoveryMin: Math.ceil(recoverySec / MINUTE),
        summary
    };
}

/**
 * Chat-card controls (`data-tf-action="ignition"`, `data-op` = join | action |
 * end | accept | decline). State comes from the message's flags.
 * @param {ChatMessage} message
 * @param {HTMLElement} button
 */
export async function handleIgnitionCardAction(message, button) {
    const data = message.getFlag(SCOPE, KEY);
    if (!data) return null;
    const op = button.dataset.op;

    if (data.kind === "invite") {
        if (data.status !== "pending") return null;
        if (op === "accept") return joinIgnition(data.initiatorUuid, data.allyUuid, { inviteId: message.id });
        if (op === "decline") {
            const ally = await fromUuid(data.allyUuid);
            if (ally && !ally.isOwner) return warn("notOwner", { name: ally.name });
            return perform("respond", { messageId: message.id, status: "declined" }, [message]);
        }
        return null;
    }

    if (data.kind !== "card") return null;
    const initiator = await fromUuid(data.initiatorUuid);
    const live = getIgnitionState(initiator);
    if (!live?.active || live.role !== "initiator" || (live.cardId && live.cardId !== message.id)) return warn("notActive");
    if (op === "action") return useIgnitionAction(initiator.uuid, button.dataset.key);
    if (op === "end") return endIgnition(initiator);
    if (op === "join") return joinFromCard(initiator, cloneState(live));
    return null;
}

/** "Join Ignition" on the public card: pick one of the user's characters inside the radius. */
async function joinFromCard(initiator, state) {
    const origin = await fromUuid(state.tokenUuid);
    if (!origin?.parent) return warn("noInitiatorToken");
    const joined = new Set(state.participants.map(p => p.actorUuid));
    const options = new Map();
    for (const token of origin.parent.tokens) {
        const actor = token.actor;
        if (!actor?.isOwner || !ACTOR_TYPES.has(actor.type) || joined.has(actor.uuid) || options.has(actor.uuid)) continue;
        if (hexesBetween(origin, token) > state.radius + EPSILON) continue;
        options.set(actor.uuid, actor);
    }
    if (!options.size) return warn("noOwnedToken", { name: state.initiatorName, radius: state.radius });
    const ally = await pickActor([...options.values()], t("chooseJoiner"));
    return ally ? joinIgnition(initiator.uuid, ally.uuid) : null;
}

/* -------------------------------------------- */
/*  Expiry                                      */
/* -------------------------------------------- */

let expiring = false;

/** End every Ignition whose duration has run out (active GM only). */
async function expireIgnitions() {
    if (expiring || !game.users.activeGM?.isSelf) return;
    expiring = true;
    try {
        const sceneActors = (canvas?.scene?.tokens ?? []).filter(token => !token.actorLink).map(token => token.actor);
        for (const actor of [...game.actors, ...sceneActors]) {
            const state = getIgnitionState(actor);
            if (!state?.active || state.role !== "initiator" || !isExpired(state)) continue;
            await OPS.end({ initiatorUuid: actor.uuid, reason: "expired" }, game.user.id).catch(err => console.error("thefade | Ignition expiry failed", err));
        }
    } finally {
        expiring = false;
    }
}

/** After tokens move, re-check every active Ignition's radius (active GM only). */
async function checkIgnitionRanges() {
    if (!game.users.activeGM?.isSelf) return;
    const sceneActors = (canvas?.scene?.tokens ?? []).filter(token => !token.actorLink).map(token => token.actor);
    for (const actor of [...game.actors, ...sceneActors]) {
        const state = getIgnitionState(actor);
        if (!state?.active || state.role !== "initiator" || (state.participants?.length ?? 0) < 2) continue;
        await OPS.range({ initiatorUuid: actor.uuid }, game.user.id).catch(err => console.error("thefade | Ignition range check failed", err));
    }
}

/* -------------------------------------------- */
/*  Canvas overlay                              */
/* -------------------------------------------- */

let overlay = null;
const overlayTokens = new Set();

function overlayGraphics() {
    if (overlay && !overlay.destroyed && overlay.parent) return overlay;
    overlay = new PIXI.Graphics();
    overlay.eventMode = "none";
    overlay.zIndex = 100;
    canvas.tokens.addChild(overlay);
    return overlay;
}

/** Redraw the aura-colored lines linking each visible initiator to its allies. */
export function drawIgnitionOverlay() {
    if (!canvas?.ready || !canvas.tokens) return;
    const g = overlayGraphics();
    g.clear();
    overlayTokens.clear();
    const tokens = canvas.tokens.placeables;
    const byUuid = new Map(tokens.map(token => [token.document.uuid, token]));
    for (const token of tokens) {
        const state = getIgnitionState(token.actor);
        if (!state?.active || state.role !== "initiator") continue;
        const tokenUuid = state.tokenUuid ?? state.participants?.[0]?.tokenUuid;
        if (tokenUuid && tokenUuid !== token.document.uuid) continue;
        const allies = (state.participants ?? []).slice(1).map(p => byUuid.get(p.tokenUuid)).filter(Boolean);
        overlayTokens.add(token.id);
        for (const ally of allies) overlayTokens.add(ally.id);
        if (!token.visible) continue;

        const color = AURA_COLOR_HEX[token.actor.system?.aura?.color] ?? DEFAULT_AURA_HEX;
        const start = token.center;
        for (const ally of allies) {
            if (!ally.visible) continue;
            const end = ally.center;
            g.lineStyle({ width: 4, color, alpha: 0.65, cap: PIXI.LINE_CAP.ROUND }).moveTo(start.x, start.y).lineTo(end.x, end.y);
            g.lineStyle(0).beginFill(color, 0.85).drawCircle(end.x, end.y, 6).endFill();
        }
        g.lineStyle(0).beginFill(color, 0.95).drawCircle(start.x, start.y, 9).endFill();
        g.lineStyle({ width: 2, color: 0xffffff, alpha: 0.85 }).drawCircle(start.x, start.y, 9);
    }
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

let registered = false;

/**
 * Register the GM socket handlers, canvas overlay hooks, and duration expiry.
 * Call once during `init` on every client.
 */
export function registerIgnitionHooks() {
    if (registered) return;
    registered = true;
    for (const [op, handler] of Object.entries(OPS)) registerGMHandler(`ignition.${op}`, handler);

    const redraw = foundry.utils.debounce(drawIgnitionOverlay, 25);
    Hooks.on("canvasReady", () => drawIgnitionOverlay());
    Hooks.on("canvasTearDown", () => {
        overlay = null;
        overlayTokens.clear();
    });
    for (const hook of ["createToken", "updateToken", "deleteToken"]) Hooks.on(hook, () => redraw());
    // Follow tokens while they animate.
    Hooks.on("refreshToken", token => {
        if (overlayTokens.has(token.id)) drawIgnitionOverlay();
    });
    Hooks.on("updateActor", (actor, changes) => {
        if (changes.flags?.[SCOPE] || changes.system?.aura) redraw();
    });

    const checkRanges = foundry.utils.debounce(checkIgnitionRanges, 250);
    Hooks.on("updateToken", (token, changes) => {
        if ("x" in changes || "y" in changes) checkRanges();
    });

    Hooks.on("updateWorldTime", () => expireIgnitions());
    Hooks.on("updateCombat", (combat, changes) => {
        if ("round" in changes) expireIgnitions();
    });
}
