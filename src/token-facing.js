// Token facing visual indicator and Token HUD "Set Facing" control.
// The front arc spans ±45° from the token's rotation, matching the
// front/flank boundaries used in character-sheet.js _calculateFacingFromTokens.

const FRONT_ARC_HALF_DEG = 45;
const ARC_COLOR = 0xF5C542;
const ARC_FILL_ALPHA = 0.15;
const ARC_LINE_ALPHA = 0.7;

function isFacingEligible(token) {
    return token?.actor?.type === "character";
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
    g.beginFill(ARC_COLOR, ARC_FILL_ALPHA);
    g.lineStyle(2, ARC_COLOR, ARC_LINE_ALPHA);
    g.moveTo(0, 0);
    g.arc(0, 0, radius, -halfArc, halfArc);
    g.lineTo(0, 0);
    g.endFill();

    g.position.set(width / 2, height / 2);
    g.rotation = ((token.document?.rotation ?? 0) * Math.PI) / 180;
    g.zIndex = -1;

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
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    await token.document.update({ rotation: angle });
}

Hooks.on("drawToken", drawFacingIndicator);
Hooks.on("refreshToken", drawFacingIndicator);
Hooks.on("destroyToken", removeFacingIndicator);

Hooks.on("renderTokenHUD", (hud, html, data) => {
    const token = hud?.object;
    if (!isFacingEligible(token)) return;

    const root = html?.[0] ?? html;
    if (!root) return;
    const column = root.querySelector(".col.left") ?? root.querySelector(".col");
    if (!column) return;

    const button = document.createElement("div");
    button.className = "control-icon thefade-set-facing";
    button.title = game.i18n.localize("THEFADE.SetFacing");
    button.innerHTML = '<i class="fas fa-compass"></i>';
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

    column.appendChild(button);
});
