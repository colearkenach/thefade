// Token facing (one of six neighbouring hexes), the facing/stance overlay
// drawn on tokens, and the Token HUD combat-state palette. Conditions are
// native status effects, so the HUD's own status palette toggles them
// (right-click cycles a tiered condition's intensity via Actor#toggleStatusEffect).
import { CONDITION_EFFECTS, getConditionKeyFromStatusId } from "../rules/conditions.js";
import { STANCES } from "../rules/stances.js";

const FLAG_SCOPE = "thefade";
const FLAG_KEY = "facingHex";
const LEGACY_FLAG_KEY = "facing";

/** Clockwise from the front hex: the six defense zones (Core p. 22). */
const ZONE_BY_STEP = Object.freeze(["front", "flank", "backflank", "back", "backflank", "flank"]);
const SIDE_COLORS = Object.freeze({ front: 0x69A84F, flank: 0xF4D93F, backflank: 0xEE9838, back: 0xE33838 });
const STANCE_BADGES = Object.freeze({
    dodgeStance: { text: "D", color: 0x4EA5D9 },
    parryingStance: { text: "P", color: 0xF5C542 },
    brace: { text: "B", color: 0xC85D5D },
    toughItOut: { text: "T", color: 0x6FAF72 },
    resoluteWill: { text: "R", color: 0x9B75C7 }
});

const normalize = value => {
    const n = Number(value);
    return Number.isFinite(n) ? ((Math.round(n) % 6) + 6) % 6 : 0;
};
const isFlat = (grid = canvas?.grid) => grid?.columns === true;
const eligible = token => !!token?.actor && ["character", "npc"].includes(token.actor.type);

function directionVectors(grid = canvas?.grid) {
    // Clockwise; pointy-topped grids begin at NE, flat-topped at N.
    return isFlat(grid)
        ? [{ x: 0, y: -1 }, { x: 0.8660254, y: -0.5 }, { x: 0.8660254, y: 0.5 }, { x: 0, y: 1 }, { x: -0.8660254, y: 0.5 }, { x: -0.8660254, y: -0.5 }]
        : [{ x: 0.5, y: -0.8660254 }, { x: 1, y: 0 }, { x: 0.5, y: 0.8660254 }, { x: -0.5, y: 0.8660254 }, { x: -1, y: 0 }, { x: -0.5, y: -0.8660254 }];
}

function directionLabels(grid = canvas?.grid) {
    return isFlat(grid) ? ["N", "NE", "SE", "S", "SW", "NW"] : ["NE", "E", "SE", "SW", "W", "NW"];
}

export function closestHexDirection(vector, grid = canvas?.grid) {
    const dx = Number(vector?.x) || 0;
    const dy = Number(vector?.y) || 0;
    if (!dx && !dy) return 0;
    let best = 0;
    let bestDot = -Infinity;
    directionVectors(grid).forEach((candidate, index) => {
        const dot = dx * candidate.x + dy * candidate.y;
        if (dot > bestDot) { bestDot = dot; best = index; }
    });
    return best;
}

export function getHexDirectionFromPoints(origin, destination, grid = canvas?.grid) {
    if (!origin || !destination) return 0;
    return closestHexDirection({ x: destination.x - origin.x, y: destination.y - origin.y }, grid);
}

/** The hex direction a token faces. */
export function getTokenFacing(token) {
    const document = token?.document ?? token;
    const stored = document?.flags?.[FLAG_SCOPE]?.[FLAG_KEY];
    if (Number.isFinite(Number(stored))) return normalize(stored);
    // Older worlds stored a rotation in degrees.
    const degrees = Number(document?.flags?.[FLAG_SCOPE]?.[LEGACY_FLAG_KEY]);
    if (!Number.isFinite(degrees)) return 0;
    const radians = ((((degrees % 360) + 360) % 360) * Math.PI) / 180;
    return closestHexDirection({ x: Math.sin(radians), y: -Math.cos(radians) });
}

export function classifyRelativeFacing(directionIndex, tokenFacingIndex = 0) {
    return ZONE_BY_STEP[(normalize(directionIndex) - normalize(tokenFacingIndex) + 6) % 6];
}

/** Which side of the target the attacker is on: front | flank | backflank | back. */
export function classifyTokenFacing(attackerToken, targetToken, grid = canvas?.grid) {
    if (!attackerToken?.center || !targetToken?.center) return "front";
    return classifyRelativeFacing(getHexDirectionFromPoints(targetToken.center, attackerToken.center, grid), getTokenFacing(targetToken));
}

export async function setTokenFacing(token, direction) {
    if (!eligible(token)) return;
    await token.document.setFlag(FLAG_SCOPE, FLAG_KEY, normalize(direction));
}

export async function setTokenFacingToward(token, point) {
    if (!eligible(token) || !point || !token.center) return;
    await setTokenFacing(token, getHexDirectionFromPoints(token.center, point));
}

/* -------------------------------------------- */
/*  Token overlay                               */
/* -------------------------------------------- */

function hexVertices(width, height, flat) {
    const inset = Math.max(2, Math.min(width, height) * 0.025);
    const [l, r, t, b, cx, cy] = [inset, width - inset, inset, height - inset, width / 2, height / 2];
    if (flat) {
        const q = width * 0.25;
        return [{ x: q, y: t }, { x: width - q, y: t }, { x: r, y: cy }, { x: width - q, y: b }, { x: q, y: b }, { x: l, y: cy }];
    }
    const q = height * 0.25;
    return [{ x: cx, y: t }, { x: r, y: q }, { x: r, y: height - q }, { x: cx, y: b }, { x: l, y: height - q }, { x: l, y: q }];
}

function signature(token) {
    return `${token.w}|${token.h}|${isFlat()}|${getTokenFacing(token)}|${token.actor?.system?.activeStance ?? "none"}|${canvas?.grid?.isHexagonal}`;
}

function removeOverlay(token) {
    if (!token?.thefadeOverlay) return;
    try { token.thefadeOverlay.destroy({ children: true }); } catch (_) { /* already gone */ }
    token.thefadeOverlay = null;
    token.thefadeOverlaySignature = null;
}

/** Draw the colored facing sides and stance badge on a token (hex grids only). */
export function drawTokenOverlay(token) {
    if (!token || !eligible(token) || !canvas?.grid?.isHexagonal) return removeOverlay(token);
    const sig = signature(token);
    if (token.thefadeOverlay && token.thefadeOverlaySignature === sig) return;
    removeOverlay(token);

    const root = new PIXI.Container();
    root.eventMode = "none";
    const vertices = hexVertices(token.w, token.h, isFlat());
    const facing = getTokenFacing(token);
    const sides = new PIXI.Graphics();
    for (let side = 0; side < 6; side++) {
        const [start, end] = [vertices[side], vertices[(side + 1) % 6]];
        sides.lineStyle(10, 0x161719, 0.78).moveTo(start.x, start.y).lineTo(end.x, end.y);
        sides.lineStyle(6, SIDE_COLORS[classifyRelativeFacing(side, facing)], 1).moveTo(start.x, start.y).lineTo(end.x, end.y);
    }
    root.addChild(sides);

    const badge = STANCE_BADGES[token.actor.system?.activeStance];
    if (badge) {
        const radius = Math.max(9, Math.min(14, Math.min(token.w, token.h) * 0.13));
        const [x, y] = [token.w - radius - 3, token.h - radius - 3];
        const circle = new PIXI.Graphics();
        circle.beginFill(0x17191C, 0.94).lineStyle(2, badge.color, 1).drawCircle(x, y, radius).endFill();
        root.addChild(circle);
        const text = new foundry.canvas.containers.PreciseText(badge.text, { fill: 0xFFFFFF, fontFamily: "Signika", fontSize: radius * 1.1, fontWeight: "700" });
        text.anchor.set(0.5);
        text.position.set(x, y);
        root.addChild(text);
    }
    token.addChild(root);
    token.thefadeOverlay = root;
    token.thefadeOverlaySignature = sig;
}

/* -------------------------------------------- */
/*  Token HUD                                   */
/* -------------------------------------------- */

/** Show condition intensity on the HUD's status palette. */
function decorateStatusPalette(hud, root) {
    const actor = hud.actor;
    if (!actor) return;
    for (const control of root.querySelectorAll(".status-effects [data-status-id]")) {
        const key = getConditionKeyFromStatusId(control.dataset.statusId);
        if (!key) continue;
        const definition = CONDITION_EFFECTS[key];
        const state = actor.system?.conditions?.[key];
        for (const level of ["trivial", "moderate", "severe"]) {
            control.classList.toggle(`thefade-${level}`, !!(definition.tiered && state?.active && state.intensity === level));
        }
        control.classList.toggle("thefade-immune", actor.system?.statusImmunityLocks?.[key] === true);
        control.dataset.tooltipText = definition.tiered
            ? game.i18n.format("THEFADE.Condition.hudTiered", { label: definition.label, intensity: game.i18n.localize(`THEFADE.Intensity.${state?.intensity ?? "trivial"}`) })
            : definition.label;
    }
}

function refreshPalette(panel, token) {
    if (!panel || !token?.actor) return;
    const facing = getTokenFacing(token);
    const labels = directionLabels();
    for (const button of panel.querySelectorAll("[data-facing-index]")) {
        const direction = normalize(button.dataset.facingIndex);
        const zone = classifyRelativeFacing(direction, facing);
        button.classList.toggle("active", direction === facing);
        for (const name of Object.keys(SIDE_COLORS)) button.classList.toggle(`zone-${name}`, name === zone);
        button.querySelector("[data-zone]").textContent = game.i18n.localize(`THEFADE.Facing.${zone}`);
        button.dataset.tooltip = `${labels[direction]}: ${game.i18n.localize(`THEFADE.Facing.${zone}`)}`;
    }
    for (const button of panel.querySelectorAll("[data-stance]")) {
        button.classList.toggle("active", button.dataset.stance === (token.actor.system?.activeStance ?? "none"));
    }
}

function buildPalette(token) {
    const panel = document.createElement("div");
    panel.className = "thefade thefade-hud-palette";
    panel.hidden = true;
    const labels = directionLabels();
    panel.innerHTML = `
        <header><strong>${game.i18n.localize("THEFADE.Facing.title")}</strong></header>
        <div class="thefade-hex-pad ${isFlat() ? "flat" : "pointy"}">
            ${labels.map((label, i) => `<button type="button" class="dir-${i}" data-facing-index="${i}"><strong>${label}</strong><small data-zone></small></button>`).join("")}
            <button type="button" class="aim" data-aim data-tooltip="THEFADE.Facing.aim"><i class="fa-solid fa-crosshairs"></i></button>
        </div>
        <header><strong>${game.i18n.localize("THEFADE.Sheet.stance")}</strong></header>
        <div class="thefade-hud-stances">
            ${Object.values(STANCES).map(s => `<button type="button" data-stance="${s.key}" data-tooltip="${foundry.utils.escapeHTML(s.description)}">${s.label}</button>`).join("")}
        </div>`;
    panel.addEventListener("pointerdown", event => event.stopPropagation());
    panel.addEventListener("click", async event => {
        event.stopPropagation();
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.facingIndex !== undefined) await setTokenFacing(token, button.dataset.facingIndex);
        else if (button.dataset.stance) await token.actor.update({ "system.activeStance": button.dataset.stance });
        else if (button.dataset.aim !== undefined) return aimFacing(token, panel);
        refreshPalette(panel, token);
    });
    refreshPalette(panel, token);
    return panel;
}

async function aimFacing(token, panel) {
    const target = game.user.targets.first();
    if (target && target !== token) {
        await setTokenFacingToward(token, target.center);
        return refreshPalette(panel, token);
    }
    panel.hidden = true;
    ui.notifications.info("THEFADE.Facing.clickPrompt", { localize: true });
    canvas.stage.once("pointerdown", async event => {
        const point = event.getLocalPosition?.(canvas.stage);
        if (point) await setTokenFacingToward(token, point);
    });
}

function onRenderTokenHUD(hud, html) {
    const root = html instanceof HTMLElement ? html : html[0];
    decorateStatusPalette(hud, root);
    const token = hud.object;
    if (!eligible(token) || !canvas.grid.isHexagonal || root.querySelector(".thefade-hud-button")) return;
    const column = root.querySelector(".col.left") ?? root;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-icon thefade-hud-button";
    button.dataset.tooltip = "THEFADE.Facing.title";
    button.innerHTML = '<i class="fa-solid fa-compass" inert></i>';
    const panel = buildPalette(token);
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        panel.hidden = !panel.hidden;
        refreshPalette(panel, token);
    });
    column.appendChild(button);
    root.appendChild(panel);
}

export function registerTokenFacing() {
    for (const hook of ["drawToken", "refreshToken"]) Hooks.on(hook, drawTokenOverlay);
    Hooks.on("destroyToken", removeOverlay);
    Hooks.on("renderTokenHUD", onRenderTokenHUD);
    // Stance changes redraw the badge; the HUD palette follows.
    Hooks.on("updateActor", actor => {
        for (const token of actor.getActiveTokens()) drawTokenOverlay(token);
        const hud = canvas?.tokens?.hud;
        if (hud?.rendered && hud.actor === actor) decorateStatusPalette(hud, hud.element);
    });
    Hooks.on("createActiveEffect", effect => refreshHUDFor(effect.parent));
    Hooks.on("deleteActiveEffect", effect => refreshHUDFor(effect.parent));
    Hooks.on("updateActiveEffect", effect => refreshHUDFor(effect.parent));
}

function refreshHUDFor(actor) {
    const hud = canvas?.tokens?.hud;
    if (actor && hud?.rendered && hud.actor === actor) decorateStatusPalette(hud, hud.element);
}
