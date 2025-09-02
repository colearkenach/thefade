import { applyBonusHandlers } from './chat.js';
import { TheFadeActor } from './actor.js';
import { TheFadeItem } from './item.js';
import { TheFadeCharacterSheet } from './character-sheet.js';
import { TheFadeItemSheet } from './item-sheet.js';
import { PATH_SKILL_TYPES } from './constants.js';
import { createCustomSkill, showChooseRegularSkillsDialog, showChooseLoreSkillsDialog, showChoosePerformSkillsDialog, showChooseCraftSkillsDialog, initializeDefaultSkills, getRankValue } from './skills.js';

export function registerSystemHooks() {
    Hooks.on("renderChatMessage", (message, html) => {
        applyBonusHandlers(html);
    });
    /**
     * System initialization - register sheets and configure system
     */
    Hooks.once('init', async function () {
    // --------------------------------------------------------------------
    // CORE SYSTEM CONFIGURATION
    // --------------------------------------------------------------------

    // Define custom document classes
    CONFIG.Actor.documentClass = TheFadeActor;
    CONFIG.Item.documentClass = TheFadeItem;

    // Define all available item types (must match template.json)
    CONFIG.Item.types = [
        "weapon", "armor", "skill", "path", "spell", "talent", "species",
        "drug", "poison", "biological", "medical", "travel", "mount", "vehicle",
        "musical", "potion", "staff", "wand", "gate", "communication",
        "containment", "dream", "fleshcraft", "magicitem", "clothing", "trait", "precept"
    ];

    // Define item type labels for display
    CONFIG.Item.typeLabels = {
        weapon: "TYPES.Item.weapon",
        armor: "TYPES.Item.armor",
        skill: "TYPES.Item.skill",
        path: "TYPES.Item.path",
        spell: "TYPES.Item.spell",
        talent: "TYPES.Item.talent",
        trait: "TYPES.Item.trait",
        precept: "TYPES.Item.precept",
        species: "TYPES.Item.species",
        drug: "TYPES.Item.drug",
        poison: "TYPES.Item.poison",
        biological: "TYPES.Item.biological",
        medical: "TYPES.Item.medical",
        travel: "TYPES.Item.travel",
        mount: "TYPES.Item.mount",
        vehicle: "TYPES.Item.vehicle",
        musical: "TYPES.Item.musical",
        potion: "TYPES.Item.potion",
        staff: "TYPES.Item.staff",
        wand: "TYPES.Item.wand",
        gate: "TYPES.Item.gate",
        communication: "TYPES.Item.communication",
        containment: "TYPES.Item.containment",
        dream: "TYPES.Item.dream",
        fleshcraft: "TYPES.Item.fleshcraft",
        magicitem: "TYPES.Item.magicitem",
        clothing: "TYPES.Item.clothing"
    };

    // --------------------------------------------------------------------
    // SHEET REGISTRATION
    // --------------------------------------------------------------------

    // Unregister default sheets
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    // Register The Fade character sheet
    Actors.registerSheet("thefade", TheFadeCharacterSheet, {
        types: ["character"],
        makeDefault: true
    });

    // Register The Fade item sheet
    Items.registerSheet("thefade", TheFadeItemSheet, {
        types: [
            "weapon", "armor", "skill", "path", "spell", "talent", "trait", "precept",
            "species", "drug", "poison", "biological", "medical", "travel", "item",
            "mount", "vehicle", "musical", "potion", "staff", "wand", "gate",
            "communication", "containment", "dream", "fleshcraft", "magicitem", "clothing"
        ],
        makeDefault: true
    });

    // --------------------------------------------------------------------
    // TEMPLATE PRELOADING
    // --------------------------------------------------------------------

    await loadTemplates([
        "systems/thefade/templates/actor/character-sheet.html",
        "systems/thefade/templates/actor/parts/attributes.html",
        "systems/thefade/templates/actor/parts/skills.html",
        "systems/thefade/templates/actor/parts/inventory.html",
        "systems/thefade/templates/actor/parts/paths.html",
        "systems/thefade/templates/actor/parts/spells.html",
        "systems/thefade/templates/chat/attack-roll.html",
        "systems/thefade/templates/chat/skill-roll.html",
        "systems/thefade/templates/chat/spell-cast.html",
        "systems/thefade/templates/dialogs/ability-edit.html",
        "systems/thefade/templates/dialogs/character-select.html",

        "systems/thefade/templates/item/communication-sheet.html",
        "systems/thefade/templates/item/containment-sheet.html",
        "systems/thefade/templates/item/dream-sheet.html",
        "systems/thefade/templates/item/drug-sheet.html",
        "systems/thefade/templates/item/fleshcraft-sheet.html",
        "systems/thefade/templates/item/gate-sheet.html",
        "systems/thefade/templates/item/medical-sheet.html",
        "systems/thefade/templates/item/mount-sheet.html",
        "systems/thefade/templates/item/musical-sheet.html",
        "systems/thefade/templates/item/poison-sheet.html",
        "systems/thefade/templates/item/potion-sheet.html",
        "systems/thefade/templates/item/staff-sheet.html",
        "systems/thefade/templates/item/travel-sheet.html",
        "systems/thefade/templates/item/vehicle-sheet.html",
        "systems/thefade/templates/item/wand-sheet.html",
        "systems/thefade/templates/item/clothing-sheet.html",
        "systems/thefade/templates/item/trait-sheet.html",
        "systems/thefade/templates/item/precept-sheet.html"

    ]);

    // --------------------------------------------------------------------
    // INITIATIVE SYSTEM CONFIGURATION
    // --------------------------------------------------------------------

    CONFIG.Combat.initiative = {
        formula: "1d12 + @system.attributes.finesse.value",
        decimals: 0
    };

    // Override initiative formula calculation
    Combat.prototype.getInitiativeFormula = function (combatant) {
        const actor = combatant.actor;
        if (!actor) return "1d12";

        if (actor.type === "character") {
            const finesse = actor.system.attributes.finesse?.value || 0;
            const mind = actor.system.attributes.mind?.value || 0;
            const modifier = Math.floor((finesse + mind) / 2);
            return `1d12 + ${modifier}`;
        }

        return "1d12";
    };

    // Override initiative rolling
    const originalRollInitiative = Combat.prototype.rollInitiative;
    Combat.prototype.rollInitiative = async function (ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        ids = typeof ids === "string" ? [ids] : ids;

        for (let id of ids) {
            const combatant = this.combatants.get(id);
            if (!combatant?.isOwner) continue;

            const actorFormula = this.getInitiativeFormula(combatant);
            const roll = new Roll(actorFormula);
            await roll.evaluate({ async: true });

            await this.updateEmbeddedDocuments("Combatant", [{
                _id: id,
                initiative: roll.total
            }]);

            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({
                    actor: combatant.actor,
                    token: combatant.token,
                    alias: combatant.name
                }),
                flavor: `${combatant.name} rolls for Initiative!`,
                flags: { initiativeRoll: true }
            });
        }

        if (updateTurn && this.turns) {
            await this.update({ turn: 0 });
        }

        return this;
    };

    // --------------------------------------------------------------------
    // HANDLEBARS HELPERS
    // --------------------------------------------------------------------

    Handlebars.registerHelper('titleCase', function (str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    });

    Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
    });

    Handlebars.registerHelper('ifEquals', function (a, b, options) {
        return (a === b) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('lowercase', function (str) {
        return (str || '').toLowerCase();
    });

    Handlebars.registerHelper('times', function (n, block) {
        let accum = '';
        for (let i = 1; i <= n; ++i)
            accum += block.fn(i);
        return accum;
    });

    Handlebars.registerHelper('concat', function () {
        let outStr = '';
        for (let arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });
});

/**
* Item creation hook - handle path and species application
*/
Hooks.on("createItem", async (item, options, userId) => {
    // Handle Path addition to characters - use new skill modification system
    if (item.type === 'path' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
        const actor = item.parent;
        const path = item;

        // Check if the path has associated skills
        if (path.system.pathSkills && path.system.pathSkills.length > 0) {
            let skillsModified = 0;
            let customSkillsCreated = 0;
            let choicesMade = 0;

            for (const pathSkill of path.system.pathSkills) {
                const entryType = pathSkill.system.entryType;

                switch (entryType) {
                    case PATH_SKILL_TYPES.SPECIFIC_SKILL:
                        // Handle specific core skills
                        const coreSkill = actor.items.find(i =>
                            i.type === 'skill' && i.name === pathSkill.name
                        );

                        if (coreSkill) {
                            // Upgrade existing skill if path offers better training
                            const pathRankValue = getRankValue(pathSkill.system.rank);
                            const currentRankValue = getRankValue(coreSkill.system.rank);

                            if (pathRankValue > currentRankValue) {
                                await coreSkill.update({
                                    "system.rank": pathSkill.system.rank
                                });
                                skillsModified++;
                            }
                        } else {
                            // Create new skill
                            const newSkill = {
                                name: pathSkill.name,
                                type: "skill",
                                system: {
                                    rank: pathSkill.system.rank,
                                    category: pathSkill.system.category,
                                    attribute: pathSkill.system.attribute
                                }
                            };
                            await actor.createEmbeddedDocuments("Item", [newSkill]);
                            skillsModified++;
                        }
                        break;

                    case PATH_SKILL_TYPES.SPECIFIC_CUSTOM:
                        // Create specific custom skill
                        const skillType = pathSkill.system.skillType;
                        const subtype = pathSkill.system.subtype;
                        await createCustomSkill(actor, skillType, subtype, pathSkill.system.rank);
                        customSkillsCreated++;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_CATEGORY:
                        // Show dialog to choose from category
                        await showChooseRegularSkillsDialog(
                            actor,
                            pathSkill.system.chooseCount,
                            pathSkill.system.chooseCategory,
                            pathSkill.system.rank,
                            path
                        );
                        choicesMade++;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_LORE:
                        // Show dialog to create lore skills
                        await showChooseLoreSkillsDialog(
                            actor,
                            pathSkill.system.chooseCount,
                            pathSkill.system.rank
                        );
                        choicesMade++;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_PERFORM:
                        // Show dialog to create perform skills
                        await showChoosePerformSkillsDialog(
                            actor,
                            pathSkill.system.chooseCount,
                            pathSkill.system.rank
                        );
                        choicesMade++;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_CRAFT:
                        // Show dialog to create craft skills
                        await showChooseCraftSkillsDialog(
                            actor,
                            pathSkill.system.chooseCount,
                            pathSkill.system.rank
                        );
                        choicesMade++;
                        break;

                    default:
                        // Fallback for old-style entries without entryType
                        const existingSkill = actor.items.find(i =>
                            i.type === 'skill' && i.name === pathSkill.name
                        );

                        if (!existingSkill) {
                            const newSkill = duplicate(pathSkill);
                            delete newSkill._id;
                            await actor.createEmbeddedDocuments("Item", [newSkill]);
                            skillsModified++;
                        } else {
                            const pathRankValue = getRankValue(pathSkill.system.rank);
                            const existingRankValue = getRankValue(existingSkill.system.rank);

                            if (pathRankValue > existingRankValue) {
                                await existingSkill.update({
                                    "system.rank": pathSkill.system.rank
                                });
                                skillsModified++;
                            }
                        }
                        break;
                }
            }

            // Show results
            let message = [];
            if (skillsModified > 0) message.push(`${skillsModified} skills improved`);
            if (customSkillsCreated > 0) message.push(`${customSkillsCreated} custom skills added`);
            if (choicesMade > 0) message.push(`${choicesMade} skill choices made`);

            if (message.length > 0) {
                ui.notifications.info(`${path.name} applied to ${actor.name}: ${message.join(', ')}`);
            }
        }
    }

    // Handle Species addition to characters
    if (item.type === 'species' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
        const actor = item.parent;
        const species = item;

        // Clear existing species bonuses
        const deletions = {};
        for (const attr of Object.keys(actor.system.attributes)) {
            deletions[`system.attributes.${attr}.speciesBonus`] = null;
            deletions[`system.attributes.${attr}.flexibleBonus`] = null;
        }


        deletions["system.species.flexibleBonus"] = {
            value: 0,
            selectedAttribute: ""
        };

        await actor.update(deletions);

        await initializeDefaultSkills(actor);

        // Apply new species data
        await actor.update({
            "system.species": {
                name: species.name,
                baseHP: species.system.baseHP,
                size: species.system.size,
                creatureType: species.system.creatureType || "humanoid",
                creatureSubtype: species.system.creatureSubtype || "",
                languages: species.system.languages || "",
                speciesAbilities: species.system.speciesAbilities || {},
                flexibleBonus: {
                    value: species.system.flexibleBonus?.value || 0,
                    selectedAttribute: ""
                }
            },
            "system.movement": {
                land: species.system.movement?.land || 4,
                fly: species.system.movement?.fly || 0,
                swim: species.system.movement?.swim || 0,
                climb: species.system.movement?.climb || 0,
                burrow: species.system.movement?.burrow || 0
            },
            "system.overland-movement": {
                landOverland: species.system.movement?.land * 6 || 0,
                flyOverland: species.system.movement?.fly * 6 || 0,
                swimOverland: species.system.movement?.swim * 6 || 0,
                climbOverland: species.system.movement?.climb * 6 || 0,
                burrowOverland: species.system.movement?.burrow * 6 || 0
            }
        });

        // Apply ability bonuses
        const updatedAttributes = duplicate(actor.system.attributes);
        for (const [attr, bonus] of Object.entries(species.system.abilityBonuses)) {
            if (updatedAttributes[attr] && bonus !== 0) {
                updatedAttributes[attr].speciesBonus = bonus;
            }
        }

        await actor.update({
            "system.attributes": updatedAttributes
        });

        // Update abilities text
        let abilitiesText = "";
        if (species.system.speciesAbilities) {
            for (const [id, ability] of Object.entries(species.system.speciesAbilities)) {
                if (ability.name && ability.description) {
                    abilitiesText += `• ${ability.name}: ${ability.description}\n`;
                }
            }
        }

        await actor.update({
            "system.species.abilities": abilitiesText
        });

        ui.notifications.info(`Applied ${species.name} species to ${actor.name}.`);
    }
});

/**
 * System ready hook - final setup after all systems loaded
 */
Hooks.once('ready', async function () {
    if (game.user.isGM) {
        let initButton = $(`<button id="fade-init-skills">Initialize All Character Skills</button>`);
        initButton.click(async function () {
            ui.notifications.info("Initializing skills for all characters...");

            const characters = game.actors.filter(a => a.type === "character");
            let count = 0;

            for (let character of characters) {
                await initializeDefaultSkills(character);
                count++;
            }

            ui.notifications.info(`Initialized skills for ${count} characters.`);
        });

        $('#controls').append(initButton);
        initButton.css({
            "position": "fixed",
            "bottom": "60px", // Above the existing fix button
            "left": "10px",
            "z-index": "1000"
        });
    }
});
}

