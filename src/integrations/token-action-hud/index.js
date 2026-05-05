// Entry point for The Fade's Token Action HUD integration.
// Listens for TAH Core's API hook and registers a SystemManager so Core treats
// The Fade as if it had a companion module, even though the integration lives
// inside the system itself.
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from "./constants.js";
import { buildDefaults } from "./defaults.js";
import { makeActionHandler } from "./action-handler.js";
import { makeRollHandler } from "./roll-handler.js";

export function registerTokenActionHud() {
    Hooks.on("tokenActionHudCoreApiReady", (coreModule) => {
        const coreApi = coreModule?.api;
        if (!coreApi?.SystemManager) return;

        const ActionHandler = makeActionHandler(coreApi);
        const RollHandler = makeRollHandler(coreApi);

        class TheFadeSystemManager extends coreApi.SystemManager {
            getActionHandler() { return new ActionHandler(); }

            getAvailableRollHandlers() {
                return { core: "The Fade" };
            }

            getRollHandler(_id) { return new RollHandler(); }

            async registerDefaults() { return buildDefaults(); }
        }

        // Hand the SystemManager to TAH Core. Core listens on this hook and
        // calls `new api.SystemManager(coreModuleId)` once it sees us.
        Hooks.callAll("tokenActionHudSystemReady", {
            id: MODULE.ID,
            api: {
                SystemManager: TheFadeSystemManager,
                requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION
            }
        });
    });
}
