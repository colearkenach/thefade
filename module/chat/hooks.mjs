// Chat message rendering: viewer-specific controls and card interactions.
import { applyAttackDamage, resetAttackSpending, spendAttackOption } from "./attack-card.mjs";

const ACTIONS = {
    spend: (message, button) => spendAttackOption(message, button.dataset.option),
    resetSpend: message => resetAttackSpending(message),
    applyDamage: message => applyAttackDamage(message),
    openItem: async (message, button) => (await fromUuid(button.dataset.uuid))?.sheet.render(true),
    spellAction: async (message, button) => {
        const { handleSpellCardAction } = await import("./spell-card.mjs");
        return handleSpellCardAction(message, button);
    },
    ignition: async (message, button) => {
        const { handleIgnitionCardAction } = await import("../rules/ignition.mjs");
        return handleIgnitionCardAction(message, button);
    }
};

/** Remove controls the current viewer can't use, and wire the rest. */
function onRenderChatMessage(message, html) {
    const card = html.querySelector(".thefade.chat-card");
    if (!card) return;
    if (!game.user.isGM) html.querySelectorAll(".gm-only").forEach(el => el.remove());
    if (!message.isOwner) html.querySelectorAll(".owner-only").forEach(el => el.remove());
    card.addEventListener("click", async event => {
        const button = event.target.closest("[data-tf-action]");
        if (!button || button.disabled) return;
        event.preventDefault();
        button.disabled = true;
        try {
            await ACTIONS[button.dataset.tfAction]?.(message, button);
        } finally {
            button.disabled = false;
        }
    });
}

export function registerChatHooks() {
    Hooks.on("renderChatMessageHTML", onRenderChatMessage);
}
