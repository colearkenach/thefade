// Token facing visual indicator and Token HUD "Set Facing" control.
//
// Facing is stored per-token as flags.thefade.facing (degrees, 0 = north,
// clockwise — matching Foundry's rotation convention). It is INDEPENDENT of
// document.rotation so that moving or rotating a token never silently changes
// its front arc; the arc only updates when the user clicks the Set Facing
// button. atan2(dy, dx) returns 0 for east, so a +90° offset bridges the two
// frames when converting mouse direction to stored facing.

const FLAG_SCOPE = "thefade";
const FLAG_KEY = "facing";
const FRONT_ARC_HALF_DEG = 45;
const FOUNDRY_ROTATION_OFFSET_DEG = 90;
const ARC_COLOR = 0xF5C542;
const ARC_FILL_ALPHA = 0.25;
const ARC_LINE_ALPHA = 0.85;
const ARROWHEAD_LENGTH = 10;
const ARROWHEAD_HALF_WIDTH = 6;

function isFacingEligible(token) {
    // Any token with an actor qualifies. The system only defines "character",
    // but leaving this permissive avoids silently failing if a token is
    // actorless or uses a custom document class.
    return !!token?.actor;
}

export function getTokenFacing(token) {
    const doc = token?.document ?? token;
    const stored = doc?.flags?.[FLAG_SCOPE]?.[FLAG_KEY];
    return typeof stored === "number" ? stored : 0;
}

function drawFacingIndicator(token) {
    if (!token) return;

    if (token.thefadeFacingGraphic) {
        try { token.thefadeFacingGraphic.destroy(); } catch (_) { /* already gone */ }
        token.thefadeFacingGraphic = null;
    }

    if (!isFacingEligible(token)) return;

    const width = token.w ?? token.width ?? 100;
    const height = token.h ?? token.height ?? 100;
    const radius = Math.max(width, height) * 0.65;
    const halfArc = FRONT_ARC_HALF_DEG * Math.PI / 180;

    const g = new PIXI.Graphics();

    // Front-arc pie slice (local frame: 0° = east; rotated below).
    g.beginFill(ARC_COLOR, ARC_FILL_ALPHA);
    g.lineStyle(2, ARC_COLOR, ARC_LINE_ALPHA);
    g.moveTo(0, 0);
    g.arc(0, 0, radius, -halfArc, halfArc);
    g.lineTo(0, 0);
    g.endFill();

    // Solid arrowhead at the center of the arc so "front" is unambiguous.
    g.lineStyle(0);
    g.beginFill(ARC_COLOR, 1);
    const tip = radius + ARROWHEAD_LENGTH;
    g.moveTo(tip, 0);
    g.lineTo(radius, -ARROWHEAD_HALF_WIDTH);
    g.lineTo(radius, ARROWHEAD_HALF_WIDTH);
    g.closePath();
    g.endFill();

    g.position.set(width / 2, height / 2);
    const facingDeg = getTokenFacing(token) - FOUNDRY_ROTATION_OFFSET_DEG;
    g.rotation = (facingDeg * Math.PI) / 180;

    token.addChild(g);
    token.thefadeFacingGraphic = g;
}

function removeFacingIndicator(token) {
    if (!token?.thefadeFacingGraphic) return;
    try { token.thefadeFacingGraphic.destroy(); } catch (_) { /* already gone */ }
    token.thefadeFacingGraphic = null;
}

async function setTokenFacingToward(token, point) {
    if (!token || !point) return;
    const center = token.center;
    if (!center) return;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const mathAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const facing = (mathAngle + FOUNDRY_ROTATION_OFFSET_DEG + 360) % 360;
    await token.document.setFlag(FLAG_SCOPE, FLAG_KEY, facing);
}

Hooks.on("drawToken", drawFacingIndicator);
Hooks.on("refreshToken", drawFacingIndicator);
Hooks.on("destroyToken", removeFacingIndicator);

Hooks.on("updateToken", (tokenDoc, change) => {
    const facingChanged = change?.flags?.[FLAG_SCOPE]
        && Object.prototype.hasOwnProperty.call(change.flags[FLAG_SCOPE], FLAG_KEY);
    if (!facingChanged) return;
    const token = tokenDoc.object;
    if (token) drawFacingIndicator(token);
});

function buildFacingButton(token) {
    // Match Foundry v13's native HUD button markup so core styling applies.
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-icon thefade-set-facing";
    button.setAttribute("data-tooltip", "THEFADE.SetFacing");
    button.title = game.i18n.localize("THEFADE.SetFacing");
    button.innerHTML = '<i class="fa-solid fa-compass" inert></i>';
    button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const target = game.user.targets?.first();
        if (target && target !== token) {
            await setTokenFacingToward(token, target.center);
            ui.notifications.info(
                game.i18n.format("THEFADE.SetFacingTargeted", {
                    token: token.name,
                    target: target.name
                })
            );
            return;
        }

        ui.notifications.info(game.i18n.localize("THEFADE.SetFacingClickPrompt"));
        const onCanvasClick = async (clickEvent) => {
            try {
                const point = clickEvent.data?.getLocalPosition
                    ? clickEvent.data.getLocalPosition(canvas.stage)
                    : clickEvent.interactionData?.origin ?? clickEvent.data?.origin;
                if (!point) return;
                await setTokenFacingToward(token, point);
            } finally {
                canvas.stage.off("mousedown", onCanvasClick);
            }
        };
        canvas.stage.once("mousedown", onCanvasClick);
    });
    return button;
}

function injectFacingButton(hud, html) {
    console.debug("TheFade: renderTokenHUD fired", { hud, html });
    const token = hud?.object;
    if (!token) {
        console.warn("TheFade: renderTokenHUD fired without a token object", hud);
        return;
    }
    if (!isFacingEligible(token)) {
        console.debug("TheFade: skipping facing button (no actor)", token);
        return;
    }

    // v12 passed a jQuery object, v13 passes an HTMLElement. Accept either.
    const root = (html instanceof HTMLElement) ? html : (html?.[0] ?? html);
    if (!root?.querySelector) {
        console.warn("TheFade: renderTokenHUD received unexpected html", html);
        return;
    }

    // Avoid double-inject if the hook fires twice for the same render.
    if (root.querySelector(".thefade-set-facing")) return;

    const column =
        root.querySelector(".col.left") ??
        root.querySelector("[data-column='left']") ??
        root.querySelector(".left") ??
        root.querySelector(".col") ??
        root;
    if (column === root) {
        console.warn("TheFade: no column container found in TokenHUD; appending to root", root);
    }

    column.appendChild(buildFacingButton(token));
}

Hooks.on("renderTokenHUD", injectFacingButton);
