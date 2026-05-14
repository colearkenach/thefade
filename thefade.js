// Entry point for The Fade system; registers documents, sheets, and hooks.
import { PATH_SKILL_TYPES } from './src/constants.js';
import { applyBonusHandlers } from './src/chat.js';
import {
    getRankValue, initializeDefaultSkills, createCustomSkill,
    showChooseRegularSkillsDialog, showChooseLoreSkillsDialog,
    showChoosePerformSkillsDialog, showChooseCraftSkillsDialog,
    applyPathSkillModifications
} from './src/helpers.js';
import { TheFadeActor } from './src/actor.js';
import { TheFadeItem } from './src/item.js';
import { TheFadeItemSheet } from './src/item-sheet.js';
import { TheFadeCharacterSheet } from './src/character-sheet.js';
import { TheFadeNPCSheet } from './src/npc-sheet.js';
import { TheFadePartySheet } from './src/party-sheet.js';
import { TheFadeShopSheet } from './src/shop-sheet.js';
import { computePerRoundDamage, CONDITION_EFFECTS } from './src/conditions.js';
import './src/token-facing.js';
import { registerTokenActionHud } from './src/integrations/token-action-hud/index.js';
import { migrateAllActorSkills } from './src/skills.js';

registerTokenActionHud();


/**
 * Register all item sheet types for the system
 */
function registerItemSheets() {
    Items.registerSheet("thefade", TheFadeItemSheet, {
        types: [
            "weapon", "armor", "skill", "path", "spell", "talent", "trait", "precept",
            "species", "drug", "poison", "disease", "biological", "medical", "travel",
            "mount", "vehicle", "musical", "potion", "staff", "wand", "gate",
            "communication", "containment", "dream", "fleshcraft", "magicitem", "clothing"
        ],
        makeDefault: true
    });
}

// --------------------------------------------------------------------
// CHAT MESSAGE HANDLERS
// --------------------------------------------------------------------

/**
* Handle bonus options in chat messages
* @param {HTMLElement} html - Chat message HTML
*/
/**
* Chat message rendering hook - add interactive elements to chat
*/
Hooks.on("renderChatMessage", (message, html, data) => {
    applyBonusHandlers(html);
});

/**
* Apply system theme class to dialog apps rendered from this system so that
* CSS in styles/thefade.css can style them. Keeps each new Dialog() call clean.
*/
Hooks.on("renderDialog", (app, html, data) => {
    const el = html?.[0] ?? html;
    if (el && el.classList && !el.classList.contains("thefade")) {
        el.classList.add("thefade");
    }
});

/**
 * Turn-start periodic damage hook: applies Bleed (and any future
 * damage-per-round condition) to the combatant whose turn just started.
 * Only the active GM executes the update to avoid duplicate damage.
 */
Hooks.on("combatTurn", async (combat, updateData, updateOptions) => {
    if (!game.user?.isGM) return;
    try {
        const nextTurnIndex = updateData?.turn ?? combat?.turn;
        const combatant = combat?.turns?.[nextTurnIndex];
        const actor = combatant?.actor;
        if (!actor || !["character","npc"].includes(actor.type)) return;

        const ticks = computePerRoundDamage(actor.system?.conditions);
        if (!ticks.length) return;

        const total = ticks.reduce((sum, t) => sum + t.damage, 0);
        const currentHP = Number(actor.system?.hp?.value ?? 0);
        const newHP = currentHP - total;

        await actor.update({ "system.hp.value": newHP });

        const lines = ticks.map(t => `<li>${t.label} (${t.intensity}): ${t.damage} damage</li>`).join("");
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<p><strong>${actor.name}</strong> suffers periodic damage at turn start:</p><ul>${lines}</ul><p>HP ${currentHP} → ${newHP}</p>`
        });
    } catch (err) {
        console.error("The Fade: error applying turn-start condition damage", err);
    }
});




// ====================================================================
// 5. SYSTEM HOOKS & INITIALIZATION
// ====================================================================

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
        "drug", "poison", "disease", "biological", "medical", "travel", "mount", "vehicle",
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
        disease: "TYPES.Item.disease",
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
    // WORLD SETTINGS
    // --------------------------------------------------------------------

    game.settings.register("thefade", "characterCreationMode", {
        name: "THEFADE.SettingCreationMode",
        hint: "THEFADE.SettingCreationModeHint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            pointbuy: "THEFADE.SettingCreationModePointBuy",
            random: "THEFADE.SettingCreationModeRandom"
        },
        default: "pointbuy",
        onChange: () => {
            for (const app of Object.values(ui.windows)) {
                if (app?.actor?.type === "character" && typeof app.render === "function") {
                    app.render(false);
                }
            }
        }
    });

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

    // Register NPC sheet
    Actors.registerSheet("thefade", TheFadeNPCSheet, {
        types: ["npc"],
        makeDefault: true
    });

    // Register Party sheet
    Actors.registerSheet("thefade", TheFadePartySheet, {
        types: ["party"],
        makeDefault: true
    });

    // Register Shop sheet
    Actors.registerSheet("thefade", TheFadeShopSheet, {
        types: ["shop"],
        makeDefault: true
    });

    // Register The Fade item sheet
    Items.registerSheet("thefade", TheFadeItemSheet, {
        types: [
            "weapon", "armor", "skill", "path", "spell", "talent", "trait", "precept",
            "species", "drug", "poison", "disease", "biological", "medical", "travel", "item",
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
        "systems/thefade/templates/actor/npc-sheet.html",
        "systems/thefade/templates/actor/party-sheet.html",
        "systems/thefade/templates/actor/shop-sheet.html",
        "systems/thefade/templates/actor/parts/attributes.html",
        "systems/thefade/templates/actor/parts/skills.html",
        "systems/thefade/templates/actor/parts/skill-row.html",
        "systems/thefade/templates/actor/parts/inventory.html",
        "systems/thefade/templates/actor/parts/paths.html",
        "systems/thefade/templates/actor/parts/spells.html",
        "systems/thefade/templates/actor/parts/combat-state.html",
        "systems/thefade/templates/actor/parts/injuries.html",
        "systems/thefade/templates/actor/parts/vitals-hp-sanity.html",
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
        "systems/thefade/templates/item/disease-sheet.html",
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
        formula: "1d12 + @system.attributes.finesse.total",
        decimals: 0
    };

    // Override initiative formula calculation
    Combat.prototype.getInitiativeFormula = function (combatant) {
        const actor = combatant.actor;
        if (!actor) return "1d12";

        if (["character", "npc"].includes(actor.type)) {
            const finesse = actor.system.attributes?.finesse?.value || 0;
            const mind = actor.system.attributes?.mind?.value || 0;
            const bonus = (actor.system.initiativeBonus || 0);
            const modifier = Math.floor((finesse + mind) / 2) + bonus;
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
            await roll.evaluate();

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

    // Return `value` if it's a number (including 0), otherwise `fallback`.
    // Used for armor/ND pools where 0 means "drained" but {{#if}} would
    // wrongly treat it as unset and show max instead of 0.
    Handlebars.registerHelper('numberOr', function (value, fallback) {
        return (typeof value === 'number') ? value : fallback;
    });
});

/**
 * Seed new armor with its starting AP on creation. prepareData no longer
 * refills currentAP when it hits 0 (that was the "broken armor refills
 * itself" bug), so freshly created armor needs currentAP populated once
 * here to avoid starting at 0.
 */
Hooks.on("preCreateItem", (item, data, options, userId) => {
    if (item.type !== "armor") return;
    const system = data.system || {};
    const ap = Number(system.ap) || 0;
    const apInc = Number(system.apIncrease) || 0;
    const effectiveMax = ap + apInc;
    const updates = {};
    if (system.currentAP === undefined || system.currentAP === null || system.currentAP === 0) {
        updates["system.currentAP"] = effectiveMax;
    }
    const isLimb = ["Arms", "Legs", "Arms+", "Legs+"].includes(system.location);
    if (isLimb && (system.otherLimbAP === undefined || system.otherLimbAP === null || system.otherLimbAP === 0)) {
        updates["system.otherLimbAP"] = effectiveMax;
    }
    if (Object.keys(updates).length) item.updateSource(updates);
});

/**
* Item creation hook - handle path and species application
*/
Hooks.on("createItem", async (item, options, userId) => {
    // Handle Path addition to characters - use new skill modification system
    if (item.type === 'path' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
        const actor = item.parent;
        const path = item;

        if (actor.getFlag("thefade", "addingSkills")) return;
        await actor.setFlag("thefade", "addingSkills", true);

        try {
            await applyPathSkillModifications(actor, path);
        } finally {
            await actor.unsetFlag("thefade", "addingSkills");
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
        const updatedAttributes = foundry.utils.deepClone(actor.system.attributes);
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

    // Talent prereq acknowledgement: we can't parse free-text, but we
    // can surface the prerequisites and require the player/GM to
    // confirm eligibility. Declining deletes the just-added talent.
    if (item.type === 'talent' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
        const prereqs = (item.system.prerequisites || "").trim();
        if (!prereqs) return;
        const keep = await Dialog.confirm({
            title: `Talent Prerequisites: ${item.name}`,
            content: `<p><strong>${item.name}</strong> lists prerequisites:</p><blockquote>${prereqs}</blockquote><p>Does <strong>${item.parent.name}</strong> meet them?</p>`,
            yes: () => true,
            no: () => false,
            defaultYes: true
        });
        if (!keep) {
            await item.delete();
            ui.notifications.warn(`${item.name} removed: prerequisites not met.`);
        }
    }
});

Hooks.on("createActor", async (actor, options, userId) => {
    // New actors no longer need skill items created up-front; core skills
    // live in DEFAULT_SKILLS and are surfaced via getSkill helpers.
});

/**
 * System ready hook - final setup after all systems loaded
 */
Hooks.once('ready', async function () {
    // One-shot migration: convert legacy skill items into actor.system.skills.
    if (game.user.isGM) {
        try { await migrateAllActorSkills(); }
        catch (err) { console.warn("thefade | skill migration error:", err); }
    }

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

// --------------------------------------------------------------------