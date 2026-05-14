// Aura Ignition: lets a character ignite their aura and link allies within
// its radius. Renders connecting lines on the canvas, posts a chat card with
// the Ignition Actions, and tracks duration/recovery on actor flags.

const FLAG_SCOPE = "thefade";
const FLAG_KEY = "ignition";

export const IGNITION_INTENSITY_RADIUS = { faint: 3, moderate: 2, intense: 1 };
export const IGNITION_INTENSITY_LABEL = {
    faint: "Faint",
    moderate: "Moderate",
    intense: "Intense"
};

export const IGNITION_ACTIONS = {
    "shared-surge": {
        label: "Shared Surge",
        description: "As a Minor Action, you and an ally within Ignition you designate receive +2D to the next roll you or they make within the duration of the Ignition.",
        needsAlly: 1
    },
    "interlinked-defense": {
        label: "Interlinked Defense",
        description: "You can designate two other allies; you and your allies designated share their Defense stats (effectively using the highest among them) against the next attack roll they each individually would suffer. This benefit disappears if not triggered within 4 rounds.",
        needsAlly: 2
    },
    "echoed-strikes": {
        label: "Echoed Strikes",
        description: "When making an attack roll if you successfully hit and deal damage, an ally within the aura's radius can expend their Reaction to make a free attack roll—even if they'd normally be out of range as their spectral energy from their spirit charges your own attack for a follow-up."
    },
    "harmonic-flow": {
        label: "Harmonic Flow",
        description: "You can cast a spell you don't know but an ally within the Ignition knows."
    },
    "resonant-healing": {
        label: "Resonant Healing",
        description: "As a Minor Action you can activate a burst of healing energy—all allies within the Ignition heal 2D immediately.",
        heal: true
    },
    "combat-unity": {
        label: "Combat Unity",
        description: "As a Minor Action, you can treat yourself as possessing the Talent of an ally within the Ignition, even if you don't meet the prerequisites."
    },
    "flare-of-purpose": {
        label: "Flare of Purpose",
        description: "You can activate this after making a successful attack, however doing so will end the Ignition for everyone. You increase the damage of your attack by 15 per ally within the Ignition (including yourself).",
        endsIgnition: true
    }
};

const AURA_COLOR_HEX = {
    red: 0xff4040, blue: 0x4080ff, green: 0x40c060, yellow: 0xffe040,
    purple: 0x9040ff, orange: 0xff8040, pink: 0xff80c0, gold: 0xffd040,
    silver: 0xc0c0d0, turquoise: 0x40e0d0, indigo: 0x4040ff, brown: 0x8b5a2b,
    violet: 0x8a2be2, gray: 0x808080, black: 0x303030, white: 0xf0f0f0
};

function auraColorHex(c) { return AURA_COLOR_HEX[c] ?? 0xff8040; }

export function getIgnitionState(actor) {
    return actor?.getFlag(FLAG_SCOPE, FLAG_KEY) || null;
}

function getInitiatorToken(actor) {
    if (!canvas?.ready) return null;
    const controlled = canvas.tokens.controlled.find(t => t.actor?.id === actor.id);
    if (controlled) return controlled;
    return canvas.tokens.placeables.find(t => t.actor?.id === actor.id) || null;
}

function hexDistance(p1, p2) {
    try {
        if (canvas?.grid?.measurePath) {
            return canvas.grid.measurePath([p1, p2]).distance;
        }
        if (canvas?.grid?.measureDistance) {
            return canvas.grid.measureDistance(p1, p2);
        }
    } catch (_) { /* fall through */ }
    const dx = p1.x - p2.x, dy = p1.y - p2.y;
    return Math.hypot(dx, dy) / (canvas?.grid?.size || 100);
}

function findAlliesInRadius(initiatorToken, radius) {
    const center = initiatorToken.center;
    const result = [];
    for (const t of canvas.tokens.placeables) {
        if (t.id === initiatorToken.id) continue;
        if (!t.actor || !["character", "npc"].includes(t.actor.type)) continue;
        if (t.document.disposition !== initiatorToken.document.disposition) continue;
        const d = hexDistance(center, t.center);
        if (d <= radius + 0.001) result.push(t);
    }
    return result;
}

/**
 * Begin Ignition: derives radius from the actor's aura intensity, gathers
 * same-disposition tokens within radius, stamps flags on each, and posts the
 * chat card. Honors a recovery cooldown if the previous ignition just ended.
 */
export async function startIgnition(initiatorActor) {
    if (!initiatorActor) return;
    const intensity = initiatorActor.system?.aura?.intensity;
    if (!intensity || !IGNITION_INTENSITY_RADIUS[intensity]) {
        ui.notifications.warn("Set an Aura Intensity (Faint, Moderate, or Intense) before igniting.");
        return;
    }

    const existing = getIgnitionState(initiatorActor);
    const now = game.time.worldTime;
    if (existing?.active) {
        ui.notifications.warn(`${initiatorActor.name} is already in an Ignition.`);
        return;
    }
    if (existing?.recoveryUntil && existing.recoveryUntil > now) {
        const remainingMin = Math.ceil((existing.recoveryUntil - now) / 60);
        ui.notifications.warn(`${initiatorActor.name} is still recovering (${remainingMin} min remaining).`);
        return;
    }

    const token = getInitiatorToken(initiatorActor);
    if (!token) {
        ui.notifications.error("No token for this actor found on the active scene. Place a token first.");
        return;
    }

    const radius = IGNITION_INTENSITY_RADIUS[intensity];
    const candidates = findAlliesInRadius(token, radius);

    const participants = [{
        actorUuid: initiatorActor.uuid,
        tokenUuid: token.document.uuid,
        name: initiatorActor.name,
        role: "initiator"
    }];
    for (const t of candidates) {
        participants.push({
            actorUuid: t.actor.uuid,
            tokenUuid: t.document.uuid,
            name: t.actor.name,
            role: "ally"
        });
    }

    const totalLevel = Number(initiatorActor.system?.level) || 1;
    const durationMin = Math.min(participants.length, totalLevel);

    const flag = {
        active: true,
        role: "initiator",
        initiatorUuid: initiatorActor.uuid,
        intensity,
        radius,
        participants,
        spentActions: [],
        startedAt: now,
        durationSec: durationMin * 60,
        recoveryUntil: 0
    };
    await initiatorActor.setFlag(FLAG_SCOPE, FLAG_KEY, flag);

    for (const p of participants.slice(1)) {
        const ally = await fromUuid(p.actorUuid);
        if (ally) {
            await ally.setFlag(FLAG_SCOPE, FLAG_KEY, {
                active: true,
                role: "participant",
                initiatorUuid: initiatorActor.uuid,
                intensity, radius,
                startedAt: now,
                durationSec: flag.durationSec,
                recoveryUntil: 0
            });
        }
    }

    await _postIgnitionCard(initiatorActor, flag);
    drawIgnitionOverlay();
}

/**
 * End Ignition for the initiator and all participants. Sets a recovery
 * cooldown of 1 hour per ally who participated.
 */
export async function endIgnition(initiatorActor, { reason = "ended" } = {}) {
    const flag = getIgnitionState(initiatorActor);
    if (!flag?.active) return;
    const now = game.time.worldTime;
    const allyCount = Math.max(0, (flag.participants?.length || 1) - 1);
    const recoveryUntil = now + allyCount * 3600;

    await initiatorActor.setFlag(FLAG_SCOPE, FLAG_KEY, {
        active: false,
        recoveryUntil
    });
    for (const p of (flag.participants || []).slice(1)) {
        const ally = await fromUuid(p.actorUuid);
        if (ally) {
            await ally.setFlag(FLAG_SCOPE, FLAG_KEY, {
                active: false,
                recoveryUntil
            });
        }
    }

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: initiatorActor }),
        content: `<div class="thefade-ignition-end"><i class="fas fa-fire-flame-curved"></i> <strong>${initiatorActor.name}</strong>'s Ignition has ${reason}. Participants must wait <strong>${allyCount} hour(s)</strong> before joining a new Ignition.</div>`
    });

    drawIgnitionOverlay();
}

async function _postIgnitionCard(actor, flag) {
    const actions = Object.entries(IGNITION_ACTIONS).map(([key, v]) => ({
        key,
        label: v.label,
        description: v.description
    }));
    const html = await renderTemplate("systems/thefade/templates/chat/ignition.html", {
        actorName: actor.name,
        actorUuid: actor.uuid,
        intensity: IGNITION_INTENSITY_LABEL[flag.intensity],
        radius: flag.radius,
        participants: flag.participants,
        durationMin: Math.round(flag.durationSec / 60),
        actions
    });
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html
    });
}

// ---------------- Canvas overlay ----------------

let _overlay = null;

function _ensureOverlay() {
    if (!canvas?.ready) return null;
    if (_overlay && !_overlay.destroyed && _overlay.parent) return _overlay;
    _overlay = new PIXI.Graphics();
    _overlay.eventMode = "none";
    _overlay.interactiveChildren = false;
    _overlay.zIndex = 100;
    canvas.tokens.addChild(_overlay);
    return _overlay;
}

/**
 * Redraw all active Ignition lines on the current scene. Called from token
 * and actor update hooks so the lines follow tokens around.
 */
export function drawIgnitionOverlay() {
    if (!canvas?.ready) return;
    const g = _ensureOverlay();
    if (!g) return;
    g.clear();

    const initiators = canvas.tokens.placeables.filter(t => {
        const f = t.actor?.getFlag(FLAG_SCOPE, FLAG_KEY);
        return f?.active && f?.role === "initiator";
    });

    for (const init of initiators) {
        const flag = init.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
        const color = auraColorHex(init.actor.system?.aura?.color);
        const start = init.center;

        g.lineStyle({ width: 4, color, alpha: 0.65, cap: PIXI.LINE_CAP?.ROUND ?? 1 });
        for (const p of (flag.participants || []).slice(1)) {
            const tok = canvas.tokens.placeables.find(t => t.document.uuid === p.tokenUuid);
            if (!tok) continue;
            const end = tok.center;
            g.moveTo(start.x, start.y);
            g.lineTo(end.x, end.y);

            g.beginFill(color, 0.85);
            g.drawCircle(end.x, end.y, 6);
            g.endFill();
        }

        g.lineStyle(0);
        g.beginFill(color, 0.95);
        g.drawCircle(start.x, start.y, 9);
        g.endFill();
        g.lineStyle({ width: 2, color: 0xffffff, alpha: 0.85 });
        g.drawCircle(start.x, start.y, 9);
    }
}

// ---------------- Chat card handlers ----------------

function _bindIgnitionCard(html) {
    const $html = html instanceof jQuery ? html : $(html);
    const card = $html.find(".thefade-ignition-card");
    if (!card.length) return;

    card.find(".ignition-action-btn").on("click", async (ev) => {
        ev.preventDefault();
        const btn = ev.currentTarget;
        const key = btn.dataset.action;
        const actorUuid = btn.dataset.actorUuid;
        await _onIgnitionAction(actorUuid, key, card);
    });

    card.find(".ignition-end-btn").on("click", async (ev) => {
        ev.preventDefault();
        const actorUuid = ev.currentTarget.dataset.actorUuid;
        const actor = await fromUuid(actorUuid);
        if (!actor) return;
        if (!actor.isOwner && !game.user.isGM) {
            ui.notifications.warn("You don't own this actor.");
            return;
        }
        await endIgnition(actor);
    });

    // Reflect already-spent actions and grey them out
    const cardActor = card.data("actorUuid") || card.attr("data-actor-uuid");
    if (cardActor) {
        fromUuid(cardActor).then(actor => {
            const f = getIgnitionState(actor);
            if (!f) return;
            for (const key of (f.spentActions || [])) {
                card.find(`.ignition-action-btn[data-action="${key}"]`)
                    .prop("disabled", true).addClass("spent");
            }
            if (!f.active) {
                card.find(".ignition-action-btn, .ignition-end-btn")
                    .prop("disabled", true).addClass("spent");
            }
        });
    }
}

async function _onIgnitionAction(actorUuid, key, card) {
    const actor = await fromUuid(actorUuid);
    if (!actor) return;
    if (!actor.isOwner && !game.user.isGM) {
        ui.notifications.warn("You don't own this Ignition.");
        return;
    }
    const flag = getIgnitionState(actor);
    if (!flag?.active || flag.role !== "initiator") {
        ui.notifications.warn("No active Ignition for this actor.");
        return;
    }
    if ((flag.spentActions || []).includes(key)) {
        ui.notifications.warn("That Ignition Action has already been used.");
        return;
    }
    const action = IGNITION_ACTIONS[key];
    if (!action) return;

    let summary = `<p><strong>${action.label}:</strong> ${action.description}</p>`;
    let targets = [];

    if (action.needsAlly) {
        targets = await _promptAllyTargets(flag, action.needsAlly, action.label);
        if (targets === null) return; // cancelled
        if (targets.length) {
            summary += `<p><em>Targets:</em> ${targets.map(t => t.name).join(", ")}</p>`;
        }
    }

    if (key === "resonant-healing") {
        const roll = await new Roll("2d12").evaluate();
        const heal = roll.total;
        summary += `<p><strong>Healing roll:</strong> ${heal} HP applied to each participant.</p>`;
        if (game.user.isGM) {
            for (const p of (flag.participants || [])) {
                const a = await fromUuid(p.actorUuid);
                if (!a) continue;
                const cur = Number(a.system?.hp?.value ?? 0);
                const max = Number(a.system?.hp?.max ?? cur + heal);
                const next = Math.min(max, cur + heal);
                await a.update({ "system.hp.value": next });
            }
        } else {
            summary += `<p><em>(GM must confirm to apply HP.)</em></p>`;
        }
    }

    if (key === "flare-of-purpose") {
        const bonusDmg = 15 * (flag.participants?.length || 1);
        summary += `<p><strong>Damage bonus:</strong> +${bonusDmg} to the triggering attack. <strong>Ignition ends.</strong></p>`;
    }

    const spent = [...(flag.spentActions || []), key];
    await actor.setFlag(FLAG_SCOPE, FLAG_KEY, { ...flag, spentActions: spent });

    card.find(`.ignition-action-btn[data-action="${key}"]`).prop("disabled", true).addClass("spent");

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="thefade-ignition-action">${summary}</div>`
    });

    if (action.endsIgnition) {
        await endIgnition(actor, { reason: "ended via Flare of Purpose" });
    }
}

async function _promptAllyTargets(flag, count, label) {
    const allies = (flag.participants || []).filter(p => p.role !== "initiator");
    if (!allies.length) {
        ui.notifications.warn("No allies in the Ignition to target.");
        return [];
    }
    const inputType = count === 1 ? "radio" : "checkbox";
    const options = allies.map((a, i) =>
        `<label style="display:block;margin:2px 0">
            <input type="${inputType}" name="ally" value="${i}" />
            ${a.name}
        </label>`
    ).join("");
    const content = `<form><p>Select ${count === 1 ? "an ally" : `up to ${count} allies`}:</p>${options}</form>`;

    return new Promise(resolve => {
        new Dialog({
            title: label,
            content,
            buttons: {
                ok: {
                    label: "Confirm",
                    callback: html => {
                        const selected = Array.from(html[0].querySelectorAll("input[name='ally']:checked"))
                            .map(el => allies[Number(el.value)]).slice(0, count);
                        resolve(selected);
                    }
                },
                cancel: { label: "Cancel", callback: () => resolve(null) }
            },
            default: "ok",
            close: () => resolve(null)
        }).render(true);
    });
}

// ---------------- Hook registration ----------------

export function registerIgnitionHooks() {
    Hooks.on("canvasReady", () => drawIgnitionOverlay());
    Hooks.on("updateToken", () => drawIgnitionOverlay());
    Hooks.on("createToken", () => drawIgnitionOverlay());
    Hooks.on("deleteToken", () => drawIgnitionOverlay());
    Hooks.on("refreshToken", () => drawIgnitionOverlay());
    Hooks.on("updateActor", (actor, changes) => {
        if (foundry.utils.hasProperty(changes, "flags.thefade.ignition")
            || foundry.utils.hasProperty(changes, "system.aura")) {
            drawIgnitionOverlay();
        }
    });
    Hooks.on("renderChatMessage", (msg, html) => _bindIgnitionCard(html));
}
