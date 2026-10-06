// Token Action HUD support, built into the system: when TAH Core is active it
// asks for a SystemManager, and The Fade supplies one. Actions call the same
// actor and item methods the character sheet uses.
import { getAllSkills } from "../rules/skills.js";

const SYSTEM_ID = "thefade";
// TAH Core rejects a minor-version mismatch when a minor is given, so pin the major only.
const REQUIRED_CORE_MODULE_VERSION = "2";
const DELIMITER = "|";

const ACTION = { attribute: "attribute", skill: "skill", weapon: "weapon", spell: "spell", feature: "feature", item: "item", utility: "utility" };
const FEATURE_TYPES = new Set(["talent", "trait", "precept"]);
const INVENTORY_SKIP = new Set(["weapon", "spell", "skill", "path", "monsterpath", "species", "monsterspecies", "talent", "trait",
    "precept", "heritage", "mutation", "disease", "trap", "hazard", "downtime"]);

/** Groups are keyed by id; skill groups follow the system's skill categories. */
function groups() {
    const localize = key => game.i18n.localize(key);
    const list = [
        { id: "attributes", name: localize("THEFADE.Sheet.attributes") },
        ...Object.entries(CONFIG.THEFADE.skillCategories).map(([key, label]) => ({ id: `skills-${key.toLowerCase()}`, name: localize(label) })),
        { id: "weapons", name: localize("THEFADE.Sheet.weapons") },
        { id: "spells", name: localize("THEFADE.Magic.spells") },
        { id: "features", name: localize("THEFADE.TAH.features") },
        { id: "inventory", name: localize("THEFADE.Sheet.Tab.inventory") },
        { id: "utility", name: localize("THEFADE.TAH.utility") }
    ];
    return list.map(g => ({ ...g, type: "system", listName: g.name }));
}

function defaults() {
    const list = groups();
    const byId = Object.fromEntries(list.map(g => [g.id, g]));
    const category = (id, name, ids) => ({ nestId: id, id, name, groups: ids.map(gid => ({ ...byId[gid], nestId: `${id}_${gid}` })) });
    const skillGroups = list.filter(g => g.id.startsWith("skills-")).map(g => g.id);
    return {
        layout: [
            category("attributes", game.i18n.localize("THEFADE.Sheet.attributes"), ["attributes"]),
            category("skills", game.i18n.localize("THEFADE.Sheet.Tab.skills"), skillGroups),
            category("combat", game.i18n.localize("THEFADE.Sheet.Tab.combat"), ["weapons"]),
            category("magic", game.i18n.localize("THEFADE.Sheet.Tab.magic"), ["spells"]),
            category("features", game.i18n.localize("THEFADE.TAH.features"), ["features"]),
            category("inventory", game.i18n.localize("THEFADE.Sheet.Tab.inventory"), ["inventory"]),
            category("utility", game.i18n.localize("THEFADE.TAH.utility"), ["utility"])
        ],
        groups: list
    };
}

const encode = (type, id) => [type, id].join(DELIMITER);
const isRightClick = event => event?.type === "contextmenu" || event?.button === 2;

export function registerTokenActionHud() {
    Hooks.once("tokenActionHudCoreApiReady", coreModule => {
        const coreApi = coreModule?.api;
        if (!coreApi?.SystemManager) return;

        class TheFadeActionHandler extends coreApi.ActionHandler {
            async buildSystemActions() {
                const actor = this.actor;
                if (!actor || !["character", "npc"].includes(actor.type)) return;
                this.#attributes(actor);
                this.#skills(actor);
                this.#weapons(actor);
                this.#spells(actor);
                this.#features(actor);
                this.#inventory(actor);
                this.#utility();
            }

            #push(groupId, actions) {
                if (actions.length) this.addActions(actions, { id: groupId, type: "system" });
            }

            #attributes(actor) {
                this.#push("attributes", Object.entries(CONFIG.THEFADE.attributes).map(([key, config]) => ({
                    id: `attribute-${key}`,
                    name: game.i18n.localize(config.label),
                    encodedValue: encode(ACTION.attribute, key),
                    info1: { text: `${actor.system.attributes[key]?.total ?? 0}D` }
                })));
            }

            #skills(actor) {
                const pools = actor.system.skillPools ?? {};
                const grouped = {};
                for (const skill of getAllSkills(actor)) {
                    const groupId = `skills-${String(skill.category || "Physical").toLowerCase()}`;
                    const rank = CONFIG.THEFADE.skillRanks[skill.rank];
                    (grouped[groupId] ??= []).push({
                        id: `skill-${skill.key}`,
                        name: skill.name,
                        encodedValue: encode(ACTION.skill, skill.key),
                        info1: { text: rank?.abbreviation ?? "" },
                        info2: { text: pools[skill.key] ? `${pools[skill.key].dice}D` : "" }
                    });
                }
                for (const [groupId, actions] of Object.entries(grouped)) {
                    this.#push(groupId, actions.sort((a, b) => a.name.localeCompare(b.name)));
                }
            }

            #weapons(actor) {
                this.#push("weapons", actor.itemTypes.weapon.map(weapon => ({
                    id: `weapon-${weapon.id}`,
                    name: weapon.name,
                    img: weapon.img,
                    encodedValue: encode(ACTION.weapon, weapon.id),
                    info1: { text: `${actor.getWeaponAttackDice(weapon).dice}D` },
                    info2: { text: weapon.system.damageLabel ?? "" }
                })));
            }

            #spells(actor) {
                this.#push("spells", actor.items.filter(i => i.type === "spell").sort((a, b) => a.name.localeCompare(b.name)).map(spell => ({
                    id: `spell-${spell.id}`,
                    name: spell.name,
                    img: spell.img,
                    encodedValue: encode(ACTION.spell, spell.id),
                    info1: { text: spell.system.schoolLabel ?? "" },
                    info2: { text: spell.system.requirementsLabel ?? "" }
                })));
            }

            #features(actor) {
                this.#push("features", actor.items.filter(i => FEATURE_TYPES.has(i.type)).sort((a, b) => a.name.localeCompare(b.name)).map(item => {
                    const resource = item.resource;
                    return {
                        id: `feature-${item.id}`,
                        name: item.name,
                        img: item.img,
                        encodedValue: encode(ACTION.feature, item.id),
                        info1: { text: resource?.max ? `${resource.value}/${resource.max}` : "" }
                    };
                }));
            }

            #inventory(actor) {
                this.#push("inventory", actor.items.filter(i => !INVENTORY_SKIP.has(i.type)).sort((a, b) => a.name.localeCompare(b.name)).map(item => {
                    const resource = item.resource;
                    const quantity = Number(item.system.quantity) || 0;
                    return {
                        id: `item-${item.id}`,
                        name: item.name,
                        img: item.img,
                        encodedValue: encode(ACTION.item, item.id),
                        info1: { text: resource?.max ? `${resource.value}/${resource.max}` : quantity > 1 ? `×${quantity}` : "" }
                    };
                }));
            }

            #utility() {
                const action = (id, label) => ({ id: `utility-${id}`, name: game.i18n.localize(label), encodedValue: encode(ACTION.utility, id) });
                this.#push("utility", [
                    action("initiative", "THEFADE.Sheet.initiative"),
                    action("opposed", "THEFADE.Sheet.opposed"),
                    action("aid", "THEFADE.Sheet.aid"),
                    action("rest", "THEFADE.Rest.rest"),
                    action("sheet", "THEFADE.TAH.openSheet")
                ]);
            }
        }

        class TheFadeRollHandler extends coreApi.RollHandler {
            async handleActionClick(event, encodedValue) {
                const [type, id] = String(encodedValue).split(DELIMITER);
                const actor = this.actor;
                if (!actor) return;
                const item = id ? actor.items.get(id) : null;
                // Right-click any item action to open its sheet.
                if (item && isRightClick(event)) return item.sheet.render(true);
                switch (type) {
                    case ACTION.attribute: return actor.rollAttribute(id, { event });
                    case ACTION.skill: return actor.rollSkill(id, { event });
                    case ACTION.weapon: return item && actor.rollAttack(item, { event });
                    case ACTION.spell: return item && actor.castSpell(item, { event });
                    case ACTION.feature:
                    case ACTION.item: return item?.resource ? item.use() : item?.toChat();
                    case ACTION.utility: return this.#utility(actor, id);
                }
            }

            async #utility(actor, id) {
                switch (id) {
                    case "initiative": return actor.rollInitiative({ createCombatants: true });
                    case "opposed": return (await import("../rolls/opposed.mjs")).openOpposedRollDialog(actor);
                    case "aid": return (await import("../rolls/opposed.mjs")).openAidAnotherDialog(actor);
                    case "rest": return actor.takeRest();
                    case "sheet": return actor.sheet.render(true);
                }
            }
        }

        class TheFadeSystemManager extends coreApi.SystemManager {
            getActionHandler() { return new TheFadeActionHandler(); }
            getAvailableRollHandlers() { return { core: game.system.title }; }
            getRollHandler() { return new TheFadeRollHandler(); }
            async registerDefaults() { return defaults(); }
        }

        // TAH Core waits for this hook, then instantiates the SystemManager.
        Hooks.callAll("tokenActionHudSystemReady", {
            id: SYSTEM_ID,
            api: { SystemManager: TheFadeSystemManager, requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION }
        });
    });
}
