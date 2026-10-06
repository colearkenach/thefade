// World and client settings for The Fade.
import { getDefaultEncounterState, getDefaultSkillChallengeState } from "./apps/gm-toolkit-state.mjs";

/** Re-render toolkit parts when another GM changes shared toolkit state. */
async function refreshToolkit(parts, userId) {
    const { refreshGMToolkit } = await import("./apps/gm-toolkit.mjs");
    refreshGMToolkit(parts, userId);
}

/** Re-render open sheets for actors (or items) after a rules setting changes. */
function rerenderSheets({ actors = true, items = false } = {}) {
    for (const actor of game.actors ?? []) {
        actor.reset();
        if (actors && actor.sheet?.rendered) actor.sheet.render();
        if (items) for (const item of actor.items) if (item.sheet?.rendered) item.sheet.render();
    }
}

export function registerSettings() {
    const world = (key, config) => game.settings.register("thefade", key, { scope: "world", config: true, ...config });

    world("moreHPScaling", {
        name: "THEFADE.Setting.moreHP.name",
        hint: "THEFADE.Setting.moreHP.hint",
        type: Boolean,
        default: false,
        onChange: () => rerenderSheets()
    });

    world("characterCreationMode", {
        name: "THEFADE.Setting.creationMode.name",
        hint: "THEFADE.Setting.creationMode.hint",
        type: String,
        choices: { pointbuy: "THEFADE.Setting.creationMode.pointbuy", random: "THEFADE.Setting.creationMode.random" },
        default: "pointbuy",
        onChange: () => rerenderSheets()
    });

    world("alternateAnatomyEnabled", {
        name: "THEFADE.Setting.alternateAnatomy.name",
        hint: "THEFADE.Setting.alternateAnatomy.hint",
        type: Boolean,
        default: false,
        onChange: () => rerenderSheets()
    });

    world("fatePointsEnabled", {
        name: "THEFADE.Setting.fatePoints.name",
        hint: "THEFADE.Setting.fatePoints.hint",
        type: Boolean,
        default: false,
        onChange: () => rerenderSheets()
    });

    world("itemPowerSlotRule", {
        name: "THEFADE.Setting.itemPowerSlots.name",
        hint: "THEFADE.Setting.itemPowerSlots.hint",
        type: String,
        choices: { standard: "THEFADE.Setting.itemPowerSlots.standard", alternate: "THEFADE.Setting.itemPowerSlots.alternate" },
        default: "standard",
        onChange: () => {
            rerenderSheets({ items: true });
            refreshToolkit("power");
        }
    });

    world("itemPowerAttunementRule", {
        name: "THEFADE.Setting.attunement.name",
        hint: "THEFADE.Setting.attunement.hint",
        type: String,
        choices: {
            standard: "THEFADE.Setting.attunement.standard",
            removed: "THEFADE.Setting.attunement.removed",
            technology: "THEFADE.Setting.attunement.technology"
        },
        default: "standard",
        onChange: () => {
            rerenderSheets({ items: true });
            refreshToolkit("power");
        }
    });

    game.settings.register("thefade", "skipRollDialog", {
        name: "THEFADE.Setting.skipRollDialog.name",
        hint: "THEFADE.Setting.skipRollDialog.hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    // Internal state.
    game.settings.register("thefade", "systemMigrationVersion", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("thefade", "skillChallengeState", {
        scope: "world", config: false, type: Object, default: getDefaultSkillChallengeState(),
        onChange: (value, options, userId) => refreshToolkit("challenge", userId)
    });
    game.settings.register("thefade", "encounterState", {
        scope: "world", config: false, type: Object, default: getDefaultEncounterState(),
        onChange: (value, options, userId) => refreshToolkit("encounter", userId)
    });
}
