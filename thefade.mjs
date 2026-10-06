// The Fade (Abyss) — system entry point.
import THEFADE from "./module/config.mjs";
import CharacterData from "./module/data/actor/character.mjs";
import { NpcData, PartyData, ShopData } from "./module/data/actor/group.mjs";
import { ITEM_MODELS } from "./module/data/item/_module.mjs";
import TheFadeActor from "./module/documents/actor.mjs";
import TheFadeItem from "./module/documents/item.mjs";
import TheFadeCombat from "./module/documents/combat.mjs";
import FadeRoll, { registerDiceModifier } from "./module/dice/fade-roll.mjs";
import { registerSettings } from "./module/settings.mjs";
import { registerSheets } from "./module/sheets/_module.mjs";
import { registerHandlebarsHelpers, preloadTemplates } from "./module/handlebars.mjs";
import { registerChatHooks } from "./module/chat/hooks.mjs";
import { registerTheFadeStatusEffects } from "./module/rules/conditions.js";
import { migrateWorld, needsMigration } from "./module/migration.mjs";
import { registerTokenFacing } from "./module/canvas/token-facing.mjs";
import { registerSocket } from "./module/socket.mjs";
import { registerTokenActionHud } from "./module/integrations/token-action-hud.mjs";
import { registerIgnitionHooks } from "./module/rules/ignition.mjs";
import "./module/apps/shop-trade.mjs";
import * as api from "./module/api.mjs";

Hooks.once("init", () => {
    console.log("thefade | Initializing The Fade (Abyss)");
    CONFIG.THEFADE = THEFADE;
    globalThis.thefade = game.thefade = { config: THEFADE, api };

    // Documents and data models.
    CONFIG.Actor.documentClass = TheFadeActor;
    CONFIG.Actor.dataModels = { character: CharacterData, npc: NpcData, party: PartyData, shop: ShopData };
    CONFIG.Actor.trackableAttributes = {
        character: { bar: ["hp", "sanity"], value: ["darkMagic.currentSin", "fate.points"] },
        npc: { bar: ["hp", "sanity"], value: [] }
    };
    CONFIG.Item.documentClass = TheFadeItem;
    CONFIG.Item.dataModels = ITEM_MODELS;
    CONFIG.Combat.documentClass = TheFadeCombat;

    // Initiative: 1d12 + the average of Finesse and Mind + bonuses (Core p. 18).
    CONFIG.Combat.initiative = { formula: "1d12 + @initiative", decimals: 0 };

    // Dice.
    registerDiceModifier();
    CONFIG.Dice.rolls.unshift(FadeRoll);

    registerSettings();
    registerTheFadeStatusEffects();
    registerSheets();
    registerHandlebarsHelpers();
    registerChatHooks();
    registerTokenFacing();
    registerTokenActionHud();
    registerIgnitionHooks();
    return preloadTemplates();
});

Hooks.once("ready", async () => {
    registerSocket();
    // Some modules append generic statuses during setup; The Fade owns the palette.
    registerTheFadeStatusEffects();
    if (game.user.isActiveGM && needsMigration()) await promptMigration();
});

/**
 * World data from older versions is rewritten in place, so ask the GM first
 * and suggest a backup. Declining leaves the world untouched until next load.
 */
async function promptMigration() {
    const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "THEFADE.Migration.title", icon: "fa-solid fa-database" },
        classes: ["thefade"],
        content: `<p>${game.i18n.format("THEFADE.Migration.prompt", { world: foundry.utils.escapeHTML(game.world.title) })}</p>`,
        yes: { label: "THEFADE.Migration.now", icon: "fa-solid fa-check" },
        no: { label: "THEFADE.Migration.later", icon: "fa-solid fa-clock" },
        rejectClose: false
    });
    if (proceed) return migrateWorld();
    ui.notifications.warn("THEFADE.Migration.deferred", { localize: true, permanent: true });
}

// The GM Toolkit sits in the Token controls, below Unconstrained Movement.
Hooks.on("getSceneControlButtons", controls => {
    const tools = controls?.tokens?.tools;
    if (!tools) return;
    tools.thefadeGMToolkit = {
        name: "thefadeGMToolkit",
        order: 5,
        title: "THEFADE.GMToolkit.title",
        icon: "fa-solid fa-toolbox",
        button: true,
        visible: game.user.isGM,
        onChange: () => api.openGMToolkit()
    };
});
