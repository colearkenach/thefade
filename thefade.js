// Entry point for The Fade system; wires up documents and hooks
import { registerSystemHooks } from './src/hooks.js';

export { TheFadeActor } from './src/actor.js';
export { TheFadeCharacterSheet } from './src/character-sheet.js';
export { TheFadeItem } from './src/item.js';
export { TheFadeItemSheet } from './src/item-sheet.js';

registerSystemHooks();

import { SIZE_OPTIONS, AURA_COLOR_OPTIONS, AURA_SHAPE_OPTIONS, FLEXIBLE_BONUS_OPTIONS, BODY_PARTS, DEFAULT_WEAPON, DEFAULT_ARMOR, DEFAULT_SKILL } from './src/constants.js';
import { applyBonusHandlers } from './src/chat.js';

/**
 * Default skills that every character should have (from The Fade Abyss)
 */
const DEFAULT_SKILLS = [
    // Combat Skills
    { name: "Axe", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Bow", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Cudgel", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Firearm", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Polearm", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Sword", category: "Combat", attribute: "physique", rank: "untrained" },
    { name: "Thrown", category: "Combat", attribute: "finesse", rank: "untrained" },
    { name: "Unarmed", category: "Combat", attribute: "physique", rank: "untrained" }, // Default to PHY, can be changed

    // Craft Skills
    { name: "Blacksmithing", category: "Craft", attribute: "physique", rank: "untrained" },
    { name: "Carpentry", category: "Craft", attribute: "finesse", rank: "untrained" },
    { name: "Chemistry", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Cooking", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Herbalism", category: "Craft", attribute: "mind", rank: "untrained" },
    { name: "Toxicology", category: "Craft", attribute: "mind", rank: "untrained" },

    // Knowledge Skills
    { name: "Appraise", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Gambling", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Insight", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Linguistics", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Medicine", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Research", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Symbology", category: "Knowledge", attribute: "mind", rank: "untrained" },
    { name: "Tracking", category: "Knowledge", attribute: "mind", rank: "untrained" },

    // Magical Skills
    { name: "Arcana", category: "Magical", attribute: "mind", rank: "untrained" },
    { name: "Spellcasting", category: "Magical", attribute: "soul", rank: "untrained" },
    { name: "Ritual", category: "Magical", attribute: "mind_soul", rank: "untrained" }, // Combined attribute

    // Physical Skills
    { name: "Acrobatics", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Athletics", category: "Physical", attribute: "physique", rank: "untrained" },
    { name: "Contortion", category: "Physical", attribute: "physique_finesse", rank: "untrained" }, // Combined attribute
    { name: "Drive", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Flight", category: "Physical", attribute: "physique_finesse", rank: "untrained" }, // Combined attribute
    { name: "Hunting", category: "Physical", attribute: "physique_mind", rank: "untrained" }, // Combined attribute
    { name: "Lockpicking", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Ride", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Rope Use", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Sneaking", category: "Physical", attribute: "finesse", rank: "untrained" },
    { name: "Trickery", category: "Physical", attribute: "finesse", rank: "untrained" },

    // Sense Skills
    { name: "Hearing", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Sight", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Smell", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Taste", category: "Sense", attribute: "mind", rank: "untrained" },
    { name: "Touch", category: "Sense", attribute: "mind", rank: "untrained" },

    // Social Skills
    { name: "Animal Handling", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Deception", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Disguise", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Etiquette", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Haggling", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Intimidate", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Persuasion", category: "Social", attribute: "presence", rank: "untrained" },
    { name: "Seduction", category: "Social", attribute: "presence", rank: "untrained" }
];

/**
* Types of skill entries that can be added to paths
*/
const PATH_SKILL_TYPES = {
    SPECIFIC_SKILL: "specific",           // e.g., "Sword", "Medicine"
    SPECIFIC_CUSTOM: "specific-custom",   // e.g., "Lore (Religion)", "Perform (Singing)"
    CHOOSE_CATEGORY: "choose-category",   // e.g., "Choose 1 Combat Skills"
    CHOOSE_LORE: "choose-lore",          // e.g., "Choose 2 Lore Skills"
    CHOOSE_PERFORM: "choose-perform",     // e.g., "Choose 1 Perform Skills"
    CHOOSE_CRAFT: "choose-craft"         // e.g., "Choose 3 Custom Craft Skills"
};

/**
 * Default token image for items
 */
const DEFAULT_TOKEN = "icons/svg/item-bag.svg";

/**
 * Additional constants for error handling
 */
const FALLBACK_ACTOR_DATA = {
    attributes: {
        physique: { value: 1, speciesBonus: 0 },
        finesse: { value: 1, speciesBonus: 0 },
        mind: { value: 1, speciesBonus: 0 },
        presence: { value: 1, speciesBonus: 0 },
        soul: { value: 1, speciesBonus: 0 }
    },
    defenses: {
        resilience: 1,
        avoid: 1,
        grit: 1,
        resilienceBonus: 0,
        avoidBonus: 0,
        gritBonus: 0,
        passiveDodge: 0,
        passiveParry: 0,
        facing: "front",
        avoidPenalty: 0
    },
    hp: { value: 1, max: 1 },
    sanity: { value: 10, max: 10 },
    species: {
        name: "",
        baseHP: 0,
        size: "medium",
        abilities: "",
        flexibleBonus: {
            value: 0,
            selectedAttribute: ""
        }
    },
    naturalDeflection: {
        head: { current: 0, max: 0, stacks: false },
        body: { current: 0, max: 0, stacks: false },
        leftarm: { current: 0, max: 0, stacks: false },
        rightarm: { current: 0, max: 0, stacks: false },
        leftleg: { current: 0, max: 0, stacks: false },
        rightleg: { current: 0, max: 0, stacks: false }
    }
};

// ====================================================================
// 1. CORE ACTOR CLASSES
// ====================================================================

/**
* Base Actor class for The Fade system
* Handles core actor data preparation and functionality
*/
class TheFadeActor extends Actor {

    /**
    * Prepare actor data - called automatically by Foundry
    */
    prepareData() {
        super.prepareData();

        // Ensure this actor exists and has an id (is properly initialized)
        if (!this || !this.id) {
            console.warn("Actor not properly initialized, skipping prepareData");
            return;
        }

        const actorData = this;

        // Initialize system data if it doesn't exist
        if (!actorData.system || typeof actorData.system !== 'object') {
            console.warn("Actor system data missing, initializing with fallback data");
            actorData.system = foundry.utils.deepClone(FALLBACK_ACTOR_DATA);
        }

        const data = actorData.system;
        const flags = actorData.flags || {};

        // Ensure all required system properties exist before processing
        this._ensureSystemDataIntegrity(data);

        // Make separate methods for each Actor type (character, npc, etc.)
        if (actorData.type === 'character') {
            this._prepareCharacterData(actorData);
        }
    }

    /**
     * Ensure system data has all required properties
     * @param {Object} data - Actor system data
     */
    _ensureSystemDataIntegrity(data) {
        // Initialize attributes if undefined
        if (!data.attributes || typeof data.attributes !== 'object') {
            data.attributes = {
                physique: { value: 1, speciesBonus: 0 },
                finesse: { value: 1, speciesBonus: 0 },
                mind: { value: 1, speciesBonus: 0 },
                presence: { value: 1, speciesBonus: 0 },
                soul: { value: 1, speciesBonus: 0 }
            };
        }

        // Ensure each attribute has required properties
        const expectedAttributes = ['physique', 'finesse', 'mind', 'presence', 'soul'];
        expectedAttributes.forEach(attr => {
            if (!data.attributes[attr] || typeof data.attributes[attr] !== 'object') {
                data.attributes[attr] = { value: 1, speciesBonus: 0 };
            }

            if (typeof data.attributes[attr].value !== 'number') {
                data.attributes[attr].value = 1;
            }

            if (typeof data.attributes[attr].speciesBonus !== 'number') {
                data.attributes[attr].speciesBonus = 0;
            }
        });

        // Ensure defenses exist
        if (!data.defenses || typeof data.defenses !== 'object') {
            data.defenses = {
                resilience: 0,
                avoid: 0,
                grit: 0,
                resilienceBonus: 0,
                avoidBonus: 0,
                gritBonus: 0,
                passiveDodge: 0,
                passiveParry: 0,
                facing: "front",
                avoidPenalty: 0
            };
        }

        // Ensure facing has a default value
        if (!data.defenses.facing) {
            data.defenses.facing = "front";
        }

        // Ensure HP exists
        if (!data.hp || typeof data.hp !== 'object') {
            data.hp = { value: 1, max: 1 };
        }

        // Ensure Sanity exists
        if (!data.sanity || typeof data.sanity !== 'object') {
            data.sanity = { value: 10, max: 10 };
        }

        // Ensure naturalDeflection exists as an object with all body parts
        if (!data.naturalDeflection || typeof data.naturalDeflection !== 'object') {
            data.naturalDeflection = {};
        }

        BODY_PARTS.forEach(part => {
            if (!data.naturalDeflection[part] || typeof data.naturalDeflection[part] !== 'object') {
                data.naturalDeflection[part] = {
                    current: 0,
                    max: 0,
                    stacks: false
                };
            }

            // Ensure all properties exist
            if (typeof data.naturalDeflection[part].current !== 'number') {
                data.naturalDeflection[part].current = 0;
            }
            if (typeof data.naturalDeflection[part].max !== 'number') {
                data.naturalDeflection[part].max = 0;
            }
            if (typeof data.naturalDeflection[part].stacks !== 'boolean') {
                data.naturalDeflection[part].stacks = false;
            }
        });

        // Initialize arrays to prevent iteration errors
        if (!Array.isArray(data.itemsOfPower)) data.itemsOfPower = [];
        if (!data.equippedItemsOfPower || typeof data.equippedItemsOfPower !== 'object') {
            data.equippedItemsOfPower = {};
        }
        if (!Array.isArray(data.unequippedItemsOfPower)) data.unequippedItemsOfPower = [];
        if (!data.equippedArmor || typeof data.equippedArmor !== 'object') {
            data.equippedArmor = {};
        }
        if (!Array.isArray(data.unequippedArmor)) data.unequippedArmor = [];
        if (!Array.isArray(data.potions)) data.potions = [];
        if (!Array.isArray(data.drugs)) data.drugs = [];

        // Ensure species exists
        if (!data.species || typeof data.species !== 'object') {
            data.species = {
                name: "",
                baseHP: 0,
                size: "medium",
                abilities: "",
                flexibleBonus: {
                    value: 0,
                    selectedAttribute: ""
                }
            };
        }

        // Ensure species flexibleBonus exists
        if (!data.species.flexibleBonus || typeof data.species.flexibleBonus !== 'object') {
            data.species.flexibleBonus = {
                value: 0,
                selectedAttribute: ""
            };
        }
    }

    /**
    * Prepare character-specific data and calculations
    * @param {Object} actorData - The actor's data object
    */
    _prepareCharacterData(actorData) {
        // Enhanced safety checks
        if (!actorData) {
            console.error("actorData is null/undefined in _prepareCharacterData");
            return;
        }

        if (!actorData.system) {
            console.error("Actor system data missing in _prepareCharacterData");
            actorData.system = foundry.utils.deepClone(FALLBACK_ACTOR_DATA);
        }

        const data = actorData.system;

        try {
            // Ensure data integrity before calculations
            this._ensureSystemDataIntegrity(data);

            // Calculate defenses based on attributes and include bonuses
            this._calculateBaseDefenses(data, actorData);

            // Apply facing modifiers
            this._applyFacingModifiers(data);

            // Calculate carrying capacity
            this._calculateCarryingCapacity(data);

            // Calculate max HP and Sanity
            this._calculateMaxValues(data, actorData);

            // Calculate Sin Threshold for dark magic
            this._calculateSinThreshold(data);

            this._calculateOverlandMovement(data);

        } catch (error) {
            console.error("Error in _prepareCharacterData calculations:", error);
            console.error("Error stack:", error.stack);

            // Initialize minimal defense data to prevent template errors
            this._initializeMinimalDefenseData(data);
        }
    }

    /**
     * Calculate max HP and Sanity values
     * @param {Object} data - Character system data
     * @param {Object} actorData - Full actor data
     */
    _calculateMaxValues(data, actorData) {
        // Calculate Max HP based on Species, Path, Physique, and misc bonus
        let baseHP = (data.species?.baseHP) || 0;
        let pathHP = 0;

        // Add HP from Paths - safer item processing
        if (actorData.items && typeof actorData.items.forEach === 'function') {
            try {
                actorData.items.forEach(item => {
                    if (item && item.type === "path" && item.system && typeof item.system.baseHP === 'number') {
                        pathHP += item.system.baseHP;
                    }
                });
            } catch (error) {
                console.error("Error processing path HP:", error);
            }
        }

        // Calculate max HP and update both properties
        const physiqueValue = data.attributes?.physique?.value || 1;
        const hpMiscBonus = data.hpMiscBonus || 0;
        const calculatedMaxHP = baseHP + pathHP + physiqueValue + hpMiscBonus;

        data.hp.max = calculatedMaxHP;
        data.maxHP = calculatedMaxHP; // For backward compatibility with UI

        // Calculate max Sanity and update both properties
        const mindValue = data.attributes?.mind?.value || 1;
        const sanityMiscBonus = data.sanity?.miscBonus || 0;
        const calculatedMaxSanity = 10 + mindValue + sanityMiscBonus;

        data.sanity.max = calculatedMaxSanity;
        data.maxSanity = calculatedMaxSanity; // For backward compatibility with UI

        // Ensure HP and Sanity values don't exceed max
        if (data.hp.value > data.hp.max) data.hp.value = data.hp.max;
        if (data.sanity.value > data.sanity.max) data.sanity.value = data.sanity.max;
    }

    /**
     * Calculate sin threshold for dark magic
     * @param {Object} data - Character system data
     */
    _calculateSinThreshold(data) {
        // Initialize dark magic data if needed
        if (!data.darkMagic || typeof data.darkMagic !== 'object') {
            data.darkMagic = {
                spellsLearned: {},
                currentSin: 0,
                sinThresholdBonus: 0,
                addictionLevel: "none"
            };
        }

        // Count dark magic spells learned - safer processing
        let darkMagicCount = 0;
        if (data.darkMagic.spellsLearned && typeof data.darkMagic.spellsLearned === 'object') {
            try {
                darkMagicCount = Object.values(data.darkMagic.spellsLearned).filter(Boolean).length;
            } catch (error) {
                console.error("Error counting dark magic spells:", error);
                darkMagicCount = 0;
            }
        }

        // Calculate sin threshold: Soul - 1 per dark magic spell + bonus
        const soulValue = data.attributes?.soul?.value || 1;
        const sinThresholdBonus = data.darkMagic.sinThresholdBonus || 0;
        data.darkMagic.sinThreshold = soulValue - darkMagicCount + sinThresholdBonus;
    }

    /**
     * Initialize minimal defense data to prevent errors
     * @param {Object} data - Character system data
     */
    _initializeMinimalDefenseData(data) {
        if (!data.defenses) {
            data.defenses = {
                resilience: 1,
                avoid: 1,
                grit: 1,
                resilienceBonus: 0,
                avoidBonus: 0,
                gritBonus: 0,
                passiveDodge: 0,
                passiveParry: 0,
                facing: "front",
                avoidPenalty: 0
            };
        }

        if (!data.carryingCapacity) {
            data.carryingCapacity = {
                light: 50,
                medium: 100,
                heavy: 150,
                overHead: 225,
                offGround: 450,
                pushOrDrag: 750
            };
        }

        // Set safe total values
        data.totalResilience = data.defenses.resilience + (data.defenses.resilienceBonus || 0);
        data.totalAvoid = data.defenses.avoid + (data.defenses.avoidBonus || 0);
        data.totalGrit = data.defenses.grit + (data.defenses.gritBonus || 0);
    }

    /**
    * Generate initiative roll for this actor
    * @returns {Roll} Initiative roll object
    */
    getInitiativeRoll() {
        // Get the attributes used for initiative
        const finesseValue = this.system.attributes.finesse?.value || 0;
        const mindValue = this.system.attributes.mind?.value || 0;

        // Calculate the average
        const averagedFINMND = Math.floor((finesseValue + mindValue) / 2);

        // Create the roll with the proper formula
        const formula = `1d12 + ${averagedFINMND}`;
        const roll = new Roll(formula);

        return roll;
    }

    /**
    * Calculate base defenses without facing modifiers
    * @param {Object} data - Character data
    * @param {Actor} actor - The actor instance
    */
    _calculateBaseDefenses(data, actor) {
        // Ensure attributes exist before processing
        if (!data.attributes) {
            data.attributes = {
                physique: { value: 1 },
                finesse: { value: 1 },
                mind: { value: 1 },
                presence: { value: 1 },
                soul: { value: 1 }
            };
        }

        // Ensure defenses exist before processing
        if (!data.defenses) {
            data.defenses = {
                resilience: 0,
                avoid: 0,
                grit: 0,
                resilienceBonus: 0,
                avoidBonus: 0,
                gritBonus: 0,
                passiveDodge: 0,
                passiveParry: 0,
                facing: "front",
                avoidPenalty: 0
            };
        }

        // Initialize bonus values if they don't exist
        if (!data.defenses.resilienceBonus) data.defenses.resilienceBonus = 0;
        if (!data.defenses.avoidBonus) data.defenses.avoidBonus = 0;
        if (!data.defenses.gritBonus) data.defenses.gritBonus = 0;
        if (!data.defenses.avoidPenalty) data.defenses.avoidPenalty = 0;

        // Calculate base defenses based on attributes
        data.defenses.resilience = Math.floor(data.attributes.physique.value / 2);
        data.defenses.avoid = Math.floor(data.attributes.finesse.value / 2);
        data.defenses.grit = Math.floor(data.attributes.mind.value / 2);

        // Ensure minimum value of 1 for base defenses
        data.defenses.resilience = Math.max(1, data.defenses.resilience);
        data.defenses.avoid = Math.max(1, data.defenses.avoid);
        data.defenses.grit = Math.max(1, data.defenses.grit);

        // Calculate total defenses including bonuses but without facing penalties
        data.totalResilience = Math.max(1, data.defenses.resilience + Number(data.defenses.resilienceBonus || 0));
        data.totalAvoid = Math.max(1, data.defenses.avoid + Number(data.defenses.avoidBonus || 0));
        data.totalGrit = Math.max(1, data.defenses.grit + Number(data.defenses.gritBonus || 0));

        // Calculate Passive Dodge based on Acrobatics skill and Finesse
        let acrobonaticsDodge = 0;
        let finesseDodge = Math.floor(data.attributes.finesse.value / 4);

        // Find Acrobatics skill
        const acrobaticsSkill = actor.items.find(i =>
            i.type === 'skill' && i.name.toLowerCase() === 'acrobatics');

        if (acrobaticsSkill) {
            const rank = acrobaticsSkill.system.rank;
            if (rank === 'adept') acrobonaticsDodge = 1;
            else if (rank === 'experienced') acrobonaticsDodge = 1;
            else if (rank === 'expert') acrobonaticsDodge = 2;
            else if (rank === 'mastered') acrobonaticsDodge = 3;
        }

        data.defenses.basePassiveDodge = Math.max(acrobonaticsDodge, finesseDodge);
        data.defenses.passiveDodge = data.defenses.basePassiveDodge;

        // Calculate Passive Parry based on highest weapon skill
        let highestParry = 0;
        const weaponSkills = actor.items.filter(i =>
            i.type === 'skill' && ['Sword', 'Axe', 'Cudgel', 'Polearm', 'Unarmed'].includes(i.name));

        weaponSkills.forEach(skill => {
            let parryValue = 0;
            const rank = skill.system.rank;

            if (rank === 'practiced') parryValue = 1;
            else if (rank === 'adept') parryValue = 2;
            else if (rank === 'experienced') parryValue = 3;
            else if (rank === 'expert') parryValue = 4;
            else if (rank === 'mastered') parryValue = 6;

            if (parryValue > highestParry) highestParry = parryValue;
        });

        data.defenses.basePassiveParry = highestParry;
        data.defenses.passiveParry = data.defenses.basePassiveParry;
    }

    /**
    * Apply facing modifiers to defenses
    * @param {Object} data - Character data
    */
    _applyFacingModifiers(data) {
        // Ensure defenses exist
        if (!data.defenses || typeof data.defenses !== 'object') {
            console.error("Defenses data missing in _applyFacingModifiers");
            return;
        }

        // Apply facing modifications to defensive values
        const facing = data.defenses.facing || 'front';

        // Ensure base values exist
        if (data.defenses.basePassiveDodge === undefined) data.defenses.basePassiveDodge = 0;
        if (data.defenses.basePassiveParry === undefined) data.defenses.basePassiveParry = 0;

        // Apply modifications based on facing
        if (facing === 'flank') {
            // Full passive defenses, but -1 to Avoid
            data.defenses.avoidPenalty = -1;
            data.defenses.passiveDodge = data.defenses.basePassiveDodge;
            data.defenses.passiveParry = data.defenses.basePassiveParry;
        }
        else if (facing === 'backflank') {
            // Half passive dodge, no parry, -2 Avoid
            data.defenses.passiveDodge = Math.floor(data.defenses.basePassiveDodge / 2);
            data.defenses.passiveParry = 0;
            data.defenses.avoidPenalty = -2;
        }
        else if (facing === 'back') {
            // Quarter passive dodge, no parry, -2 Avoid
            data.defenses.passiveDodge = Math.floor(data.defenses.basePassiveDodge / 4);
            data.defenses.passiveParry = 0;
            data.defenses.avoidPenalty = -2;
        }
        else {
            // Front facing - full benefits, no penalties
            data.defenses.passiveDodge = data.defenses.basePassiveDodge;
            data.defenses.passiveParry = data.defenses.basePassiveParry;
            data.defenses.avoidPenalty = 0;
        }

        // Ensure totalAvoid exists before modifying
        if (data.totalAvoid === undefined) {
            data.totalAvoid = (data.defenses.avoid || 0) + (data.defenses.avoidBonus || 0);
        }

        // Apply avoid penalty to total avoid
        data.totalAvoid += data.defenses.avoidPenalty;

        // Ensure total avoid doesn't go below 0
        data.totalAvoid = Math.max(0, data.totalAvoid);
    }

    /**
    * Calculate carrying capacity
    * @param {Object} data - Character data
    */
    _calculateCarryingCapacity(data) {
        // Ensure attributes exist
        if (!data.attributes || !data.attributes.physique) {
            console.error("Attributes missing in _calculateCarryingCapacity");
            // Set default carrying capacity
            data.carryingCapacity = {
                light: 50,
                medium: 100,
                heavy: 150,
                overHead: 225,
                offGround: 450,
                pushOrDrag: 750
            };
            return;
        }

        const physique = data.attributes.physique.value || 1;
        data.carryingCapacity = {
            light: (5 + physique) * 10,
            medium: (5 + physique) * 20,
            heavy: (5 + physique) * 30,
            overHead: (5 + physique) * 30 * 1.5,
            offGround: (5 + physique) * 30 * 3,
            pushOrDrag: (5 + physique) * 30 * 5
        };
    }


    /**
    * Calculate overland movement values based on species movement
    * @param {Object} data - Character system data
    */
    _calculateOverlandMovement(data) {
        // Initialize overland movement object if it doesn't exist
        if (!data['overland-movement']) {
            data['overland-movement'] = {};
        }

        // Get movement values, defaulting to 0 if not defined
        const land = data.movement?.land || 0;
        const fly = data.movement?.fly || 0;
        const swim = data.movement?.swim || 0;
        const climb = data.movement?.climb || 0;
        const burrow = data.movement?.burrow || 0;

        // Calculate overland movement (movement * 6)
        data['overland-movement'].landOverland = land * 6;
        data['overland-movement'].flyOverland = fly * 6;
        data['overland-movement'].swimOverland = swim * 6;
        data['overland-movement'].climbOverland = climb * 6;
        data['overland-movement'].burrowOverland = burrow * 6;
    }

}

// ====================================================================
// 2. CHARACTER SHEET IMPLEMENTATION
// ====================================================================

/**
* Character Sheet class for The Fade system
* Handles all character sheet rendering, interactions, and calculations
*/
class TheFadeCharacterSheet extends ActorSheet {
    // --------------------------------------------------------------------
    // SHEET CONFIGURATION
    // --------------------------------------------------------------------
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "actor"],
            template: "systems/thefade/templates/actor/character-sheet.html",
            width: 800,
            height: 950,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
        });
    }

    /**
    * Get sheet data for rendering
    * @returns {Object} Sheet data object
    */
    getData() {
        let data;

        // Ensure actor exists before proceeding
        if (!this.actor) {
            console.error("Actor is null or undefined in getData()");
            return {
                actor: null,
                system: FALLBACK_ACTOR_DATA,
                items: [],
                dtypes: ["String", "Number", "Boolean"],
                sizeOptions: SIZE_OPTIONS
            };
        }

        try {
            data = super.getData();
        } catch (error) {
            console.error("Error in super.getData():", error);
            // Create minimal data structure with safe fallbacks
            data = {
                actor: this.actor,
                system: this.actor?.system || FALLBACK_ACTOR_DATA,
                items: this.actor?.items?.contents || [],
                dtypes: ["String", "Number", "Boolean"],
                sizeOptions: SIZE_OPTIONS
            };
        }

        data.sizeOptions = SIZE_OPTIONS;

        data.flexibleBonusAttributeOptions = FLEXIBLE_BONUS_OPTIONS;

        data.auraColorOptions = AURA_COLOR_OPTIONS;

        data.auraShapeOptions = AURA_SHAPE_OPTIONS;

        data.auraIntensityOptions = {
            "": "None",
            "faint": "Faint",
            "moderate": "Moderate",
            "intense": "Intense"
        };

        data.addictionLevelOptions = {
            "none": "None",
            "early": "Early Stages (+2D)",
            "middle": "Middle Stage (+4D)",
            "late": "Late Stage (+6D)",
            "terminal": "Terminal (N/A)"
        }

        data.skillRankOptions = {
            "untrained": "Untrained",
            "learned": "Learned",
            "practiced": "Practiced",
            "adept": "Adept",
            "experienced": "Experienced",
            "expert": "Expert",
            "mastered": "Mastered"
        };

        // Additional safety checks
        if (!data.actor) {
            console.error("Actor missing from getData result");
            data.actor = this.actor;
        }

        if (!data.actor?.system) {
            console.error("Actor system data missing in sheet getData");
            data.system = FALLBACK_ACTOR_DATA;

            // Initialize actor system data if completely missing
            if (data.actor && !data.actor.system) {
                data.actor.system = FALLBACK_ACTOR_DATA;
            }
        } else {
            data.system = data.actor.system;
        }

        // Ensure items array exists
        if (!Array.isArray(data.items)) {
            data.items = data.actor?.items?.contents || [];
        }

        data.dtypes = ["String", "Number", "Boolean"];

        // Add size options to template data
        data.sizeOptions = SIZE_OPTIONS;

        // Only prepare character data if we have a valid actor and system data
        if (data.actor?.type === 'character' && data.system) {
            try {
                this._prepareCharacterItems(data);
                this._prepareCharacterData(data);
            } catch (error) {
                console.error("Error preparing character data:", error);
                console.error("Error stack:", error.stack);

                // Initialize minimal data to prevent template errors
                this._initializeMinimalCharacterData(data);
            }
        }

        // Ensure magic items data is available to template (with fallbacks)
        try {
            data.actor.magicItems = data.actor.system?.magicItems || {};
            data.actor.unequippedMagicItems = data.actor.system?.unequippedMagicItems || [];
            data.actor.currentAttunements = data.actor.system?.currentAttunements || 0;
            data.actor.maxAttunements = data.actor.system?.maxAttunements || 0;
        } catch (error) {
            console.error("Error setting up magic items data:", error);
            data.actor.magicItems = {};
            data.actor.unequippedMagicItems = [];
            data.actor.currentAttunements = 0;
            data.actor.maxAttunements = 0;
        }
        return data;
    }

    /**
     * Initialize minimal character data to prevent template errors
     * @param {Object} data - Sheet data object
     */
    _initializeMinimalCharacterData(data) {
        // Ensure actor exists
        if (!data.actor) {
            console.error("Cannot initialize minimal data - no actor");
            return;
        }

        // Initialize all required arrays and objects
        data.actor.gear = [];
        data.actor.weapons = [];
        data.actor.armor = [];
        data.actor.paths = [];
        data.actor.spells = [];
        data.actor.skills = [];
        data.actor.talents = [];
        data.actor.itemsOfPower = [];
        data.actor.equippedItemsOfPower = {};
        data.actor.unequippedItemsOfPower = [];
        data.actor.equippedArmor = {};
        data.actor.unequippedArmor = [];
        data.actor.armorTotals = {};
        data.actor.potions = [];
        data.actor.drugs = [];
        data.actor.currentAttunements = 0;
        data.actor.maxAttunements = 0;

        // Initialize minimal system data if missing
        if (!data.actor.system) {
            data.actor.system = foundry.utils.deepClone(FALLBACK_ACTOR_DATA);
        } else {
            // Ensure critical system properties exist
            if (!data.actor.system.defenses) {
                data.actor.system.defenses = {
                    resilience: 1,
                    avoid: 1,
                    grit: 1,
                    passiveDodge: 0,
                    passiveParry: 0,
                    facing: "front",
                    resilienceBonus: 0,
                    avoidBonus: 0,
                    gritBonus: 0,
                    avoidPenalty: 0
                };
            }

            if (!data.actor.system.carryingCapacity) {
                data.actor.system.carryingCapacity = {
                    light: 50,
                    medium: 100,
                    heavy: 150
                };
            }

            if (!data.actor.system.attributes) {
                data.actor.system.attributes = {
                    physique: { value: 1, speciesBonus: 0 },
                    finesse: { value: 1, speciesBonus: 0 },
                    mind: { value: 1, speciesBonus: 0 },
                    presence: { value: 1, speciesBonus: 0 },
                    soul: { value: 1, speciesBonus: 0 }
                };
            }
        }

        // Set system references for template access
        data.actor.system.currentAttunements = 0;
        data.actor.system.maxAttunements = 0;
    }

    // --------------------------------------------------------------------
    // DATA PREPARATION METHODS
    // --------------------------------------------------------------------

    /**
    * Organize and classify Items for Character sheets
    * @param {Object} sheetData - The sheet data to prepare
    */
    _prepareCharacterItems(sheetData) {
        // Enhanced safety checks
        if (!sheetData) {
            console.error("sheetData is null/undefined in _prepareCharacterItems");
            return;
        }

        const actorData = sheetData.actor;

        if (!actorData) {
            console.error("Actor data missing in _prepareCharacterItems");
            return;
        }

        if (!actorData.system) {
            console.error("Actor system data missing in _prepareCharacterItems");
            actorData.system = foundry.utils.deepClone(FALLBACK_ACTOR_DATA);
        }

        // Ensure items array exists and is iterable
        let items = [];
        if (sheetData.items && Array.isArray(sheetData.items)) {
            items = sheetData.items;
        } else if (actorData.items && Array.isArray(actorData.items)) {
            items = actorData.items;
        } else if (actorData.items && actorData.items.contents && Array.isArray(actorData.items.contents)) {
            items = actorData.items.contents;
        } else {
            console.warn("No valid items array found, initializing empty arrays");
            items = [];
        }

        // Initialize containers
        const gear = [];
        const weapons = [];
        const armor = [];
        const paths = [];
        const spells = [];
        const skills = [];
        const talents = [];
        const traits = [];
        const precepts = [];
        const itemsOfPower = [];
        const potions = [];
        const drugs = [];
        const poisons = []; // Templates expect this
        const biological = []; // Templates expect this  
        const medical = []; // Templates expect this
        const travel = []; // Templates expect this
        const musical = []; // Templates expect this
        const clothing = []; // Templates expect this
        const staff = []; // Templates expect this
        const wand = []; // Templates expect this
        const gate = []; // Templates expect this
        const communication = []; // Templates expect this
        const containment = []; // Templates expect this
        const dream = []; // Templates expect this
        const mount = []; // Templates expect this
        const vehicle = []; // Templates expect this
        const fleshcraft = []; // Templates expect this

        // Safely iterate through items
        for (let i of items) {
            // Ensure item has basic properties
            if (!i || typeof i !== 'object') continue;

            // Set default image
            i.img = i.img || "icons/svg/item-bag.svg";

            // Ensure item has system data
            if (!i.system) {
                i.system = {};
            }

            // Categorize items by specific type - put each type in its own array
            try {
                if (i.type === 'magicitem') {
                    itemsOfPower.push(i);
                }
                else if (i.type === 'potion') {
                    potions.push(i);
                }
                else if (i.type === 'drug') {
                    drugs.push(i);
                }
                else if (i.type === 'poison') {
                    poisons.push(i);
                }
                else if (i.type === 'biological') {
                    biological.push(i);
                }
                else if (i.type === 'medical') {
                    medical.push(i);
                }
                else if (i.type === 'travel') {
                    travel.push(i);
                }
                else if (i.type === 'musical') {
                    musical.push(i);
                }
                else if (i.type === 'clothing') {
                    clothing.push(i);
                }
                else if (i.type === 'staff') {
                    staff.push(i);
                }
                else if (i.type === 'wand') {
                    wand.push(i);
                }
                else if (i.type === 'gate') {
                    gate.push(i);
                }
                else if (i.type === 'communication') {
                    communication.push(i);
                }
                else if (i.type === 'containment') {
                    containment.push(i);
                }
                else if (i.type === 'dream') {
                    dream.push(i);
                }
                else if (i.type === 'mount') {
                    mount.push(i);
                }
                else if (i.type === 'vehicle') {
                    vehicle.push(i);
                }
                else if (i.type === 'fleshcraft') {
                    fleshcraft.push(i);
                }
                else if (i.type === 'weapon') {
                    weapons.push(i);
                }
                else if (i.type === 'armor') {
                    armor.push(i);
                }
                else if (i.type === 'path') {
                    paths.push(i);
                }
                else if (i.type === 'spell') {
                    spells.push(i);
                }
                else if (i.type === 'skill') {
                    skills.push(i);
                }
                else if (i.type === 'talent') {
                    talents.push(i);
                }
                else if (i.type === 'trait') {
                    traits.push(i);
                }
                else if (i.type === 'precept') {
                    precepts.push(i);
                }
                // Fallback to general gear for any unrecognized types
                else {
                    gear.push(i);
                }
            } catch (error) {
                console.warn(`Error categorizing item ${i.name || 'unknown'}:`, error);
            }
        }

        // Sort skills safely
        try {
            skills.sort((a, b) => {
                const aCat = a.system?.category || '';
                const bCat = b.system?.category || '';
                const aName = a.name || '';
                const bName = b.name || '';

                if (aCat !== bCat) {
                    return aCat.localeCompare(bCat);
                }
                return aName.localeCompare(bName);
            });
        } catch (error) {
            console.error("Error sorting skills:", error);
        }

        // Process Items of Power with ring slot logic
        const { equippedItemsOfPower, unequippedItemsOfPower } = this._processItemsOfPower(itemsOfPower);

        // Process Armor with stacking support
        const { equippedArmor, unequippedArmor, armorTotals } = this._processArmor(armor, actorData);

        // Calculate attunements safely
        const currentAttunements = this._calculateCurrentAttunements(itemsOfPower);
        const maxAttunements = this._calculateMaxAttunements(actorData);

        // Calculate dice pools for skills safely
        this._calculateSkillDicePools(skills, actorData);

        // Calculate dice pools for weapons safely
        this._calculateWeaponDicePools(weapons, skills, actorData);

        // Mark custom skills
        this._markCustomSkills(skills);

        // Assign data to actor with safe defaults
        actorData.gear = gear;
        actorData.weapons = weapons;
        actorData.armor = armor;
        actorData.paths = paths;
        actorData.spells = spells;
        actorData.skills = skills;
        actorData.talents = talents;
        actorData.traits = traits;
        actorData.precepts = precepts;
        actorData.itemsOfPower = itemsOfPower;
        actorData.equippedItemsOfPower = equippedItemsOfPower;
        actorData.unequippedItemsOfPower = unequippedItemsOfPower;
        actorData.equippedArmor = equippedArmor;
        actorData.unequippedArmor = unequippedArmor;
        actorData.armorTotals = armorTotals;
        actorData.potions = potions;
        actorData.drugs = drugs;
        actorData.poisons = poisons;
        actorData.biological = biological;
        actorData.medical = medical;
        actorData.travel = travel;
        actorData.musical = musical;
        actorData.clothing = clothing;
        actorData.staff = staff;
        actorData.wand = wand;
        actorData.gate = gate;
        actorData.communication = communication;
        actorData.containment = containment;
        actorData.dream = dream;
        actorData.mount = mount;
        actorData.vehicle = vehicle;
        actorData.fleshcraft = fleshcraft;
        actorData.currentAttunements = currentAttunements;
        actorData.maxAttunements = maxAttunements;

        // Set system references for template access
        actorData.system.currentAttunements = currentAttunements;
        actorData.system.maxAttunements = maxAttunements;
    }

    /**
     * Safely calculate current attunements
     * @param {Array} itemsOfPower - Array of magic items
     * @returns {number} Current attunement count
     */
    _calculateCurrentAttunements(itemsOfPower) {
        if (!Array.isArray(itemsOfPower)) return 0;

        try {
            return itemsOfPower.filter(item =>
                item && item.system && item.system.attunement === true
            ).length;
        } catch (error) {
            console.error("Error calculating current attunements:", error);
            return 0;
        }
    }

    /**
     * Safely calculate maximum attunements
     * @param {Object} actorData - Actor data
     * @returns {number} Maximum attunement count
     */
    _calculateMaxAttunements(actorData) {
        try {
            const totalLevel = actorData.system?.level || 1;
            const soulAttribute = actorData.system?.attributes?.soul?.value || 1;
            return Math.max(0, Math.floor(totalLevel / 4) + soulAttribute);
        } catch (error) {
            console.error("Error calculating max attunements:", error);
            return 1;
        }
    }

    /**
     * Safely calculate dice pools for skills
     * @param {Array} skills - Array of skills
     * @param {Object} actorData - Actor data
     */
    _calculateSkillDicePools(skills, actorData) {
        if (!Array.isArray(skills) || !actorData?.system?.attributes) return;

        skills.forEach(skill => {
            if (!skill || !skill.system) return;

            try {
                const attributeName = skill.system.attribute;
                let attrValue = 0;

                if (attributeName && attributeName.includes('_')) {
                    const attributes = attributeName.split('_');
                    const attr1 = actorData.system.attributes[attributes[0]]?.value || 0;
                    const attr2 = actorData.system.attributes[attributes[1]]?.value || 0;
                    attrValue = Math.floor((attr1 + attr2) / 2);
                } else if (attributeName) {
                    attrValue = actorData.system.attributes[attributeName]?.value || 0;
                }

                let dicePool = attrValue;

                switch (skill.system.rank) {
                    case "practiced": dicePool += 1; break;
                    case "adept": dicePool += 2; break;
                    case "experienced": dicePool += 3; break;
                    case "expert": dicePool += 4; break;
                    case "mastered": dicePool += 6; break;
                    case "untrained": dicePool = Math.floor(dicePool / 2); break;
                }

                dicePool += (skill.system.miscBonus || 0);
                skill.calculatedDice = Math.max(1, dicePool);
            } catch (error) {
                console.warn(`Error calculating dice pool for skill ${skill.name}:`, error);
                skill.calculatedDice = 1;
            }
        });
    }

    /**
     * Safely calculate dice pools for weapons
     * @param {Array} weapons - Array of weapons
     * @param {Array} skills - Array of skills
     * @param {Object} actorData - Actor data
     */
    _calculateWeaponDicePools(weapons, skills, actorData) {
        if (!Array.isArray(weapons)) return;

        weapons.forEach(weapon => {
            if (!weapon || !weapon.system) return;

            try {
                const skillName = weapon.system.skill;
                const skill = Array.isArray(skills) ? skills.find(s => s && s.name === skillName) : null;

                // Add attribute abbreviation
                const attrAbbreviations = {
                    "none": "N/A",
                    "physique": "PHY",
                    "finesse": "FIN",
                    "mind": "MND",
                    "presence": "PRS",
                    "soul": "SOL"
                };
                weapon.attributeAbbr = attrAbbreviations[weapon.system.attribute] || "N/A";

                if (skill && skill.calculatedDice !== undefined) {
                    weapon.calculatedDice = skill.calculatedDice + (weapon.system.miscBonus || 0);
                } else {
                    // Untrained calculation
                    const attributeName = weapon.system.attribute || "physique";
                    if (attributeName !== "none" && actorData?.system?.attributes) {
                        let attrValue = actorData.system.attributes[attributeName]?.value || 0;
                        let dicePool = Math.floor(attrValue / 2);
                        dicePool += (weapon.system.miscBonus || 0);
                        weapon.calculatedDice = Math.max(1, dicePool);
                    } else {
                        weapon.calculatedDice = Math.max(1, weapon.system.miscBonus || 0);
                    }
                }
            } catch (error) {
                console.warn(`Error calculating dice pool for weapon ${weapon.name}:`, error);
                weapon.calculatedDice = 1;
            }
        });
    }

    /**
    * Calculate derived stats for the character
    * @param {Object} sheetData - The sheet data to prepare
    */
    _prepareCharacterData(sheetData) {
        if (!sheetData || !sheetData.actor || !sheetData.actor.system) {
            console.error("Missing actor or system data in _prepareCharacterData");
            return;
        }

        const data = sheetData.actor.system;

        // Initialize level-up related properties if they don't exist
        if (data.level === undefined) data.level = 1;
        if (data.experience === undefined) data.experience = 0;
        if (data.isMonster === undefined) data.isMonster = false;
        if (data.talentsBonus === undefined) data.talentsBonus = 0;
        if (data.spellsLearnedBase === undefined) data.spellsLearnedBase = 0;

        const level = data.level || 1;

        // Calculate tier levels
        this.actor.system.tier1tl = level;
        this.actor.system.tier2tl = Math.max(0, level - 4);
        this.actor.system.tier3tl = Math.max(0, level - 9);


        // Calculate paths allowed
        if (data.isMonster) {
            data.pathsAllowed = 0;
        } else {
            data.pathsAllowed = 1 + Math.floor((level - 1) / 5);
        }

        // Calculate max tier
        if (level >= 10) {
            data.maxTier = 3;
        } else if (level >= 5) {
            data.maxTier = 2;
        } else {
            data.maxTier = 1;
        }

        // Calculate talents from level
        data.talentsFromLevel = this._calculateTalentsFromLevel(level);
        data.talentsTotal = data.talentsFromLevel + data.talentsBonus;

        // Calculate current talents (excluding traits)
        const actualTalents = sheetData.actor.talents ? sheetData.actor.talents.length : 0;
        const actualTraits = sheetData.actor.traits ? sheetData.actor.traits.length : 0;
        data.currentTalents = actualTalents;

        // Calculate current traits separately
        const currentTraits = sheetData.actor.traits ? sheetData.actor.traits.length : 0;
        data.currentTraits = currentTraits;

        // Calculate spells learned from level
        data.spellsLearnedFromLevel = this._calculateSpellsLearnedFromLevel(level);
        data.spellsLearnedTotal = data.spellsLearnedFromLevel + data.spellsLearnedBase;

        // Ensure actor exists for the methods that need it
        if (!sheetData.actor) {
            console.error("Actor missing from sheetData in _prepareCharacterData");
            return;
        }

        // Apply flexible bonus to selected attribute
        if (data.species?.flexibleBonus?.value > 0) {
            const selectedAttr = data.species.flexibleBonus.selectedAttribute;
            if (selectedAttr && data.attributes[selectedAttr]) {
                data.attributes[selectedAttr].flexibleBonus = data.species.flexibleBonus.value;
            }
        }

        // Initialize minimal defense data to prevent template errors
        if (!data.defenses) {
            data.defenses = {
                resilience: 1,
                avoid: 1,
                grit: 1,
                resilienceBonus: 0,
                avoidBonus: 0,
                gritBonus: 0,
                passiveDodge: 0,
                passiveParry: 0,
                facing: "front",
                avoidPenalty: 0
            };
        }

        if (!data.carryingCapacity) {
            data.carryingCapacity = {
                light: 50,
                medium: 100,
                heavy: 150,
                overHead: 225,
                offGround: 450,
                pushOrDrag: 750
            };
        }
    }

    // Calculate talents gained from level (odd levels starting at 1)
    _calculateTalentsFromLevel(level) {
        let talents = 0;
        for (let i = 1; i <= level; i++) {
            if (i % 2 === 1) { // Odd levels
                talents++;
            }
        }
        return talents;
    }

    // Calculate spells learned from level (even levels if has spellcasting)
    _calculateSpellsLearnedFromLevel(level) {
        // Check if character has spellcasting skill at Learned or higher
        const spellcastingSkill = this.actor.items.find(i =>
            i.type === 'skill' &&
            i.name.toLowerCase().includes('spellcasting') &&
            ['learned', 'practiced', 'adept', 'experienced', 'expert', 'mastered'].includes(i.system.rank)
        );

        if (!spellcastingSkill) return 0;

        let spells = 0;
        for (let i = 2; i <= level; i += 2) { // Even levels starting at 2
            spells++;
        }
        return spells;
    }

    // Experience check - auto level up if experience >= 10
    async _onExperienceCheck(event) {
        event.preventDefault();
        const currentExp = this.actor.system.experience || 0;

        if (currentExp >= 10) {
            ui.notifications.info("Ready to level up! Click Level Up button.");
        } else {
            ui.notifications.info(`Need ${10 - currentExp} more experience to level up.`);
        }
    }

    // Monster checkbox change handler
    async _onMonsterChange(event) {
        event.preventDefault();
        const isMonster = event.target.checked;

        await this.actor.update({
            'system.isMonster': isMonster,
            'system.pathsAllowed': isMonster ? 0 : (1 + Math.floor((this.actor.system.level - 1) / 5))
        });
    }

    // Main level up function
    async _onLevelUp(event) {
        event.preventDefault();

        const currentLevel = this.actor.system.level || 1;
        const currentExp = this.actor.system.experience || 0;

        if (currentExp < 10) {
            ui.notifications.warn(`Need ${10 - currentExp} more experience to level up.`);
            return;
        }

        const newLevel = currentLevel + 1;

        // Update level and reset experience
        await this.actor.update({
            'system.level': newLevel,
            'system.experience': 0
        });

        ui.notifications.info(`Leveled up to ${newLevel}!`);

        // Apply level-based improvements
        await this._applyLevelUpBenefits(newLevel);
    }

    // Apply all level-up benefits based on the advancement table
    async _applyLevelUpBenefits(level) {
        // Stat increases
        if ([3, 6, 9].includes(level)) {
            await this._showStatIncreaseDialog("Choose a stat to increase by 1:", false);
        }

        if ([4, 10].includes(level) || (level > 10 && level % 6 === 4)) {
            await this._increaseLowestStat();
        }

        // Talents (handled automatically in _prepareCharacterData)
        if (level % 2 === 1) {
            ui.notifications.info("You gained a talent! Check your talent count.");
        }

        // Spells learned (handled automatically in _prepareCharacterData)
        if (level % 2 === 0) {
            const hasSpellcasting = this.actor.items.find(i =>
                i.type === 'skill' &&
                i.name.toLowerCase().includes('spellcasting') &&
                ['learned', 'practiced', 'adept', 'experienced', 'expert', 'mastered'].includes(i.system.rank)
            );

            if (hasSpellcasting) {
                ui.notifications.info("You can learn a new spell! Check your spells learned count.");
            }
        }

        // Skill increases
        if ([2, 5, 8].includes(level) || (level > 10 && (level - 2) % 3 === 0)) {
            await this._showSkillIncreaseDialog(2);
        }

        if ([3, 6, 9].includes(level) || (level > 10 && (level - 3) % 3 === 0)) {
            await this._showSkillIncreaseDialog(1);
        }

        // Tier advancement notifications
        if (level === 5) {
            ui.notifications.info("You can now access Tier 2 paths!");
        } else if (level === 10) {
            ui.notifications.info("You can now access Tier 3 paths!");
        }

        // Path advancement
        if (level % 5 === 0) {
            ui.notifications.info("You can select a new path!");
        }
    }

    // Show stat increase dialog
    // UPDATE the _increaseLowestStat method with null checks:
    async _increaseLowestStat() {
        const attributes = this.actor.system.attributes;

        // Add null check
        if (!attributes) {
            ui.notifications.error("Character attributes not found.");
            return;
        }

        const statValues = Object.entries(attributes).map(([key, attr]) => ({
            key,
            value: attr.value || 1  // Default to 1 if undefined
        }));

        const minValue = Math.min(...statValues.map(s => s.value));
        const lowestStats = statValues.filter(s => s.value === minValue);

        if (lowestStats.length === 1) {
            // Only one lowest stat, increase it automatically
            const stat = lowestStats[0];
            await this.actor.update({
                [`system.attributes.${stat.key}.value`]: stat.value + 1
            });
            ui.notifications.info(`${stat.key.charAt(0).toUpperCase() + stat.key.slice(1)} (lowest stat) increased to ${stat.value + 1}!`);
        } else {
            // Multiple tied for lowest, let player choose
            await this._showStatIncreaseDialog("Multiple stats tied for lowest. Choose one to increase:", true);
        }
    }

    // Show skill increase dialog
    async _showSkillIncreaseDialog(points) {
        ui.notifications.info(`You have ${points} skill increase${points > 1 ? 's' : ''} to spend. Use the Skills tab to improve skills.`);
    }

    /**
    * Process Items of Power with ring slot logic
    * @param {Array} itemsOfPower - Array of magic items
    * @returns {Object} Equipped and unequipped items
    */
    _processItemsOfPower(itemsOfPower) {
        const equippedItemsOfPower = {};
        const unequippedItemsOfPower = [];

        for (let item of itemsOfPower) {
            if (!item || !item.system) continue;

            if (item.system.equipped && item.system.slot) {
                let slot = item.system.slot;

                // Handle ring slots
                if (slot === 'ring') {
                    if (!equippedItemsOfPower.ring1) {
                        slot = 'ring1';
                    } else if (!equippedItemsOfPower.ring2) {
                        slot = 'ring2';
                    } else {
                        unequippedItemsOfPower.push(item);
                        continue;
                    }
                }

                if (equippedItemsOfPower[slot]) {
                    unequippedItemsOfPower.push(item);
                } else {
                    equippedItemsOfPower[slot] = item;
                }
            } else {
                unequippedItemsOfPower.push(item);
            }
        }

        return { equippedItemsOfPower, unequippedItemsOfPower };
    }

    /**
    * Process Armor with stacking support  
    * @param {Array} armor - Array of armor items
    * @param {Object} actorData - Actor data
    * @returns {Object} Equipped armor, unequipped armor, and totals
    */
    _processArmor(armor, actorData) {
        if (!Array.isArray(armor)) {
            console.warn("Armor data not found or not an array");
            return {
                equippedArmor: { head: [], body: [], arms: [], legs: [], shield: [] },
                unequippedArmor: [],
                armorTotals: {
                    head: { current: 0, max: 0 },
                    body: { current: 0, max: 0 },
                    leftarm: { current: 0, max: 0 },
                    rightarm: { current: 0, max: 0 },
                    leftleg: { current: 0, max: 0 },
                    rightleg: { current: 0, max: 0 },
                    shield: { current: 0, max: 0 }
                }
            };
        }

        const equippedArmor = {
            head: [],
            body: [],
            arms: [],
            legs: [],
            shield: []
        };
        const unequippedArmor = [];

        for (let item of armor) {
            if (!item || !item.system) continue;

            if (item.system.equipped && item.system.location) {
                let location = item.system.location.toLowerCase();

                // Map location variations
                if (location.includes('head')) location = 'head';
                else if (location.includes('body') || location.includes('torso')) location = 'body';
                else if (location.includes('arm')) location = 'arms';
                else if (location.includes('leg')) location = 'legs';
                else if (location.includes('shield')) location = 'shield';

                if (Array.isArray(equippedArmor[location])) {
                    equippedArmor[location].push(item);
                }
            } else {
                unequippedArmor.push(item);
            }
        }

        // Calculate armor totals properly
        // Calculate armor totals properly
        const armorTotals = {};
        const locations = ['head', 'body', 'leftarm', 'rightarm', 'leftleg', 'rightleg', 'shield'];

        locations.forEach(location => {
            armorTotals[location] = { current: 0, max: 0 };

            // Add individual armor pieces for this location
            const locationArmor = equippedArmor[location] || [];
            locationArmor.forEach(armor => {
                armorTotals[location].current += armor.system.currentAP || 0;
                armorTotals[location].max += armor.system.ap || 0;
            });

            // Add derived AP from arms/legs armor
            if (location === 'leftarm' || location === 'rightarm') {
                const armsArmor = equippedArmor.arms || [];
                armsArmor.forEach(armor => {
                    const derivedProp = location === 'leftarm' ? 'derivedLeftAP' : 'derivedRightAP';
                    armorTotals[location].current += armor.system[derivedProp] || armor.system.ap || 0;
                    armorTotals[location].max += armor.system.ap || 0;
                });
            }

            if (location === 'leftleg' || location === 'rightleg') {
                const legsArmor = equippedArmor.legs || [];
                legsArmor.forEach(armor => {
                    const derivedProp = location === 'leftleg' ? 'derivedLeftAP' : 'derivedRightAP';
                    armorTotals[location].current += armor.system[derivedProp] || armor.system.ap || 0;
                    armorTotals[location].max += armor.system.ap || 0;
                });
            }

            // Add Natural Deflection ONLY if it stacks
            const nd = actorData.system.naturalDeflection?.[location];
            if (nd && nd.stacks) {
                armorTotals[location].current += nd.current || 0;
                armorTotals[location].max += nd.max || 0;
            }
            // If Natural Deflection doesn't stack, use the higher of ND or armor
            else if (nd && !nd.stacks) {
                const ndCurrent = nd.current || 0;
                const ndMax = nd.max || 0;
                armorTotals[location].current = Math.max(armorTotals[location].current, ndCurrent);
                armorTotals[location].max = Math.max(armorTotals[location].max, ndMax);
            }
        });

        return { equippedArmor, unequippedArmor, armorTotals };
    }

    /**
    * Mark custom skills with display flags
    * @param {Array} skills - Array of skills
    */
    _markCustomSkills(skills) {
        skills.forEach(skill => {
            if (skill && skill.system) {
                skill.isCustomSkill = !skill.system.isCore;
                skill.canDelete = !skill.system.isCore;

                // Add skill type display for custom skills
                if (skill.system.skillType) {
                    skill.skillTypeDisplay = skill.system.skillType.charAt(0).toUpperCase() + skill.system.skillType.slice(1);
                }
            }
        });
    }

    // --------------------------------------------------------------------
    // ARMOR POINT (AP) REDUCTION SYSTEM
    // --------------------------------------------------------------------

    /**
    * Show dialog to get AP reduction amount
    * @param {string} title - Dialog title
    * @param {string} content - Dialog content/description
    * @param {number} maxAmount - Maximum allowed reduction
    * @returns {Promise<number|null>} Amount to reduce or null if cancelled
    */
    async _getReductionAmount(title, content, maxAmount) {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title: title,
                content: `
                <div style="margin-bottom: 10px;">${content}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label for="reduction-amount">Reduce by:</label>
                    <input type="number" id="reduction-amount" name="amount" 
                           value="1" min="1" max="${maxAmount}" 
                           style="width: 80px; text-align: center;" />
                    <span>points</span>
                </div>
            `,
                buttons: {
                    reduce: {
                        icon: '<i class="fas fa-minus"></i>',
                        label: "Reduce",
                        callback: (html) => {
                            const amount = parseInt(html.find('#reduction-amount').val()) || 1;
                            const validAmount = Math.min(Math.max(1, amount), maxAmount);
                            resolve(validAmount);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null)
                    }
                },
                default: "reduce",
                close: () => resolve(null),
                render: (html) => {
                    // Focus and select the input field
                    const input = html.find('#reduction-amount');
                    input.focus().select();

                    // Allow Enter key to submit
                    input.keypress((e) => {
                        if (e.which === 13) { // Enter key
                            html.find('.dialog-button.reduce').click();
                        }
                    });
                }
            });
            dialog.render(true);
        });
    }

    /**
    * Distribute AP reduction across Natural Deflection and armor pieces
    * @param {string} location - Body location
    * @param {number} totalReduction - Total amount to reduce
    */
    async _distributeAPReduction(location, totalReduction) {
        let remaining = totalReduction;
        const updates = {};
        const itemUpdates = [];

        // First reduce Natural Deflection if it stacks
        const ndData = this.actor.system.naturalDeflection?.[location];
        if (ndData && ndData.stacks && ndData.current > 0 && remaining > 0) {
            const ndReduction = Math.min(ndData.current, remaining);
            updates[`system.naturalDeflection.${location}.current`] = ndData.current - ndReduction;
            remaining -= ndReduction;
        }

        // Then reduce armor pieces for this location
        if (remaining > 0) {
            const equippedArmor = this.actor.equippedArmor?.[location] || [];

            for (const armor of equippedArmor) {
                if (remaining <= 0) break;

                const currentAP = armor.system.currentAP || 0;
                if (currentAP > 0) {
                    const armorReduction = Math.min(currentAP, remaining);
                    itemUpdates.push({
                        _id: armor._id,
                        'system.currentAP': currentAP - armorReduction
                    });
                    remaining -= armorReduction;
                }
            }

            // Handle derived armor for limbs
            if (remaining > 0 && (location === 'leftarm' || location === 'rightarm')) {
                const armsArmor = this.actor.equippedArmor?.arms || [];
                for (const armor of armsArmor) {
                    if (remaining <= 0) break;
                    const currentAP = armor.system.currentAP || 0;
                    if (currentAP > 0) {
                        const armorReduction = Math.min(currentAP, remaining);
                        itemUpdates.push({
                            _id: armor._id,
                            'system.currentAP': currentAP - armorReduction
                        });
                        remaining -= armorReduction;
                    }
                }
            }

            if (remaining > 0 && (location === 'leftleg' || location === 'rightleg')) {
                const legsArmor = this.actor.equippedArmor?.legs || [];
                for (const armor of legsArmor) {
                    if (remaining <= 0) break;
                    const currentAP = armor.system.currentAP || 0;
                    if (currentAP > 0) {
                        const armorReduction = Math.min(currentAP, remaining);
                        itemUpdates.push({
                            _id: armor._id,
                            'system.currentAP': currentAP - armorReduction
                        });
                        remaining -= armorReduction;
                    }
                }
            }
        }

        // Apply updates
        if (Object.keys(updates).length > 0) {
            await this.actor.update(updates);
        }

        if (itemUpdates.length > 0) {
            await this.actor.updateEmbeddedDocuments("Item", itemUpdates);
        }

        this.render(false);
    }

    /**
    * Setup armor reset functionality
    * @param {HTMLElement} html - Sheet HTML element
    */
    _setupArmorResetListeners(html) {

        // Individual armor reset
        const resetButtons = html.find('.reset-armor-button');

        resetButtons.on('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const button = event.currentTarget;
            const li = button.closest('.item');

            if (!li) {
                console.error("Could not find parent item element");
                return;
            }

            const itemId = li.dataset.itemId || $(li).data("itemId");

            if (!itemId) {
                console.error("No item ID found");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error(`No item found with ID ${itemId}`);
                return;
            }

            if (item.type !== "armor") {
                console.error(`Item ${item.name} is not armor, it's ${item.type}`);
                return;
            }

            try {
                // Convert to numbers to ensure type consistency
                const maxAP = Number(item.system.ap);

                await item.update({
                    "system.currentAP": maxAP
                });
                ui.notifications.info(`${item.name}'s armor protection has been restored to full.`);
            } catch (error) {
                console.error("Error updating armor:", error);
                ui.notifications.error("Failed to reset armor. See console for details.");
            }
        });

        // Reset all armor
        const resetAllButton = html.find('.reset-all-armor');

        resetAllButton.on('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const armorItems = this.actor.items.filter(i => i.type === "armor");

            if (armorItems.length === 0) {
                ui.notifications.warn("No armor items found.");
                return;
            }

            try {
                for (const armor of armorItems) {
                    const maxAP = Number(armor.system.ap);

                    await armor.update({
                        "system.currentAP": maxAP
                    });
                }

                ui.notifications.info(`All armor has been restored to full protection.`);
            } catch (error) {
                console.error("Error updating all armor:", error);
                ui.notifications.error("Failed to reset all armor. See console for details.");
            }
        });
    }

    // --------------------------------------------------------------------
    // DEFENSE SYSTEM MANAGEMENT
    // --------------------------------------------------------------------

    /**
    * Initialize facing dropdown with proper event handling
    * @param {HTMLElement} html - Sheet HTML element
    */
    _initializeFacingDropdown(html) {
        const facingDropdown = html.find('#facing-select');

        // Remove any existing handlers
        facingDropdown.off('change');

        // Add the improved handler
        facingDropdown.on('change', this._handleFacingChange.bind(this));

        // Initialize with current value from flags
        const currentFacing = this.actor.getFlag("thefade", "facing") || "front";
        facingDropdown.val(currentFacing);
    }

    /**
    * Handle facing change with direct DOM updates
    * @param {Event} event - Change event
    */
    async _handleFacingChange(event) {
        event.preventDefault();
        event.stopPropagation();

        const actor = this.actor;
        const sheet = this;
        const newFacing = event.target.value;

        try {
            // Store facing in flags
            await actor.setFlag("thefade", "facing", newFacing);

            // Get current defense values from flags
            const basePassiveDodge = actor.getFlag("thefade", "basePassiveDodge") || 0;
            const basePassiveParry = actor.getFlag("thefade", "basePassiveParry") || 0;

            // Calculate new values
            let newDodge = basePassiveDodge;
            let newParry = basePassiveParry;
            let avoidPenalty = 0;

            // Apply facing modifications
            if (newFacing === "flank") {
                avoidPenalty = -1;
            }
            else if (newFacing === "backflank") {
                newDodge = Math.floor(basePassiveDodge / 2);
                newParry = 0;
                avoidPenalty = -2;
            }
            else if (newFacing === "back") {
                newDodge = Math.floor(basePassiveDodge / 4);
                newParry = 0;
                avoidPenalty = -2;
            }

            // Store the updated values in flags
            await actor.setFlag("thefade", "currentPassiveDodge", newDodge);
            await actor.setFlag("thefade", "currentPassiveParry", newParry);
            await actor.setFlag("thefade", "avoidPenalty", avoidPenalty);

            // Update the system data for display
            const baseAvoid = Math.floor(actor.system.attributes.finesse.value / 2);
            const avoidBonus = actor.system.defenses.avoidBonus || 0;
            const totalAvoid = Math.max(0, baseAvoid + avoidBonus + avoidPenalty);

            // Apply updates to system data
            await actor.update({
                "system.defenses.passiveDodge": newDodge,
                "system.defenses.passiveParry": newParry,
                "system.defenses.avoidPenalty": avoidPenalty,
                "system.totalAvoid": totalAvoid
            });

            // Direct DOM updates for immediate visual feedback
            const domElement = $(event.target).closest('.sheet');

            if (domElement.length) {
                // Update display values
                domElement.find('.passive-dodge-value').val(newDodge);
                domElement.find('.passive-parry-value').val(newParry);
                domElement.find('.avoid-value').val(totalAvoid);
                domElement.find('.avoid-penalty').val(avoidPenalty);
            }

            // Show success notification
            ui.notifications.info(`Facing changed to: ${newFacing}`);

            // No need to re-render the whole sheet - we've updated the values directly
        } catch (error) {
            console.error("Error updating facing:", error);
            ui.notifications.error("Failed to update facing");
        }

        return false;
    }

    /**
    * Update facing with direct approach
    * @param {HTMLElement} html - Sheet HTML element
    */
    async _updateFacingDirectly(html) {
        const actor = this.actor;
        const sheet = this;

        // Find the facing dropdown
        const facingDropdown = html.find('select[name="system.defenses.facing"]');

        // Remove any existing event handlers to prevent duplicates
        facingDropdown.off('change');

        // Add direct change handler with immediate forced update
        facingDropdown.on('change', async function (event) {
            event.preventDefault();
            const newFacing = this.value;

            try {
                // First update the actor with the new facing
                await actor.update({
                    "system.defenses.facing": newFacing
                });

                // Force a full recalculation of defenses
                let fakedEvent = new Event('fakedEvent');
                sheet._onDefenseRecalculation(fakedEvent);

                // Force a complete re-render
                sheet.render(true);
                ui.notifications.info(`Facing changed to: ${newFacing}`);
            } catch (error) {
                console.error("Facing update failed:", error);
                ui.notifications.error("Failed to update facing");
            }
        });
    }

    /**
    * Force defense recalculation
    * @param {Event} event - Triggering event
    */
    async _onDefenseRecalculation(event) {
        const actor = this.actor;
        const data = actor.system;

        if (!data.defenses) return;

        // Get the current facing
        const facing = data.defenses.facing || "front";

        // Store original values for debugging
        const originalDodge = data.defenses.passiveDodge;
        const originalParry = data.defenses.passiveParry;
        const originalAvoid = data.totalAvoid;

        // Re-calculate passive dodge based on facing
        let newDodge = originalDodge;
        let newParry = originalParry;
        let avoidPenalty = 0;

        // Apply modifications based on facing
        if (facing === "flank") {
            // Full passive defenses, but -1 to Avoid
            avoidPenalty = -1;
        }
        else if (facing === "backflank") {
            // Half passive dodge, no parry, -2 Avoid
            newDodge = Math.floor(originalDodge / 2);
            newParry = 0;
            avoidPenalty = -2;
        }
        else if (facing === "back") {
            // Quarter passive dodge, no parry, -2 Avoid
            newDodge = Math.floor(originalDodge / 4);
            newParry = 0;
            avoidPenalty = -2;
        }

        // Update the actor with the new calculated values
        await actor.update({
            "system.defenses.passiveDodge": newDodge,
            "system.defenses.passiveParry": newParry,
            "system.defenses.avoidPenalty": avoidPenalty
        });
    }

    /**
    * Initialize facing system using flags
    * @param {HTMLElement} html - Sheet HTML element
    */
    async _initializeFacingWithFlags(html) {
        const actor = this.actor;
        const sheet = this;

        // Find the facing dropdown (using ID instead of name now)
        const facingDropdown = html.find('#facing-select');

        // Initialize flag if it doesn't exist
        let currentFacing = actor.getFlag("thefade", "facing");
        if (!currentFacing) {
            currentFacing = "front";
            await actor.setFlag("thefade", "facing", currentFacing);
        }

        // Set dropdown to match flag
        facingDropdown.val(currentFacing);

        // Handle dropdown change
        facingDropdown.off('change').on('change', async function (event) {
            // Stop event propagation to prevent other handlers from running
            event.stopPropagation();
            event.preventDefault();

            const newFacing = this.value;

            try {
                // Store facing in flags
                await actor.setFlag("thefade", "facing", newFacing);

                // Update defense calculations based on facing
                await sheet._updateDefensesForFacing(newFacing);

                // Force re-render
                sheet.render(true);

                // Show notification
                ui.notifications.info(`Facing changed to: ${newFacing}`);
            } catch (error) {
                console.error("Error updating facing:", error);
                ui.notifications.error("Failed to update facing");
            }

            return false;
        });
    }

    /**
    * Apply defense modifications based on facing
    * @param {string} facing - Current facing direction
    */
    async _updateDefensesForFacing(facing) {
        const actor = this.actor;

        // Get current defense values
        const basePassiveDodge = actor.getFlag("thefade", "basePassiveDodge") || 0;
        const basePassiveParry = actor.getFlag("thefade", "basePassiveParry") || 0;

        let newDodge = basePassiveDodge;
        let newParry = basePassiveParry;
        let avoidPenalty = 0;

        /*
        CONFIG.debug.thefade && console.debug(`Updating defenses for facing ${facing} with base values:
        Base Dodge: ${basePassiveDodge}
        Base Parry: ${basePassiveParry}`);
        */

        // Calculate new values based on facing
        if (facing === "flank") {
            // Full passive defenses, -1 Avoid
            avoidPenalty = -1;
        }
        else if (facing === "backflank") {
            // Half dodge, no parry, -2 Avoid
            newDodge = Math.floor(basePassiveDodge / 2);
            newParry = 0;
            avoidPenalty = -2;
        }
        else if (facing === "back") {
            // Quarter dodge, no parry, -2 Avoid
            newDodge = Math.floor(basePassiveDodge / 4);
            newParry = 0;
            avoidPenalty = -2;
        }

        /*
        CONFIG.debug.thefade && console.debug(`New defense values after facing ${facing}:
        New Dodge: ${newDodge}
        New Parry: ${newParry}
        Avoid Penalty: ${avoidPenalty}`);
        */

        // Store the final values
        await actor.update({
            "system.defenses.passiveDodge": newDodge,
            "system.defenses.passiveParry": newParry,
            "system.defenses.avoidPenalty": avoidPenalty
        });

        // Also store in flags for reference
        await actor.setFlag("thefade", "currentPassiveDodge", newDodge);
        await actor.setFlag("thefade", "currentPassiveParry", newParry);
        await actor.setFlag("thefade", "avoidPenalty", avoidPenalty);
    }

    /**
    * Calculate and store base defense values
    */
    async _calculateAndStoreBaseDefenses() {
        const actor = this.actor;
        const data = actor.system;

        // Calculate Passive Dodge from Acrobatics or Finesse
        let acrobonaticsDodge = 0;
        let finesseDodge = Math.floor(data.attributes.finesse.value / 4);

        // Find Acrobatics skill
        const acrobaticsSkill = actor.items.find(i =>
            i.type === 'skill' && i.name.toLowerCase() === 'acrobatics');

        if (acrobaticsSkill) {
            const rank = acrobaticsSkill.system.rank;
            if (rank === 'adept') acrobonaticsDodge = 1;
            else if (rank === 'experienced') acrobonaticsDodge = 1;
            else if (rank === 'expert') acrobonaticsDodge = 2;
            else if (rank === 'mastered') acrobonaticsDodge = 3;
        }

        // Use higher value
        const basePassiveDodge = Math.max(acrobonaticsDodge, finesseDodge);

        // Calculate Passive Parry from weapon skills
        let highestParry = 0;
        const weaponSkills = actor.items.filter(i =>
            i.type === 'skill' && ['Sword', 'Axe', 'Cudgel', 'Polearm', 'Heavy Weaponry', 'Unarmed'].includes(i.name));

        weaponSkills.forEach(skill => {
            let parryValue = 0;
            const rank = skill.system.rank;

            if (rank === 'practiced') parryValue = 1;
            else if (rank === 'adept') parryValue = 2;
            else if (rank === 'experienced') parryValue = 3;
            else if (rank === 'expert') parryValue = 4;
            else if (rank === 'mastered') parryValue = 6;

            if (parryValue > highestParry) highestParry = parryValue;
        });

        const basePassiveParry = highestParry;

        /*
        CONFIG.debug.thefade && console.debug(`Calculated base defenses:
        Base Passive Dodge: ${basePassiveDodge}
        Base Passive Parry: ${basePassiveParry}`);
        */

        // Store base values in flags
        await actor.setFlag("thefade", "basePassiveDodge", basePassiveDodge);
        await actor.setFlag("thefade", "basePassiveParry", basePassiveParry);

        // Apply current facing to these base values
        const currentFacing = actor.getFlag("thefade", "facing") || "front";
        await this._updateDefensesForFacing(currentFacing);
    }

    /**
    * Handle defense expansion with proper event handling
    * @param {HTMLElement} html - Sheet HTML element
    */
    _initializeDefenseExpansion(html) {
        // Remove any existing event handlers to prevent duplicates
        html.find('.defense-checkbox').off('change');

        // Add simple handlers
        html.find('.defense-checkbox').on('change', function () {
            const checkbox = $(this);
            const details = checkbox.closest('.defense').find('.defense-details');

            if (checkbox.is(':checked')) {
                details.css('max-height', '200px');
                details.css('padding-top', '10px');
            } else {
                details.css('max-height', '0');
                details.css('padding-top', '0');
            }

            // Prevent the event from triggering other handlers
            return false;
        });
    }

    /**
    * Update displayed defense values
    */
    async _updateDefenseDisplays() {
        const actor = this.actor;

        // Get current values directly from flags
        const currentDodge = actor.getFlag("thefade", "currentPassiveDodge") || 0;
        const currentParry = actor.getFlag("thefade", "currentPassiveParry") || 0;
        const avoidPenalty = actor.getFlag("thefade", "avoidPenalty") || 0;

        // Get current defense values
        const baseResilience = actor.system.defenses.resilience;
        const baseAvoid = actor.system.defenses.avoid;
        const baseGrit = actor.system.defenses.grit;

        // Get bonuses
        const resilienceBonus = actor.system.defenses.resilienceBonus || 0;
        const avoidBonus = actor.system.defenses.avoidBonus || 0;
        const gritBonus = actor.system.defenses.gritBonus || 0;

        // Get other penalties 
        const resiliencePenalty = actor.getFlag("thefade", "resiliencePenalty") || 0;
        const gritPenalty = actor.getFlag("thefade", "gritPenalty") || 0;

        // Calculate raw totals including all bonuses and penalties
        const rawResilience = baseResilience + resilienceBonus + resiliencePenalty;
        const rawAvoid = baseAvoid + avoidBonus + avoidPenalty;
        const rawGrit = baseGrit + gritBonus + gritPenalty;

        // Apply minimum defense rule (minimum 1) and calculate excess penalties
        const totalResilience = Math.max(1, rawResilience);
        const totalAvoid = Math.max(1, rawAvoid);
        const totalGrit = Math.max(1, rawGrit);

        // Calculate excess penalties for attack bonuses
        const excessResiliencePenalty = rawResilience < 1 ? Math.abs(rawResilience - 1) : 0;
        const excessAvoidPenalty = rawAvoid < 1 ? Math.abs(rawAvoid - 1) : 0;
        const excessGritPenalty = rawGrit < 1 ? Math.abs(rawGrit - 1) : 0;

        // Store excess penalties in flags for easy access
        this.actor.setFlag("thefade", "excessResiliencePenalty", excessResiliencePenalty);
        this.actor.setFlag("thefade", "excessAvoidPenalty", excessAvoidPenalty);
        this.actor.setFlag("thefade", "excessGritPenalty", excessGritPenalty);

        // Update the UI elements directly without actor update
        try {
            const sheet = this.element;
            if (sheet) {
                // Update total defense displays
                sheet.find('.defense').each(function () {
                    const defense = $(this);
                    const totalInput = defense.find('input.total-value');

                    if (defense.find('label').text().includes('Resilience')) {
                        totalInput.val(totalResilience);
                    } else if (defense.find('label').text().includes('Avoid')) {
                        totalInput.val(totalAvoid);
                    } else if (defense.find('label').text().includes('Grit')) {
                        totalInput.val(totalGrit);
                    }
                });

                sheet.find('input.avoid-value').val(totalAvoid);
                sheet.find('input.passive-dodge-value').val(currentDodge);
                sheet.find('input.passive-parry-value').val(currentParry);

                // Update excess penalty displays
                this._updateExcessPenaltyDisplays(sheet);
            }
        } catch (error) {
            console.error("Error updating UI elements:", error);
        }
    }

    _updateExcessPenaltyDisplays(sheet) {
        // Update Resilience excess penalty
        const resilienceExcess = this.actor.getFlag("thefade", "excessResiliencePenalty") || 0;
        const resilienceDisplay = sheet.find('.resilience-excess-penalty');
        if (resilienceExcess > 0) {
            resilienceDisplay.text(`+${resilienceExcess}D`).show();
        } else {
            resilienceDisplay.hide();
        }

        // Update Avoid excess penalty
        const avoidExcess = this.actor.getFlag("thefade", "excessAvoidPenalty") || 0;
        const avoidDisplay = sheet.find('.avoid-excess-penalty');
        if (avoidExcess > 0) {
            avoidDisplay.text(`+${avoidExcess}D`).show();
        } else {
            avoidDisplay.hide();
        }

        // Update Grit excess penalty
        const gritExcess = this.actor.getFlag("thefade", "excessGritPenalty") || 0;
        const gritDisplay = sheet.find('.grit-excess-penalty');
        if (gritExcess > 0) {
            gritDisplay.text(`+${gritExcess}D`).show();
        } else {
            gritDisplay.hide();
        }
    }

    /**
    * Initialize complete defense system - call on sheet load
    * @param {HTMLElement} html - Sheet HTML element
    */
    async _initializeDefenseSystem(html) {
        // Preserve expanded state before any operations
        this._preserveExpandedState(html);

        // First handle expansion behavior
        this._initializeDefenseExpansion(html);

        // Calculate and store base defenses
        await this._calculateAndStoreBaseDefenses();

        // Initialize facing dropdown with flags
        await this._initializeFacingWithFlags(html);

        // Make sure displays are updated
        await this._updateDefenseDisplays();

        // Restore expanded state after operations
        this._restoreExpandedState(html);
    }


    // --------------------------------------------------------------------
    // MAGIC ITEM EQUIPMENT SYSTEM
    // --------------------------------------------------------------------

    /**
    * Handle equipping magic items
    * @param {Event} event - Click event
    */
    _onEquipMagicItem(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest('.magic-item').dataset.itemId;
        const targetSlot = element.dataset.slot;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        // Check if slot is compatible
        let actualSlot = targetSlot;
        if (targetSlot === 'ring') {
            actualSlot = this._getAvailableRingSlot();
            if (!actualSlot) {
                ui.notifications.warn("No available ring slots.");
                return;
            }
        }

        // Check if slot is already occupied
        const currentEquipped = this.actor.system.magicItems?.[actualSlot];
        if (currentEquipped) {
            ui.notifications.warn(`${actualSlot} slot is already occupied by ${currentEquipped.name}.`);
            return;
        }

        // Check attunement limits if item requires attunement
        if (!item.system.attunement) {
            const currentAttunements = this.actor.system.currentAttunements || 0;
            const maxAttunements = this.actor.system.maxAttunements || 0;

            if (currentAttunements >= maxAttunements) {
                ui.notifications.warn(`Cannot attune to more items. Limit: ${maxAttunements}`);
                return;
            }
        }

        // Equip the item
        this._equipMagicItem(item, actualSlot);
    }

    /**
    * Handle unequipping magic items
    * @param {Event} event - Click event
    */
    _onUnequipMagicItem(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest('.equipped-item').dataset.itemId;

        const item = this.actor.items.get(itemId);
        if (item) {
            this._unequipMagicItem(item);
        }
    }

    /**
    * Toggle attunement for magic items
    * @param {Event} event - Click event
    */
    _onToggleAttunement(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.dataset.itemId;
        const isAttuned = element.checked;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        if (isAttuned) {
            const currentAttunements = this.actor.system.currentAttunements || 0;
            const maxAttunements = this.actor.system.maxAttunements || 0;

            if (currentAttunements >= maxAttunements) {
                ui.notifications.warn(`Cannot attune to more items. Limit: ${maxAttunements}`);
                element.checked = false;
                return;
            }
        }

        item.update({ "system.attunement": isAttuned });
        ui.notifications.info(`${item.name} ${isAttuned ? 'attuned' : 'no longer attuned'}.`);
    }

    /**
    * Equip magic item to specific slot
    * @param {Item} item - Item to equip
    * @param {string} slot - Equipment slot
    */
    _equipMagicItem(item, slot) {
        const updates = {
            "system.equipped": true,
            "system.slot": slot === 'ring1' || slot === 'ring2' ? 'ring' : slot
        };

        // Auto-attune when equipping
        const currentAttunements = this.actor.system.currentAttunements || 0;
        const maxAttunements = this.actor.system.maxAttunements || 0;

        if (currentAttunements < maxAttunements) {
            updates["system.attunement"] = true;
        }

        item.update(updates);
        ui.notifications.info(`${item.name} equipped to ${slot} slot.`);
    }

    /**
    * Unequip magic item
    * @param {Item} item - Item to unequip
    */
    _unequipMagicItem(item) {
        const updates = {
            "system.equipped": false,
            "system.attunement": false
        };

        item.update(updates);
        ui.notifications.info(`${item.name} unequipped.`);
    }

    /**
    * Get available ring slot for equipment
    * @returns {string|null} Available slot or null
    */
    _getAvailableRingSlot() {
        const ring1 = this.actor.system.magicItems?.ring1;
        const ring2 = this.actor.system.magicItems?.ring2;

        if (!ring1) return 'ring1';
        if (!ring2) return 'ring2';
        return null;
    }

    /**
    * Get current attunement count
    * @returns {number} Number of attuned items
    */
    _getCurrentAttunements() {
        return this.actor.items.filter(item =>
            item.type === 'magicitem' &&
            item.system.attunement === true
        ).length;
    }

    /**
    * Get maximum attunement limit
    * @returns {number} Maximum attunements allowed
    */
    _getMaxAttunements() {
        const totalLevel = this.actor.system.level || 1;
        const soulAttribute = this.actor.system.attributes.soul.value || 1;
        return Math.max(0, Math.floor(totalLevel / 4) + soulAttribute);
    }

    // --------------------------------------------------------------------
    // DICE ROLLING SYSTEM
    // --------------------------------------------------------------------

    /**
    * Handle skill check rolls
    * @param {Event} event - Click event
    */
    async _onSkillRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const skillId = element.closest(".item").dataset.itemId;
        const skill = this.actor.items.get(skillId);

        if (!skill) return;

        // Show DT dialog
        const dt = await this._getDifficultyThreshold("Skill Check Difficulty");
        if (dt === null) return; // User cancelled the dialog

        const skillData = skill.system;
        const attributeName = skillData.attribute;

        // Get attribute value, handling combined attributes
        let attrValue = 0;

        if (attributeName.includes('_')) {
            // Handle combined attributes like "physique_finesse"
            const attributes = attributeName.split('_');
            const attr1 = this.actor.system.attributes[attributes[0]]?.value || 0;
            const attr2 = this.actor.system.attributes[attributes[1]]?.value || 0;
            attrValue = Math.floor((attr1 + attr2) / 2); // Calculate average
        } else {
            // Normal single attribute
            attrValue = this.actor.system.attributes[attributeName]?.value || 0;
        }

        let dicePool = attrValue;

        // Add bonus dice based on skill rank
        switch (skillData.rank) {
            case "practiced":
                dicePool += 1;
                break;
            case "adept":
                dicePool += 2;
                break;
            case "experienced":
                dicePool += 3;
                break;
            case "expert":
                dicePool += 4;
                break;
            case "mastered":
                dicePool += 6;
                break;
            case "untrained":
                dicePool = Math.floor(dicePool / 2);
                break;
        }

        // Add misc bonus dice
        dicePool += (skillData.miscBonus || 0);

        // Ensure minimum of 1 die
        dicePool = Math.max(1, dicePool);

        // Roll the dice
        const roll = new Roll(`${dicePool}d12`);
        await roll.evaluate();

        // Create detailed die results with styling classes
        const dieResultsDetails = roll.terms[0].results.map(die => {
            let resultClass = "failure";
            if (die.result >= 12) resultClass = "critical";
            else if (die.result >= 8) resultClass = "success";

            return {
                value: die.result,
                class: resultClass
            };
        });

        // Count successes (8-11 = 1 success, 12 = 2 successes)
        let successes = 0;
        roll.terms[0].results.forEach(die => {
            if (die.result >= 8 && die.result <= 11) successes += 1;
            else if (die.result >= 12) successes += 2;
        });

        // Check against DT
        const rollSucceeds = successes >= dt;

        // Prepare template data
        const templateData = {
            actor: this.actor.name,
            name: skill.name,
            dicePool: dicePool,
            dieResultsDetails: dieResultsDetails,
            successes: successes,
            dt: dt,
            success: rollSucceeds,
            miscBonus: skillData.miscBonus || null,
            rank: skillData.rank
        };

        // Render the template
        const content = await renderTemplate("systems/thefade/templates/chat/skill-roll.html", templateData);

        // Send to chat
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${skill.name} Check (${skillData.rank})`,
            content: content
        });
    }

    /**
    * Handle attribute check rolls
    * @param {Event} event - Click event
    */
    async _onAttributeRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const attribute = element.dataset.attribute;
        const attrValue = this.actor.system.attributes[attribute]?.value || 0;

        // Roll the dice using async evaluate
        const roll = new Roll(`${attrValue}d12`);
        await roll.evaluate(); // Use async version

        // Format the individual roll results
        const dieResults = roll.terms[0].results.map(die => die.result);
        const formattedResults = dieResults.join(', ');

        // Count successes (8-11 = 1 success, 12 = 2 successes)
        let successes = 0;

        // More robust handling of results
        if (roll.terms[0] && roll.terms[0].results) {
            for (let die of roll.terms[0].results) {
                const result = die.result;
                if (result >= 8 && result <= 11) {
                    successes += 1;
                } else if (result >= 12) {
                    successes += 2;
                }
            }
        }

        // Display the result
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${attribute.charAt(0).toUpperCase() + attribute.slice(1)} Check`,
            content: `
        <p>${this.actor.name} rolled ${attrValue}d12, and their roll results were ${formattedResults}.</p>
        <p>${this.actor.name} rolled ${successes} success(es).</p>
      `
        });
    }

    /**
    * Handle weapon attack rolls
    * @param {Event} event - Click event
    */
    async _onAttackRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const weaponId = element.closest(".item").dataset.itemId;
        const weapon = this.actor.items.get(weaponId);

        if (!weapon) return;

        // Show Target Selection dialog
        const targetInfo = await this._getTargetInfo("Select Target");
        if (targetInfo === null) return; // User cancelled the dialog

        // Show DT dialog with default based on target Avoid
        let defaultDT = 3; // Default DT if no target selected
        let targetActor = null;
        let isRanged = weapon.system.range !== "Melee";
        let targetName = "the target";

        // If we have a target token selected
        if (targetInfo && targetInfo.targetId) {
            const targetToken = canvas.tokens.get(targetInfo.targetId);
            if (targetToken && targetToken.actor) {
                targetActor = targetToken.actor;
                targetName = targetToken.name || targetToken.actor.name;

                // Calculate base DT from target's Avoid
                defaultDT = targetActor.system.totalAvoid || 3;

                // Apply passive defenses if appropriate
                if (targetActor.system.defenses) {
                    // Passive Dodge applies to all attacks
                    if (targetActor.system.defenses.passiveDodge) {
                        defaultDT += targetActor.system.defenses.passiveDodge;
                    }

                    // Passive Parry only applies to melee attacks
                    if (!isRanged && targetActor.system.defenses.passiveParry) {
                        defaultDT += targetActor.system.defenses.passiveParry;
                    }
                }
            }
        }

        // After getting targetInfo and targetActor
        if (targetActor && targetInfo.facing) {
            const facing = targetInfo.facing;
            const basePassiveDodge = targetActor.getFlag("thefade", "basePassiveDodge") ||
                targetActor.system.defenses.passiveDodge || 0;
            const basePassiveParry = targetActor.getFlag("thefade", "basePassiveParry") ||
                targetActor.system.defenses.passiveParry || 0;

            // Calculate temporary defense values based on selected facing
            let tempDodge = basePassiveDodge;
            let tempParry = basePassiveParry;

            if (facing === "flank") {
                // Full passive defenses (no changes to dodge/parry)
            }
            else if (facing === "backflank") {
                tempDodge = Math.floor(basePassiveDodge / 2);
                tempParry = 0;
            }
            else if (facing === "back") {
                tempDodge = Math.floor(basePassiveDodge / 4);
                tempParry = 0;
            }

            // Now use these temporary values instead of the actor's current values
            defaultDT = targetActor.system.totalAvoid || 3;

            // Add the temporary defense values
            defaultDT += tempDodge;
            if (!isRanged) defaultDT += tempParry;
        }

        // Get final DT from user
        const dt = await this._getDifficultyThreshold("Attack Difficulty", defaultDT);
        if (dt === null) return; // User cancelled the dialog

        const weaponData = weapon.system;
        const skillName = weaponData.skill;

        // Find the appropriate skill
        const skill = this.actor.items.find(i => i.type === "skill" && i.name === skillName);

        if (!skill) {
            // Default to untrained if skill not found
            const attributeName = weaponData.attribute || "physique";

            // Get attribute value, handling combined attributes
            let attrValue = 0;

            if (attributeName.includes('_')) {
                // Handle combined attributes like "physique_finesse"
                const attributes = attributeName.split('_');
                const attr1 = this.actor.system.attributes[attributes[0]]?.value || 0;
                const attr2 = this.actor.system.attributes[attributes[1]]?.value || 0;
                attrValue = Math.floor((attr1 + attr2) / 2); // Calculate average
            } else {
                // Normal single attribute
                attrValue = this.actor.system.attributes[attributeName]?.value || 0;
            }

            let dicePool = Math.floor(attrValue / 2); // Untrained is half attr value

            // Add weapon's misc bonus
            dicePool += (weaponData.miscBonus || 0);

            // Ensure minimum of 1 die
            dicePool = Math.max(1, dicePool);

            const roll = new Roll(`${dicePool}d12`);
            await roll.evaluate();

            // Create detailed die results with styling classes
            const dieResultsDetails = roll.terms[0].results.map(die => {
                let resultClass = "failure";
                if (die.result >= 12) resultClass = "critical";
                else if (die.result >= 8) resultClass = "success";

                return {
                    value: die.result,
                    class: resultClass
                };
            });

            // Count successes
            let successes = 0;
            roll.terms[0].results.forEach(die => {
                if (die.result >= 8 && die.result <= 11) successes += 1;
                else if (die.result >= 12) successes += 2;
            });

            // Check against DT
            const attackSucceeds = successes >= dt;

            const templateData = {
                actor: this.actor.name,
                weaponName: weapon.name,
                dicePool: dicePool,
                dieResultsDetails: dieResultsDetails,
                successes: successes,
                dt: dt,
                success: attackSucceeds,
                damage: weaponData.damage,
                damageType: weaponData.damageType,
                critical: weaponData.critical,
                criticalHits: 0,
                totalDamage: weaponData.damage,
                qualities: weaponData.qualities,
                rank: "untrained",
                target: targetName,
                bonusDice: weaponData.miscBonus ? `Includes +${weaponData.miscBonus} bonus dice` : null
            };

            const content = await renderTemplate("systems/thefade/templates/chat/attack-roll.html", templateData);

            // Display the result
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `Attack with ${weapon.name} (Untrained) vs ${targetName}`,
                content: content
            });

            return;
        }

        const skillData = skill.system;
        const attributeName = skillData.attribute;
        // Get attribute value, handling combined attributes
        let attrValue = 0;

        if (attributeName.includes('_')) {
            // Handle combined attributes like "physique_finesse"
            const attributes = attributeName.split('_');
            const attr1 = this.actor.system.attributes[attributes[0]]?.value || 0;
            const attr2 = this.actor.system.attributes[attributes[1]]?.value || 0;
            attrValue = Math.floor((attr1 + attr2) / 2); // Calculate average
        } else {
            // Normal single attribute
            attrValue = this.actor.system.attributes[attributeName]?.value || 0;
        }

        let dicePool = attrValue;

        // Add bonus dice based on skill rank
        switch (skillData.rank) {
            case "practiced":
                dicePool += 1;
                break;
            case "adept":
                dicePool += 2;
                break;
            case "experienced":
                dicePool += 3;
                break;
            case "expert":
                dicePool += 4;
                break;
            case "mastered":
                dicePool += 6;
                break;
            case "untrained":
                dicePool = Math.floor(dicePool / 2);
                break;
        }

        // Add skill misc bonus if any
        dicePool += (skillData.miscBonus || 0);

        // Add weapon misc bonus
        dicePool += (weaponData.miscBonus || 0);

        // Ensure minimum of 1 die
        dicePool = Math.max(1, dicePool);

        // Add weapon specific bonuses
        if (weaponData.qualities.includes("Agile")) {
            const bonusDamage = Math.floor(this.actor.system.attributes.finesse.value / 2);
            weaponData.totalDamage = parseInt(weaponData.damage) + bonusDamage;
        } else if (weaponData.qualities.includes("Brutish")) {
            const bonusDamage = Math.floor(this.actor.system.attributes.physique.value / 2);
            weaponData.totalDamage = parseInt(weaponData.damage) + bonusDamage;
        } else if (weaponData.attribute && weaponData.attribute !== "none") {
            // Add half of the weapon's attribute to damage if not "none"
            const weaponAttribute = weaponData.attribute;
            const bonusDamage = Math.floor(this.actor.system.attributes[weaponAttribute].value / 2);
            weaponData.totalDamage = parseInt(weaponData.damage) + bonusDamage;
        } else {
            // No attribute bonus
            weaponData.totalDamage = parseInt(weaponData.damage);
        }

        // Roll the dice
        const roll = new Roll(`${dicePool}d12`);
        await roll.evaluate();

        // Create detailed die results with styling classes
        const dieResultsDetails = roll.terms[0].results.map(die => {
            let resultClass = "failure";
            if (die.result >= 12) resultClass = "critical";
            else if (die.result >= 8) resultClass = "success";

            return {
                value: die.result,
                class: resultClass
            };
        });

        // Count successes
        let successes = 0;
        roll.terms[0].results.forEach(die => {
            if (die.result >= 8 && die.result <= 11) successes += 1;
            else if (die.result >= 12) successes += 2;
        });

        // Check against DT
        const attackSucceeds = successes >= dt;

        // Calculate excess successes for bonus effects
        const excessSuccesses = attackSucceeds ? successes - dt : 0;
        const criticalThreshold = parseInt(weaponData.critical) || 4;
        const halfDamage = Math.max(1, Math.floor(weaponData.damage / 2));

        // Define these values for backwards compatibility with template
        const criticalHits = 0;
        const criticalDamage = 0;
        let totalDamage = weaponData.damage;

        // Include this only if weaponData.totalDamage is defined elsewhere
        if (weaponData.totalDamage) {
            totalDamage = weaponData.totalDamage;
        }

        const templateData = {
            actor: this.actor.name,
            weaponName: weapon.name,
            dicePool: dicePool,
            dieResultsDetails: dieResultsDetails,
            successes: successes,
            dt: dt,
            success: attackSucceeds,
            damage: weaponData.damage,
            damageType: weaponData.damageType,
            bonusSuccesses: excessSuccesses,
            criticalThreshold: criticalThreshold,
            canCritical: excessSuccesses >= criticalThreshold,
            halfDamage: halfDamage,
            criticalHits: criticalHits,
            totalDamage: totalDamage,
            qualities: weaponData.qualities,
            rank: skillData.rank,
            target: targetName,
            bonusDice: (skillData.miscBonus || weaponData.miscBonus) ?
                `Includes bonus dice: ${[
                    skillData.miscBonus ? `+${skillData.miscBonus} from skill` : '',
                    weaponData.miscBonus ? `+${weaponData.miscBonus} from weapon` : ''
                ].filter(Boolean).join(', ')}` : null
        };

        const content = await renderTemplate("systems/thefade/templates/chat/attack-roll.html", templateData);

        // Display the result 
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `Attack with ${weapon.name} (${skillData.rank}) vs ${targetName}`,
            content: content
        });
    }

    /**
    * Handle generic dice rolls
    * @param {Event} event - Click event
    */
    async _onRollDice(event) {
        event.preventDefault();

        // Get dice parameters
        const diceCount = parseInt(document.getElementById('dice-count').value) || 1;

        // Validate input
        if (diceCount < 1 || diceCount > 100) {
            ui.notifications.warn("Dice count must be between 1 and 100.");
            return;
        }

        // Roll the dice
        const roll = new Roll(`${diceCount}d12`);
        await roll.evaluate();

        // Format the individual roll results
        const dieResults = roll.terms[0].results.map(die => die.result);
        const formattedResults = dieResults.join(', ');

        // If d12, count successes for The Fade system
        let successesMessage = "";
        if (diceCount > 0) {
            let successes = 0;
            roll.terms[0].results.forEach(die => {
                if (die.result >= 8 && die.result <= 11) successes += 1;
                else if (die.result >= 12) successes += 2;
            });
            successesMessage = `<p>Successes: ${successes}</p>`;
        }

        // Display the result
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `Generic Dice Roll (${diceCount}d12)`,
            content: `
      <p>Roll results: ${formattedResults}</p>
      <p>Total: ${roll.total}</p>
      ${successesMessage}`
        });
    }

    /**
    * Handle initiative rolls
    * @param {Event} event - Click event
    */
    async _onInitiativeRoll(event) {
        event.preventDefault();

        // Attributes for initiative
        const finesseValue = this.actor.system.attributes.finesse?.value || 0;
        const mindValue = this.actor.system.attributes.mind?.value || 0;

        const averagedFINMND = Math.floor((finesseValue + mindValue) / 2);

        // Roll the dice
        const roll = new Roll(`1d12+${averagedFINMND}`);
        await roll.evaluate();

        // Get the roll result
        const dieResult = roll.terms[0].results[0].result;
        const totalResult = roll.total;

        // Update the combat tracker if in combat
        if (game.combat) {
            const combatant = game.combat.combatants.find(c => c.actorId === this.actor.id);
            if (combatant) {
                await game.combat.setInitiative(combatant.id, totalResult);
            }
        }

        // Display the result
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `Initiative Roll`,
            content: `
      <p>${this.actor.name} rolled for initiative: 1d12 (${dieResult}) + ${averagedFINMND} = ${totalResult}</p>
    `
        });
    }

    /**
    * Handle rolling for Dark Magic Addiction
    * @param {Event} event   The originating click event
    * @private
    */
    async _onDarkMagicAddictionRoll(event) {
        event.preventDefault();

        // Get spell DT from user
        const spellDT = await this._getSpellDT();
        if (spellDT === null) return; // User cancelled

        // Start with dice equal to spell DT
        let dicePool = spellDT;

        // Add addiction bonus dice
        const addictionLevel = this.actor.system.darkMagic?.addictionLevel || "none";
        const addictionBonuses = {
            "none": 0,
            "early": 2,
            "middle": 4,
            "late": 6,
            "terminal": 0
        };

        const addictionBonus = addictionBonuses[addictionLevel];
        dicePool += addictionBonus;

        // Ensure minimum of 1 die
        dicePool = Math.max(1, dicePool);

        // Get target's Grit
        const grit = this.actor.system.totalGrit || 3;

        // Roll the dice
        const roll = new Roll(`${dicePool}d12`);
        await roll.evaluate();

        // Count successes
        let successes = 0;
        roll.terms[0].results.forEach(die => {
            if (die.result >= 8 && die.result <= 11) successes += 1;
            else if (die.result >= 12) successes += 2;
        });

        // Check against Grit
        const rollSucceeds = successes >= grit;

        // Create message
        let addictionMessage = addictionBonus > 0 ? ` (${spellDT}D from spell + ${addictionBonus}D from ${addictionLevel} addiction)` : ` (${spellDT}D from spell)`;

        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `Dark Magic Addiction Check${addictionMessage}`,
            content: `
            <p>${this.actor.name} rolled ${dicePool}d12 vs Grit (${grit}).</p>
            <p>Successes: ${successes}</p>
            <p class="${rollSucceeds ? 'success' : 'failure'}">
                ${rollSucceeds ? 'The dark magic takes hold!' : 'Resisted the pull of dark magic.'}
            </p>
        `
        });
    }

    /**
    * Handle casting a spell
    * @param {Event} event   The originating click event
    * @private
    */
    async _onCastSpell(event) {
        event.preventDefault();
        const element = event.currentTarget;

        // Get the spell ID - with fallback for new HTML structure
        let spellId;
        const item = element.closest(".item");

        if (item && item.dataset && item.dataset.itemId) {
            // Old HTML structure
            spellId = item.dataset.itemId;
        } else {
            // New HTML structure - find the spell-item inside the spell-wrapper
            const wrapper = element.closest(".spell-wrapper");
            if (wrapper) {
                const itemElement = wrapper.querySelector(".spell-item");
                if (itemElement && itemElement.dataset) {
                    spellId = itemElement.dataset.itemId;
                }
            }
        }

        if (!spellId) {
            ui.notifications.error("Could not determine which spell to cast");
            return;
        }

        const spell = this.actor.items.get(spellId);

        if (!spell) return;

        const spellData = spell.system;

        // Find the Spellcasting skill
        const spellcasting = this.actor.items.find(i => i.type === "skill" && i.name === "Spellcasting");

        if (!spellcasting) {
            ui.notifications.warn("Character does not have the Spellcasting skill.");
            return;
        }

        const skillData = spellcasting.system;
        // Get the attribute name from the skill
        const attributeName = skillData.attribute || "soul"; // Default to "soul" if not specified
        let attrValue = 0;

        if (attributeName.includes('_')) {
            // Handle combined attributes like "mind_soul"
            const attributes = attributeName.split('_');
            const attr1 = this.actor.system.attributes[attributes[0]]?.value || 0;
            const attr2 = this.actor.system.attributes[attributes[1]]?.value || 0;
            attrValue = Math.floor((attr1 + attr2) / 2); // Calculate average
        } else {
            // Normal single attribute (typically soul for spellcasting)
            attrValue = this.actor.system.attributes[attributeName]?.value || 0;
        }

        let dicePool = attrValue;

        // Add bonus dice based on skill rank
        switch (skillData.rank) {
            case "practiced":
                dicePool += 1;
                break;
            case "adept":
                dicePool += 2;
                break;
            case "experienced":
                dicePool += 3;
                break;
            case "expert":
                dicePool += 4;
                break;
            case "mastered":
                dicePool += 6;
                break;
            case "untrained":
                dicePool = Math.floor(dicePool / 2);
                break;
        }

        // Roll the dice for spell casting check
        const roll = new Roll(`${dicePool}d12`);
        await roll.evaluate();

        // Create detailed die results with styling classes
        const dieResultsDetails = roll.terms[0].results.map(die => {
            let resultClass = "failure";
            if (die.result >= 12) resultClass = "critical";
            else if (die.result >= 8) resultClass = "success";

            return {
                value: die.result,
                class: resultClass
            };
        });

        // Count successes
        let successes = 0;
        roll.terms[0].results.forEach(die => {
            if (die.result >= 8 && die.result <= 11) successes += 1;
            else if (die.result >= 12) successes += 2;
        });

        // Check if spell succeeds
        const requiredSuccesses = parseInt(spellData.successes) || 3;
        const spellSucceeds = successes >= requiredSuccesses;

        // Calculate bonus successes
        const bonusSuccesses = spellSucceeds ? successes - requiredSuccesses : 0;

        // Calculate half damage for damage-type effects
        const halfDamage = spellData.damage ? Math.max(1, Math.floor(parseInt(spellData.damage) / 2)) : 1;

        // Determine if a mishap occurs on failure
        let mishapSeverity = null;
        let mishapMessage = "";

        if (!spellSucceeds) {
            const successesMissing = requiredSuccesses - successes;

            if (successesMissing === 1) {
                mishapSeverity = "Minor";
            } else if (successesMissing === 2 || successesMissing === 3) {
                mishapSeverity = "Moderate";
            } else if (successesMissing >= 4) {
                mishapSeverity = "Severe";
            }

            // For critical mishaps (0 successes and missing 4+ successes)
            if (successes === 0 && successesMissing >= 4) {
                mishapSeverity = "Critical";
            }

            mishapMessage = `<p class="spell-mishap"><strong>Mishap Severity:</strong> ${mishapSeverity}</p>
            <p>Roll on the ${mishapSeverity} Mishap table!</p>`;
        }

        // New: Prepare attack roll data if spell has an attack type
        let attackRollData = null;
        if (spellData.attack && spellData.attack !== "" && spellSucceeds) {
            // For attack spells, we'll use the same dice pool as the casting roll
            const attackRoll = new Roll(`${dicePool}d12`);
            await attackRoll.evaluate();

            // Calculate attack roll successes
            let attackSuccesses = 0;
            const attackResultsDetails = attackRoll.terms[0].results.map(die => {
                let resultClass = "failure";
                if (die.result >= 12) {
                    resultClass = "critical";
                    attackSuccesses += 2;
                } else if (die.result >= 8) {
                    resultClass = "success";
                    attackSuccesses += 1;
                }
                return {
                    value: die.result,
                    class: resultClass
                };
            });

            // Default DT for attack success is 3, but this could be made configurable
            const attackDT = 3;
            const attackHits = attackSuccesses >= attackDT;

            // Calculate attack bonus successes
            const attackBonusSuccesses = attackHits ? attackSuccesses - attackDT : 0;

            attackRollData = {
                dicePool: dicePool,
                dieResultsDetails: attackResultsDetails,
                successes: attackSuccesses,
                dt: attackDT,
                hits: attackHits,
                bonusSuccesses: attackBonusSuccesses,
                targetDefense: spellData.attack,
                roll: attackRoll
            };
        }

        let isDurationLong = false;
        if (spellData.time) {
            // Check if duration contains any of the long duration keywords
            const longDurations = ['hour', 'day', 'week', 'month', 'year'];
            isDurationLong = longDurations.some(keyword =>
                spellData.time.toLowerCase().includes(keyword)
            );
        }

        // Add the damage cost based on damage type
        const damageIncreaseCost = (spellData.damageType === "So" ||
            spellData.damageType === "Ex" ||
            spellData.damageType === "Psi") ? 2 : 1;

        // Check if spell can crit based on damage type
        const canCrit = !(spellData.damageType === "So" ||
            spellData.damageType === "Ex" ||
            spellData.damageType === "Psi");

        const templateData = {
            actor: this.actor.name,
            spellName: spell.name,
            dicePool: dicePool,
            dieResultsDetails: dieResultsDetails,
            successes: successes,
            required: requiredSuccesses,
            success: spellSucceeds,
            bonusSuccesses: bonusSuccesses,
            bonusEffect: spellData.bonusEffect,
            durationIncreaseCost: isDurationLong ? 2 : 1,
            damageIncreaseCost: damageIncreaseCost,
            canCrit: canCrit && spellData.damage,
            mishap: !spellSucceeds,
            mishapSeverity: mishapSeverity,
            mishapMessage: mishapMessage.replace(/<\/?p[^>]*>/g, '').replace(/<\/?strong[^>]*>/g, ''),
            damage: spellSucceeds && spellData.damage ? spellData.damage : null,
            damageType: spellData.damageType,
            halfDamage: halfDamage,
            description: spellData.description,
            hasAttack: !!attackRollData,
            attackRoll: attackRollData,
            range: spellData.range,
            time: spellData.time
        };

        const content = await renderTemplate("systems/thefade/templates/chat/spell-cast.html", templateData);

        // Send the spell casting result to chat
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `Casting ${spell.name}`,
            content: content
        });
    }

    // --------------------------------------------------------------------
    // DIALOG UTILITIES
    // --------------------------------------------------------------------


    /**
    * Show target selection dialog for attacks/spells
    * @param {string} title - Dialog title
    * @returns {Promise<object|null>} Target info or null if cancelled
    */
    async _getTargetInfo(title = "Select Target") {
        return new Promise((resolve) => {
            // Generate list of visible tokens that can be targeted
            const tokens = canvas.tokens.placeables.filter(t =>
                t.actor &&
                t.actor.id !== this.actor.id &&
                t.visible
            );

            let tokenOptions = '<option value="">No Target / Manual DT</option>';

            if (tokens.length > 0) {
                tokens.forEach(token => {
                    tokenOptions += `<option value="${token.id}">${token.name || token.actor.name}</option>`;
                });
            }

            // Selected tokens (works with single token too)
            const controlledTokens = canvas.tokens.controlled;
            if (controlledTokens.length === 1 && controlledTokens[0].actor.id !== this.actor.id) {
                const controlled = controlledTokens[0];
                tokenOptions = tokenOptions.replace(
                    `value="${controlled.id}"`,
                    `value="${controlled.id}" selected`
                );
            }

            const dialog = new Dialog({
                title: title,
                content: `
                <form>
                    <div class="form-group">
                        <label>Target:</label>
                        <select id="target-select" name="targetId">${tokenOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>Target Facing (if known):</label>
                        <select id="facing-select" name="facing">
                            <option value="front">Front (Default)</option>
                            <option value="flank">Flank</option>
                            <option value="backflank">Back Flank</option>
                            <option value="back">Back</option>
                        </select>
                        <p class="hint">Determines what passive defenses apply</p>
                    </div>
                </form>
            `,
                buttons: {
                    submit: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Continue",
                        callback: html => {
                            const targetId = html.find('#target-select').val();
                            const facing = html.find('#facing-select').val();
                            resolve({ targetId, facing });
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null)
                    }
                },
                default: "submit",
                close: () => resolve(null)
            });
            dialog.render(true);
        });
    }

    /**
    * Get spell difficulty threshold from user
    * @returns {Promise<number|null>} Spell DT or null if cancelled
    */
    async _getSpellDT() {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title: "Dark Magic Spell Difficulty",
                content: `
                <form>
                    <div class="form-group">
                        <label>Spell Difficulty Threshold (DT):</label>
                        <input type="number" name="dt" value="3" min="1" max="10"/>
                        <p class="hint">Enter the number of successes required for the spell</p>
                    </div>
                </form>
            `,
                buttons: {
                    submit: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Roll",
                        callback: html => {
                            const dt = parseInt(html.find('[name="dt"]').val());
                            resolve(dt);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null)
                    }
                },
                default: "submit",
                close: () => resolve(null)
            });
            dialog.render(true);
        });
    }

    /**
    * Get difficulty threshold from user
    * @param {string} title - Dialog title
    * @param {number} defaultDT - Default DT value
    * @returns {Promise<number|null>} Selected DT or null if cancelled
    */
    async _getDifficultyThreshold(title = "Set Difficulty Threshold", defaultDT = 3) {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title: title,
                content: `
                <form>
                    <div class="form-group">
                        <label>Difficulty Threshold (DT):</label>
                        <input type="number" name="dt" value="${defaultDT}" min="1" max="10"/>
                        <p class="hint">Number of successes needed</p>
                    </div>
                </form>
            `,
                buttons: {
                    submit: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Roll",
                        callback: html => {
                            const dt = parseInt(html.find('[name="dt"]').val());
                            resolve(dt);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null)
                    }
                },
                default: "submit",
                close: () => resolve(null)
            });
            dialog.render(true);
        });
    }


    // --------------------------------------------------------------------
    // EVENT LISTENERS & ACTIVATION
    // --------------------------------------------------------------------

    /**
    * Activate sheet event listeners
    * @param {HTMLElement} html - Sheet HTML element
    */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Initialize defense system with flags
        this._initializeDefenseSystem(html);
        this._initializeExcessPenaltyTooltips(html);

        this._activateInventoryListeners(html);

        // Handle defense bonus changes
        html.find('input[name="system.defenses.resilienceBonus"], input[name="system.defenses.avoidBonus"], input[name="system.defenses.gritBonus"]').change(async (ev) => {

            ev.preventDefault();
            ev.stopImmediatePropagation();

            const input = ev.currentTarget;
            const fieldName = input.name;

            let value = Number(input.value) || 0;

            // Update actor data directly without triggering render
            await this.actor.update({
                [fieldName]: value
            }, { render: false });

            // Manually update the defense displays
            await this._updateDefenseDisplays();

            ev.stopPropagation();
        });

        // Add explicit input change handler
        html.find('input[name], select[name]').not('[name="system.defenses.resilienceBonus"], [name="system.defenses.avoidBonus"], [name="system.defenses.gritBonus"], [name^="system.movement."]').change(ev => {
            const input = ev.currentTarget;
            const fieldName = input.name;

            let value = input.value;

            // Convert to number for numeric inputs
            if (input.dataset.dtype === 'Number') {
                value = Number(value);
                if (isNaN(value)) value = 1; // Default to 1 if conversion fails
            }

            // For system data updates, use the proper structure
            if (fieldName.startsWith('system.')) {
                // Using the proper data structure expected in your version of Foundry
                const path = fieldName.replace('system.', '');

                // Create an update object with the nested path
                const paths = path.split('.');
                let updateData = { "system": {} };
                let currentLevel = updateData.system;

                // Build the nested structure
                for (let i = 0; i < paths.length - 1; i++) {
                    currentLevel[paths[i]] = {};
                    currentLevel = currentLevel[paths[i]];
                }

                // Set the final value
                currentLevel[paths[paths.length - 1]] = value;

                // Update the actor
                this.actor.update(updateData);
            } else {
                // For other updates
                this.actor.update({
                    [fieldName]: value
                });
            }
        });

        // For facing selector specifically
        html.find('select[name="system.defenses.facing"]').on('change', async function (event) {
            event.preventDefault();
            const facing = this.value;

            // Use direct document API to update
            try {
                await actor.update({
                    "system.defenses.facing": facing
                });
            } catch (error) {
                console.error("Error updating facing:", error);
            }
        });

        // Initialize defense details state
        html.find('.defense-checkbox').each(function () {
            const checkbox = $(this);
            const details = checkbox.closest('.defense').find('.defense-details');

            if (checkbox.is(':checked')) {
                details.css('max-height', '200px');
                details.css('padding-top', '10px');
            } else {
                details.css('max-height', '0');
                details.css('padding-top', '0');
            }
        });

        // Toggle defense details on checkbox change
        html.find('.defense-checkbox').change(function () {
            const checkbox = $(this);
            const details = checkbox.closest('.defense').find('.defense-details');

            if (checkbox.is(':checked')) {
                details.css('max-height', '200px');
                details.css('padding-top', '10px');
            } else {
                details.css('max-height', '0');
                details.css('padding-top', '0');
            }
        });

        // Facing selector change - trigger re-render to update calculated passive defenses
        html.find('.facing-select').change(ev => {
            // The update happens automatically via the general handler above
            // The re-render will ensure calculated values reflect the new facing
            this.render(false);
        });

        // Handle changes to embedded items (skills, weapons, etc.)
        html.find('.items-list .item select, .items-list .item input').change(async ev => {
            const element = ev.currentTarget;
            const itemId = element.closest('.item').dataset.itemId;

            if (!itemId) return;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            const field = element.name;
            let value = element.value;

            // Handle number inputs
            if (element.dataset.dtype === 'Number') {
                value = Number(value);
                if (isNaN(value)) value = 0;
            }

            // For item system data
            if (field.startsWith('system.')) {
                const fieldName = field.replace('system.', '');
                await item.update({
                    ['system.' + fieldName]: value
                });
            } else {
                // Other fields
                await item.update({ [field]: value });
            }
        });

        // Handle collapsible sections
        html.find('.defense-checkbox').change(function () {
            const checkbox = $(this);
            const details = checkbox.closest('.defense').find('.defense-details');

            if (checkbox.is(':checked')) {
                details.css('max-height', '200px');
                details.css('padding-top', '10px');
            } else {
                details.css('max-height', '0');
                details.css('padding-top', '0');
            }
        });

        html.find('.tool-header').click(this._onToggleTool.bind(this));

        html.find('.item-create').click(ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            let itemType = element.dataset.type;

            // Skip skill creation - they're auto-provided
            if (itemType === 'skill') {
                ui.notifications.info("Skills are automatically provided. Use the custom skill buttons to add Craft, Lore, or Perform skills.");
                return;
            }

            // Handle legacy "item" type by defaulting to medical
            if (itemType === 'item') {
                itemType = 'medical';
                ui.notifications.info("Creating a Medical item. Edit the item to change its type if needed.");
            }

            // Validate that the item type is supported
            if (!CONFIG.Item.types.includes(itemType)) {
                ui.notifications.error(`Invalid item type: ${itemType}`);
                console.error(`Attempted to create item with invalid type: ${itemType}`);
                return;
            }

            // Create the item with proper name formatting
            const itemData = {
                name: `New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
                type: itemType,
                system: {}
            };

            this.actor.createEmbeddedDocuments("Item", [itemData]);
        });

        html.find('.item-create[data-type="skill"]').click(ev => {
            ev.preventDefault();
            ui.notifications.info("Skills are automatically provided. Use the custom skill buttons to add Craft, Lore, or Perform skills.");
        });

        html.find('.item-edit-btn').click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const itemId = li.data("itemId");
            if (!itemId) return;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            item.sheet.render(true);
        });



        // Inventory Tab Navigation
        html.find('.tab-button').click((event) => {
            const clickedTab = $(event.currentTarget);
            const tabName = clickedTab.data('tab');

            this._activeInventoryTab = tabName;

            html.find('.tab-button').removeClass('active');
            html.find('.tab-content').removeClass('active');

            clickedTab.addClass('active');
            html.find(`#${tabName}-tab`).addClass('active');
        });

        // Inventory Subtab Navigation
        html.find('.subtab-button').click((event) => {
            const clickedSubtab = $(event.currentTarget);
            const subtabName = clickedSubtab.data('subtab');

            const parentTab = clickedSubtab.closest('.tab-content');
            const parentTabId = parentTab.attr('id').replace('-tab', '');

            // Store the new active subtab
            if (!this._activeSubtabs) this._activeSubtabs = {};
            this._activeSubtabs[parentTabId] = subtabName;

            parentTab.find('.subtab-button').removeClass('active');
            parentTab.find('.subtab-content').removeClass('active');

            clickedSubtab.addClass('active');
            parentTab.find(`#${subtabName}-subtab`).addClass('active');
        });

        html.find('.item-delete').off('click').click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const itemId = li.data("itemId");

            if (!itemId) return;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            // Prevent deletion of core skills
            if (item.type === 'skill' && item.system.isCore) {
                ui.notifications.warn("Core skills cannot be deleted.");
                return;
            }

            // Allow deletion of custom skills only
            if (item.type === 'skill' && !item.system.isCore) {
                const confirmDialog = new Dialog({
                    title: "Delete Custom Skill",
                    content: `<p>Are you sure you want to delete the custom skill "${item.name}"?</p>`,
                    buttons: {
                        delete: {
                            icon: '<i class="fas fa-trash"></i>',
                            label: "Delete",
                            callback: () => {
                                this.actor.deleteEmbeddedDocuments("Item", [itemId]);
                                li.slideUp(200, () => this.render(false));
                            }
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel"
                        }
                    },
                    default: "cancel"
                });
                confirmDialog.render(true);
                return;
            }

            // Regular deletion for non-skill items
            this.actor.deleteEmbeddedDocuments("Item", [itemId]);
            li.slideUp(200, () => this.render(false));
        });

        html.find('.species-ability-add').click(async ev => {
            ev.preventDefault();

            // Get current abilities
            const abilities = duplicate(this.actor.system.species.speciesAbilities || {});
            const id = randomID(16);

            // Add new ability
            abilities[id] = { name: "New Ability", description: "" };

            // Update actor
            await this.actor.update({ "system.species.speciesAbilities": abilities });

            // Open edit dialog for the new ability
            this._onSpeciesAbilityEdit(id);
        });

        html.find('.species-ability-edit').click(ev => {
            ev.preventDefault();
            const abilityId = ev.currentTarget.closest('.species-ability').dataset.abilityId;
            this._onSpeciesAbilityEdit(abilityId);
        });

        html.find('.species-ability-delete').click(async (event) => {
            event.preventDefault();

            const abilityItem = event.currentTarget.closest(".species-ability");
            const abilityId = abilityItem?.dataset.abilityId;

            if (!abilityId) return;

            // Use Foundry's special syntax to remove a key from an object
            const updateData = {
                [`system.species.speciesAbilities.-=${abilityId}`]: null
            };

            await this.actor.update(updateData);

            // Optional: force re-render to ensure visual update
            this.render(false);
        });

        html.find('.skill-roll').click(this._onSkillRoll.bind(this));
        html.find('.attribute-roll').click(this._onAttributeRoll.bind(this));
        html.find('.attack-roll').click(this._onAttackRoll.bind(this));
        html.find('.cast-spell').click(this._onCastSpell.bind(this));
        html.find('.initiative-roll').click(this._onInitiativeRoll.bind(this));
        html.find('.roll-dice').click(this._onRollDice.bind(this));
        html.find('.roll-addiction').click(this._onDarkMagicAddictionRoll.bind(this));

        html.find('.level-up-btn').click(this._onLevelUp.bind(this));
        html.find('.experience-check-btn').click(this._onExperienceCheck.bind(this));
        html.find('input[name="system.isMonster"]').change(this._onMonsterChange.bind(this));

        html.find('.skill-browse').click(ev => {
            ev.preventDefault();
            ui.notifications.info("Skills are automatically provided. Use the custom skill buttons to add Craft, Lore, or Perform skills.");
        });

        html.find('.path-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("path", this.actor);
        });

        html.find('.species-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("species", this.actor);
        });

        html.find('.weapon-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("weapon", this.actor);
        });

        html.find('.armor-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("armor", this.actor);
        });

        html.find('.spell-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("spell", this.actor);
        });

        html.find('.talent-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("talent", this.actor);
        });

        html.find('.trait-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("talent", this.actor); // Use same browser as talents, will filter by type
        });

        html.find('.precept-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("precept", this.actor);
        });

        html.find('.item-browse').click(ev => {
            ev.preventDefault();
            const section = $(ev.currentTarget).closest('.tab-content').attr('id');

            if (section === 'items-of-power-tab') {
                openCompendiumBrowser("magicitem", this.actor);
            } else {
                openCompendiumBrowser("medical", this.actor);
            }
            
        });

        /*
        Browse for Consumables
        */

        html.find('.potion-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("potion", this.actor);
        });

        html.find('.drug-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("drug", this.actor);
        });

        html.find('.poison-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("poison", this.actor);
        });


        /*
            Browse for Magic Gear
        */
        html.find('.staff-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("staff", this.actor);
        });

        html.find('.wand-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("wand", this.actor);
        });

        html.find('.comm-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("communication", this.actor);
        });

        html.find('.container-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("containment", this.actor);
        });

        html.find('.gate-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("dimensional gate", this.actor);
        });

        html.find('.dream-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("dream", this.actor);
        });

        /*
        Browse for Mundane Gear
        */
        html.find('.medical-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("medical", this.actor);
        });

        html.find('.biological-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("biological", this.actor);
        });

        html.find('.travel-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("travel", this.actor);
        });

        html.find('.musical-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("musical", this.actor);
        });

        /*
        Browse for Companions & Ridden
        */
        html.find('.mount-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("mount", this.actor);
        });

        html.find('.fleshcraft-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("fleshcraft", this.actor);
        });

        html.find('.vehicle-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("vehicle", this.actor);
        });



        // Add custom skill creation buttons
        html.find('.add-custom-craft').click(async ev => {
            ev.preventDefault();
            await showCustomSkillDialog(this.actor);
            this.render(false);
        });

        html.find('.add-custom-lore').click(async ev => {
            ev.preventDefault();
            await createCustomSkill(this.actor, "lore", await getCustomSkillSubtype("Lore", "e.g., Anthropology, History"), "learned");
            this.render(false);
        });

        html.find('.add-custom-perform').click(async ev => {
            ev.preventDefault();
            await createCustomSkill(this.actor, "perform", await getCustomSkillSubtype("Perform", "e.g., Singing, Dancing"), "learned");
            this.render(false);
        });

        // Add universal custom skill button
        html.find('.add-custom-skill').click(async ev => {
            ev.preventDefault();
            await showCustomSkillDialog(this.actor);
            this.render(false);
        });

        // Handle spell filtering
        html.find('.spell-school-filter').change(ev => {
            const school = ev.currentTarget.value;

            if (school === 'all') {
                html.find('.spell-wrapper').show();
            } else {
                html.find('.spell-wrapper').hide();
                html.find(`.spell-wrapper .spell-item[data-school="${school}"]`).parents('.spell-wrapper').show();
            }
        });

        html.find('.spell-search').on('input', ev => {
            const searchTerm = ev.currentTarget.value.toLowerCase();

            if (searchTerm === '') {
                html.find('.spell-wrapper').show();
            } else {
                html.find('.spell-wrapper').each(function () {
                    const spellName = $(this).find('.spell-name').text().toLowerCase();
                    const spellDesc = $(this).find('.spell-description-content').text().toLowerCase();

                    if (spellName.includes(searchTerm) || spellDesc.includes(searchTerm)) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            }
        });

        // Handle attunement checkbox changes
        html.find('.attunement-checkbox').change(ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            const itemId = element.dataset.itemId;
            const isAttuned = element.checked;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            if (isAttuned) {
                const currentAttunements = this._getCurrentAttunements();
                const maxAttunements = this._getMaxAttunements();

                if (currentAttunements >= maxAttunements) {
                    ui.notifications.warn(`Cannot attune to more items. Limit: ${maxAttunements}`);
                    element.checked = false;
                    return;
                }
            }

            item.update({ "system.attunement": isAttuned });
            ui.notifications.info(`${item.name} ${isAttuned ? 'attuned' : 'no longer attuned'}.`);
        });

        html.find('.add-family-member').click(this._onAddFamilyMember.bind(this));
        html.find('.remove-family-member').click(this._onRemoveFamilyMember.bind(this));

        this._initializeFacingDropdown(html);
        this._updateFacingDirectly(html);
        this._setupArmorResetListeners(html);

        // Initialize tooltips
        this._initializeDataTooltips(html);

        if (this.actor.isOwner) {
            html.find('.initialize-skills').click(async ev => {
                ev.preventDefault();
                await initializeDefaultSkills(this.actor);
                this.render(false);
            });
        }

        /**
        * Helper function to get subtype for custom skills
        */
        async function getCustomSkillSubtype(skillType, placeholder) {
            return new Promise((resolve) => {
                const dialog = new Dialog({
                    title: `Add ${skillType} Skill`,
                    content: `
                <form>
                    <div class="form-group">
                        <label>${skillType} Type:</label>
                        <input type="text" id="subtype-input" placeholder="${placeholder}" />
                    </div>
                </form>
            `,
                    buttons: {
                        create: {
                            icon: '<i class="fas fa-plus"></i>',
                            label: "Create",
                            callback: html => {
                                const subtype = html.find('#subtype-input').val().trim();
                                resolve(subtype || null);
                            }
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel",
                            callback: () => resolve(null)
                        }
                    },
                    default: "create",
                    close: () => resolve(null)
                });
                dialog.render(true);
            });
        }

        // Auto-update overland movement when base movement changes
        html.find('input[name^="system.movement."]').change(async (ev) => {
            const input = ev.currentTarget;
            const fieldName = input.name;
            const value = parseInt(input.value) || 0;

            CONFIG.debug.thefade && console.debug(`Movement field changed: ${fieldName} = ${value}`);

            // Determine which overland field to update - FIXED TO MATCH HTML
            let overlandField = '';
            if (fieldName === 'system.movement.land') {
                overlandField = 'system.overland-movement.landOverland';
            } else if (fieldName === 'system.movement.fly') {
                overlandField = 'system.overland-movement.flyOverland';
            } else if (fieldName === 'system.movement.swim') {
                overlandField = 'system.overland-movement.swimOverland';
            } else if (fieldName === 'system.movement.climb') {
                overlandField = 'system.overland-movement.climbOverland';
            } else if (fieldName === 'system.movement.burrow') {
                overlandField = 'system.overland-movement.burrowOverland';
            }

            if (overlandField) {
                const overlandValue = value * 6;
                CONFIG.debug.thefade && console.debug(`Updating ${overlandField} to ${overlandValue}`);

                // Update both the movement field and corresponding overland field
                const updateData = {};
                updateData[fieldName] = value;
                updateData[overlandField] = overlandValue;

                await this.actor.update(updateData);
                CONFIG.debug.thefade && console.debug(`Updated successfully`);
            }
        });

        this._restoreTabState(html);
    }

    _onAddFamilyMember(event) {
        event.preventDefault();
        const familyType = event.currentTarget.dataset.familyType;
        const current = this.actor.system.family[familyType] || [];
        const updated = [...current, { name: "", sex: "", alive: false }];
        this.actor.update({ [`system.family.${familyType}`]: updated });
    }

    _onRemoveFamilyMember(event) {
        event.preventDefault();
        const familyType = event.currentTarget.dataset.familyType;
        const index = parseInt(event.currentTarget.dataset.index);
        const current = this.actor.system.family[familyType] || [];
        const updated = current.filter((_, i) => i !== index);
        this.actor.update({ [`system.family.${familyType}`]: updated });
    }

    _onToggleTool(event) {
        event.preventDefault();
        const toolSection = $(event.currentTarget).closest('.header-tool');
        const isCollapsed = toolSection.attr('data-collapsed') === 'true';
        toolSection.attr('data-collapsed', !isCollapsed);
    }

    /**
    * Activate inventory-specific listeners
    * @param {HTMLElement} html - Sheet HTML element
    */
    _activateInventoryListeners(html) {
        // Safety check to ensure html is valid
        if (!html || !html.length) {
            console.error("Invalid HTML element passed to _activateInventoryListeners");
            return;
        }

        // Equip Items - handle both armor and magic items
        html.find('.item-equip').click(async (event) => {
            event.preventDefault();

            const button = $(event.currentTarget);
            const itemElement = button.closest('.item, .magic-item, .armor-item');

            if (!itemElement.length) {
                console.error("Could not find item element");
                ui.notifications.error("Could not find item to equip");
                return;
            }

            const itemId = itemElement.data('item-id') || itemElement.attr('data-item-id');

            if (!itemId) {
                console.error("No item ID found");
                ui.notifications.error("Could not identify item to equip");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error("Item not found:", itemId);
                ui.notifications.error("Item not found in character");
                return;
            }

            // Handle different item types
            if (item.type === 'armor') {
                // Check for armor conflicts based on location
                const location = item.system.location;
                const existingArmor = this.actor.items.filter(i =>
                    i.type === 'armor' &&
                    i.system.equipped === true &&
                    i.system.location === location &&
                    i.id !== item.id
                );

                // Allow stacking if item has "+" or different name
                const canStack = location.includes('+') ||
                    !existingArmor.some(existing => existing.name === item.name);

                if (!canStack && existingArmor.length > 0) {
                    ui.notifications.warn(`${location} slot conflict with existing armor.`);
                    return;
                }

            } else if (item.type === 'magicitem') {
                // Handle magic item conflicts
                const slot = item.system.slot;

                if (slot === 'ring') {
                    // Check both ring slots
                    const ringItems = this.actor.items.filter(i =>
                        i.type === 'item' &&
                        i.system.itemCategory === 'magicitem' &&
                        i.system.equipped === true &&
                        i.system.slot === 'ring' &&
                        i.id !== item.id
                    );

                    if (ringItems.length >= 2) {
                        ui.notifications.warn("Both ring slots are occupied.");
                        return;
                    }
                } else {
                    // Check single slot conflicts
                    const conflictingItem = this.actor.items.find(i =>
                        i.type === 'item' &&
                        i.system.itemCategory === 'magicitem' &&
                        i.system.equipped === true &&
                        i.system.slot === slot &&
                        i.id !== item.id
                    );

                    if (conflictingItem) {
                        ui.notifications.warn(`${slot} slot is already occupied by ${conflictingItem.name}.`);
                        return;
                    }
                }
            }

            try {
                await item.update({ 'system.equipped': true });
                ui.notifications.info(`${item.name} equipped.`);
                this.render(false);
            } catch (error) {
                console.error("Error equipping item:", error);
                ui.notifications.error("Failed to equip item");
            }
        });

        // Unequip Items - handle both old and new HTML structures
        html.find('.item-unequip').click(async (event) => {
            event.preventDefault();

            const button = $(event.currentTarget);

            // Try multiple selectors for different HTML structures
            let equippedItem = button.closest('.equipped-item');
            if (!equippedItem.length) {
                equippedItem = button.closest('.equipped-armor-item');
            }
            if (!equippedItem.length) {
                equippedItem = button.closest('[data-item-id]');
            }

            if (!equippedItem.length) {
                console.error("Could not find equipped item element");
                ui.notifications.error("Could not find item to unequip");
                return;
            }

            const itemId = equippedItem.data('item-id') || equippedItem.attr('data-item-id');

            if (!itemId) {
                console.error("No item ID found for unequip");
                ui.notifications.error("Could not identify item to unequip");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error("Item not found for unequip:", itemId);
                ui.notifications.error("Item not found");
                return;
            }

            try {
                await item.update({ 'system.equipped': false });
                ui.notifications.info(`${item.name} unequipped.`);
                this.render(false);
            } catch (error) {
                console.error("Error unequipping item:", error);
                ui.notifications.error("Failed to unequip item");
            }
        });

        // Attunement checkbox
        html.find('.attunement-checkbox').change(async (event) => {
            event.preventDefault();
            const checkbox = $(event.currentTarget);
            const itemId = checkbox.data('item-id') || checkbox.attr('data-item-id');
            const isAttuned = event.currentTarget.checked;

            if (!itemId) {
                console.error("No item ID found for attunement");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error("Item not found for attunement:", itemId);
                return;
            }

            // Check attunement limits
            if (isAttuned) {
                const currentlyAttuned = this.actor.items.filter(i =>
                    i.type === 'item' &&
                    i.system.itemCategory === 'magicitem' &&
                    i.system.attunement === true
                ).length;

                const actorLevel = this.actor.system.level || 1;
                const soulValue = this.actor.system.attributes?.soul?.value || 1;
                const maxAllowed = Math.max(0, Math.floor(actorLevel / 4) + soulValue);

                if (currentlyAttuned >= maxAllowed) {
                    ui.notifications.warn(`Cannot attune to more items. Current: ${currentlyAttuned}, Max: ${maxAllowed}`);
                    event.currentTarget.checked = false;
                    return;
                }
            }

            try {
                await item.update({ 'system.attunement': isAttuned });
                ui.notifications.info(`${item.name} ${isAttuned ? 'attuned' : 'no longer attuned'}.`);
            } catch (error) {
                console.error("Error updating attunement:", error);
                ui.notifications.error("Failed to update attunement");
            }
        });

        // Armor AP Reduction with popup
        html.find('.reduce-armor-ap').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const item = this.actor.items.get(itemId);

            if (!item) {
                ui.notifications.error("Armor item not found");
                return;
            }

            const currentAP = item.system.currentAP || 0;
            if (currentAP <= 0) {
                ui.notifications.warn(`${item.name} already has 0 AP`);
                return;
            }

            // Create reduction dialog
            const amount = await this._getReductionAmount(
                `Reduce ${item.name} AP`,
                `Current AP: ${currentAP}/${item.system.ap}`,
                currentAP
            );

            if (amount === null) return; // User cancelled

            const newAP = Math.max(0, currentAP - amount);
            await item.update({ 'system.currentAP': newAP });
            ui.notifications.info(`${item.name} AP reduced by ${amount} to ${newAP}`);
            this.render(false);
        });

        // Armor AP Reset
        html.find('.reset-armor-ap').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const item = this.actor.items.get(itemId);

            if (!item) {
                ui.notifications.error("Armor item not found");
                return;
            }

            const maxAP = item.system.ap || 0;
            await item.update({ 'system.currentAP': maxAP });
            ui.notifications.info(`${item.name} AP reset to ${maxAP}`);
            this.render(false);
        });

        // Reset Derived AP 
        html.find('.reset-derived-ap').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const location = button.data('location');

            if (!itemId || !location) {
                ui.notifications.error("Item ID or location not specified");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                ui.notifications.error("Armor item not found");
                return;
            }

            // Determine which derived AP to reset based on location
            const derivedAPProperty = location.includes('left') ? 'derivedLeftAP' : 'derivedRightAP';
            const maxAP = item.system.ap || 0;

            await item.update({
                [`system.${derivedAPProperty}`]: maxAP
            });
            ui.notifications.info(`${item.name} derived AP reset to ${maxAP}`);
        });

        // Natural Deflection Reduction with popup
        html.find('.reduce-nd').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const location = button.data('location');

            if (!location) {
                ui.notifications.error("Location not specified");
                return;
            }

            const ndData = this.actor.system.naturalDeflection?.[location];
            if (!ndData) {
                ui.notifications.error("Natural deflection data not found");
                return;
            }

            const currentND = ndData.current || 0;
            if (currentND <= 0) {
                ui.notifications.warn(`${location} Natural Deflection already at 0`);
                return;
            }

            const amount = await this._getReductionAmount(
                `Reduce ${location} Natural Deflection`,
                `Current ND: ${currentND}/${ndData.max}`,
                currentND
            );

            if (amount === null) return; // User cancelled

            const newND = Math.max(0, currentND - amount);
            await this.actor.update({
                [`system.naturalDeflection.${location}.current`]: newND
            });
            ui.notifications.info(`${location} Natural Deflection reduced by ${amount} to ${newND}`);
        });

        // Natural Deflection Reset
        html.find('.reset-nd').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const location = button.data('location');

            if (!location) {
                ui.notifications.error("Location not specified");
                return;
            }

            const ndData = this.actor.system.naturalDeflection?.[location];
            if (!ndData) {
                ui.notifications.error("Natural deflection data not found");
                return;
            }

            const maxND = ndData.max || 0;
            await this.actor.update({
                [`system.naturalDeflection.${location}.current`]: maxND
            });
            ui.notifications.info(`${location} Natural Deflection reset to ${maxND}`);
        });

        // Derived AP Reduction with popup
        html.find('.reduce-derived-ap').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const location = button.data('location');

            if (!itemId || !location) {
                ui.notifications.error("Item ID or location not specified");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                ui.notifications.error("Armor item not found");
                return;
            }

            // Determine which derived AP to use based on location
            const derivedAPProperty = location.includes('left') ? 'derivedLeftAP' : 'derivedRightAP';

            // Initialize derived AP if it doesn't exist
            let currentDerived = item.system[derivedAPProperty];
            if (currentDerived === undefined || currentDerived === null) {
                currentDerived = item.system.ap || 0;
                // Initialize the property
                await item.update({
                    [`system.${derivedAPProperty}`]: currentDerived
                });
            }

            if (currentDerived <= 0) {
                ui.notifications.warn(`${item.name} ${location} derived AP already at 0`);
                return;
            }

            const amount = await this._getReductionAmount(
                `Reduce ${item.name} Derived AP (${location})`,
                `Current Derived AP: ${currentDerived}/${item.system.ap}`,
                currentDerived
            );

            if (amount === null) return; // User cancelled

            const newDerived = Math.max(0, currentDerived - amount);
            await item.update({
                [`system.${derivedAPProperty}`]: newDerived
            });
            ui.notifications.info(`${item.name} derived AP reduced by ${amount} to ${newDerived}`);
        });

        // Natural Deflection inputs
        html.find('input[name^="system.naturalDeflection"]').change(async (event) => {
            event.stopImmediatePropagation(); // Prevent Foundry's auto-handler

            const input = event.currentTarget;
            const fieldName = input.name;
            let value = input.value;

            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.dataset.dtype === 'Number') {
                value = Number(value) || 0;
            }

            await this.actor.update({ [fieldName]: value }, { render: false });

            // Force recalculation of armor totals by updating the sheet data
            this._recalculateArmorTotals();
        });

        // Total AP Reduction with popup
        html.find('.reduce-total-ap').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const location = button.data('location');

            if (!location) {
                ui.notifications.error("Location not specified");
                return;
            }

            // Calculate current total AP
            const armorTotal = this.actor.armorTotals?.[location];
            if (!armorTotal) {
                ui.notifications.error("Armor total data not found");
                return;
            }

            const currentTotal = armorTotal.current || 0;
            if (currentTotal <= 0) {
                ui.notifications.warn(`${location} Total AP already at 0`);
                return;
            }

            const amount = await this._getReductionAmount(
                `Reduce ${location} Total AP`,
                `Current Total: ${currentTotal}/${armorTotal.max}`,
                currentTotal
            );

            if (amount === null) return; // User cancelled

            // Distribute reduction across ND and armor pieces
            await this._distributeAPReduction(location, amount);
            ui.notifications.info(`${location} Total AP reduced by ${amount}`);
        });

        // Unattune button
        html.find('.unattune-btn').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const item = this.actor.items.get(itemId);

            if (item) {
                await item.update({ 'system.attunement': false });
                ui.notifications.info(`${item.name} unattuned.`);
                this.render(false);
            }
        });

        // Better unequip button
        html.find('.item-unequip-btn').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const itemId = button.data('item-id');
            const item = this.actor.items.get(itemId);

            if (item) {
                await item.update({ 'system.equipped': false });
                ui.notifications.info(`${item.name} unequipped.`);
                this.render(false);
            }
        });

        // ============================================================================
        // COMPREHENSIVE ITEM ACTION HANDLERS
        // ============================================================================

        // 1. UNIVERSAL EDIT BUTTON HANDLER
        // This should catch all edit buttons regardless of context
        html.find('.item-edit, .item-edit-btn').click(ev => {
            ev.preventDefault();
            CONFIG.debug.thefade && console.debug("Edit button clicked");

            // Try multiple ways to find the item ID
            const element = $(ev.currentTarget);
            let itemId = element.closest('[data-item-id]').attr('data-item-id') ||
                element.closest('[data-item-id]').data('item-id') ||
                element.closest('.item').attr('data-item-id') ||
                element.closest('.item').data('item-id');

            CONFIG.debug.thefade && console.debug("Found item ID:", itemId);

            if (!itemId) {
                console.error("Could not find item ID for edit button");
                ui.notifications.error("Could not find item to edit");
                return;
            }

            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error("Item not found:", itemId);
                ui.notifications.error("Item not found");
                return;
            }

            CONFIG.debug.thefade && console.debug("Opening item sheet for:", item.name);
            item.sheet.render(true);
        });

        // 2. POISON ACTION HANDLERS
        html.find('.poison-apply').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Applied ${item.name}! Effects: ${item.system.effect || 'See item description'}`);

            // Reduce quantity by 1
            const currentQuantity = item.system.quantity || 1;
            if (currentQuantity > 1) {
                await item.update({ "system.quantity": currentQuantity - 1 });
            } else {
                // Ask if they want to delete the item
                new Dialog({
                    title: "Use Last Dose",
                    content: `<p>This was the last dose of ${item.name}. Delete the item?</p>`,
                    buttons: {
                        delete: {
                            label: "Delete",
                            callback: () => this.actor.deleteEmbeddedDocuments("Item", [itemId])
                        },
                        keep: {
                            label: "Keep Empty",
                            callback: () => item.update({ "system.quantity": 0 })
                        }
                    },
                    default: "delete"
                }).render(true);
            }
        });

        // 3. BIOLOGICAL ITEM HANDLERS
        html.find('.bio-analyze').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Analyzing ${item.name}... Results: ${item.system.effect || 'Requires laboratory equipment'}`);
        });

        html.find('.bio-harvest').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Harvesting ${item.name}...`);
            // Could add dice rolling logic here for harvest success
        });

        // 4. MEDICAL ITEM HANDLERS
        html.find('.medical-use').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Using ${item.name}! Effect: ${item.system.effect || 'See item description'}`);

            // Reduce quantity
            const currentQuantity = item.system.quantity || 1;
            if (currentQuantity > 1) {
                await item.update({ "system.quantity": currentQuantity - 1 });
            }
        });

        // 5. TRAVEL GEAR HANDLERS
        html.find('.travel-use').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Using ${item.name} for travel purposes`);
        });

        // 6. MUSICAL INSTRUMENT HANDLERS
        html.find('.musical-play').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Playing ${item.name}... Make a Perform check!`);
        });

        // 7. STAFF HANDLERS
        html.find('.staff-use').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            const usesRemaining = (item.system.usesPerDay || 3) - (item.system.usesToday || 0);

            if (usesRemaining > 0) {
                await item.update({ "system.usesToday": (item.system.usesToday || 0) + 1 });
                ui.notifications.info(`${item.name} activated! Spell: ${item.system.spellName || 'Unknown'}`);
            } else {
                ui.notifications.warn(`${item.name} has no uses remaining today`);
            }
        });

        html.find('.staff-reset').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            await item.update({ "system.usesToday": 0 });
            ui.notifications.info(`${item.name} uses reset for a new day`);
        });

        // 8. WAND HANDLERS
        html.find('.wand-use').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            const charges = item.system.charges || 0;

            if (charges > 0) {
                await item.update({ "system.charges": charges - 1 });
                ui.notifications.info(`${item.name} activated! Charges remaining: ${charges - 1}`);
            } else {
                ui.notifications.warn(`${item.name} has no charges remaining`);
            }
        });

        // 9. GATE HANDLERS
        html.find('.gate-activate').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            const usesRemaining = (item.system.usesPerDay || 1) - (item.system.usesToday || 0);

            if (usesRemaining > 0) {
                await item.update({ "system.usesToday": (item.system.usesToday || 0) + 1 });
                ui.notifications.info(`${item.name} portal opened! Range: ${item.system.range || 'Unknown'}`);
            } else {
                ui.notifications.warn(`${item.name} cannot be used again today`);
            }
        });

        // 10. COMMUNICATION DEVICE HANDLERS
        html.find('.communication-use').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            // Could open a dialog for entering relay codes, etc.
            ui.notifications.info(`Activating ${item.name}... Range: ${item.system.range || 'Unknown'}`);
        });

        // 11. CONTAINMENT ITEM HANDLERS
        html.find('.containment-open').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Opening ${item.name}... Contents: ${item.system.contents || 'Empty'}`);
        });

        // 12. DREAM HARVESTING HANDLERS
        html.find('.dream-harvest').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Using ${item.name} to harvest dreams... EL: ${item.system.el || 1}`);
        });

        // 13. MOUNT HANDLERS
        html.find('.mount-ride').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Mounting ${item.name}! Movement: ${item.system.movement || 'Unknown'}`);
        });

        // 14. VEHICLE HANDLERS
        html.find('.vehicle-drive').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Piloting ${item.name}! Passengers: ${item.system.passengers || 0}`);
        });

        // 15. FLESHCRAFT HANDLERS
        html.find('.fleshcraft-activate').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            const isActive = item.system.active || false;
            await item.update({ "system.active": !isActive });

            if (!isActive) {
                ui.notifications.info(`${item.name} activated! Sanity cost: ${item.system.sanityCost || 0}`);
            } else {
                ui.notifications.info(`${item.name} deactivated`);
            }
        });

        // 16. CLOTHING HANDLERS
        html.find('.clothing-wear').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            const isWorn = item.system.equipped || false;
            await item.update({ "system.equipped": !isWorn });

            ui.notifications.info(`${item.name} ${isWorn ? 'removed' : 'worn'}`);
        });

        // 17. POTION CONSUMPTION (if not already handled elsewhere)
        html.find('.potion-drink, .potion-consume').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`${item.name} consumed! Effect: ${item.system.effect || 'See description'}`);

            // Reduce quantity or delete
            const currentQuantity = item.system.quantity || 1;
            if (currentQuantity > 1) {
                await item.update({ "system.quantity": currentQuantity - 1 });
            } else {
                await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
            }
        });

        // 18. DRUG USE HANDLERS
        html.find('.drug-use').click(async ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.warn(`Using ${item.name}! Addiction rating: ${item.system.addictionRating || 0}`);

            // Reduce quantity
            const currentQuantity = item.system.quantity || 1;
            if (currentQuantity > 1) {
                await item.update({ "system.quantity": currentQuantity - 1 });
            }
        });

        // 19. GENERIC ITEM USE HANDLER (fallback)
        html.find('.item-use, .item-activate').click(ev => {
            ev.preventDefault();
            const itemId = $(ev.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemId);

            if (!item) return;

            ui.notifications.info(`Using ${item.name}! ${item.system.effect || 'See item description for effects'}`);
        });


    }

    _preserveExpandedState(html) {
        // Store which defense details are currently expanded
        const expandedStates = {};
        html.find('.defense-checkbox').each(function () {
            const checkbox = $(this);
            expandedStates[checkbox.attr('id')] = checkbox.is(':checked');
        });

        // Store in a property for later restoration
        this._expandedDefenseStates = expandedStates;
    }

    _restoreExpandedState(html) {
        // Restore previously expanded defense details
        if (this._expandedDefenseStates) {
            Object.entries(this._expandedDefenseStates).forEach(([id, isExpanded]) => {
                const checkbox = html.find(`#${id}`);
                const details = checkbox.closest('.defense').find('.defense-details');

                checkbox.prop('checked', isExpanded);
                if (isExpanded) {
                    details.css('max-height', '200px');
                    details.css('padding-top', '10px');
                } else {
                    details.css('max-height', '0');
                    details.css('padding-top', '0');
                }
            });
        }
    }

    /*
    * Initialize data path tooltips for development
    * @param {HTMLElement} html - The rendered HTML
    * @private
    */
    _initializeDataTooltips(html) {
        // Clean up any existing tooltips first
        $('.data-tooltip').remove();

        // Store tooltip reference on the sheet instance
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }

        // Handle mouseenter on form elements and display elements
        html.on('mouseenter', 'input, select, textarea, .defense-value input, .total-value, .base-value, .avoid-value, .passive-dodge-value, .passive-parry-value', (event) => {
            const element = event.currentTarget;
            let dataPath = element.name;

            // For elements without name attributes, try to infer from class or context
            if (!dataPath) {
                const classList = element.className;

                if (classList.includes('total-value')) {
                    // Try to determine what total this represents
                    const parent = $(element).closest('.defense');
                    if (parent.find('label').text().includes('Resilience')) {
                        dataPath = 'system.totalResilience';
                    } else if (parent.find('label').text().includes('Avoid')) {
                        dataPath = 'system.totalAvoid';
                    } else if (parent.find('label').text().includes('Grit')) {
                        dataPath = 'system.totalGrit';
                    }
                } else if (classList.includes('avoid-value')) {
                    dataPath = 'system.totalAvoid';
                } else if (classList.includes('passive-dodge-value')) {
                    dataPath = 'system.defenses.passiveDodge';
                } else if (classList.includes('passive-parry-value')) {
                    dataPath = 'system.defenses.passiveParry';
                } else if (classList.includes('base-value')) {
                    const parent = $(element).closest('.defense');
                    if (parent.find('label').text().includes('Resilience')) {
                        dataPath = 'system.defenses.resilience';
                    } else if (parent.find('label').text().includes('Avoid')) {
                        dataPath = 'system.defenses.avoid';
                    } else if (parent.find('label').text().includes('Grit')) {
                        dataPath = 'system.defenses.grit';
                    }
                }
            }

            if (!dataPath) return;

            // Remove any existing tooltip
            this._removeTooltip();

            // Create new tooltip
            this.activeTooltip = $(`<div class="data-tooltip">${dataPath}</div>`);
            $('body').append(this.activeTooltip);

            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipWidth = this.activeTooltip.outerWidth();

            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            let top = rect.top - this.activeTooltip.outerHeight() - 8;

            // Keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }
            if (top < 10) {
                top = rect.bottom + 8;
            }

            this.activeTooltip.css({
                left: left + 'px',
                top: top + 'px'
            });

            // Show tooltip
            setTimeout(() => {
                if (this.activeTooltip) {
                    this.activeTooltip.addClass('show');
                }
            }, 10);
        });

        // Handle mouseleave
        html.on('mouseleave', 'input, select, textarea, .defense-value input, .total-value, .base-value, .avoid-value, .passive-dodge-value, .passive-parry-value', () => {
            this._removeTooltip();
        });
    }

    _initializeExcessPenaltyTooltips(html) {
        let excessTooltip = null;

        // Handle mouseenter on excess penalty displays
        html.on('mouseenter', '.excess-penalty', (event) => {
            const element = event.currentTarget;

            // Remove existing tooltip
            if (excessTooltip) {
                excessTooltip.remove();
                excessTooltip = null;
            }

            // Only show tooltip if the element is visible and has content
            if (!$(element).is(':visible') || !$(element).text().trim()) return;

            // Create new tooltip
            excessTooltip = $('<div class="excess-penalty-tooltip">Bonus dice added to attack rolls against this defense</div>');
            $('body').append(excessTooltip);

            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipWidth = excessTooltip.outerWidth();

            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            let top = rect.top - excessTooltip.outerHeight() - 8;

            // Keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }
            if (top < 10) {
                top = rect.bottom + 8;
            }

            excessTooltip.css({
                left: left + 'px',
                top: top + 'px'
            });

            // Show tooltip
            setTimeout(() => {
                if (excessTooltip) {
                    excessTooltip.addClass('show');
                }
            }, 10);
        });

        // Handle mouseleave
        html.on('mouseleave', '.excess-penalty', () => {
            if (excessTooltip) {
                excessTooltip.removeClass('show');
                setTimeout(() => {
                    if (excessTooltip) {
                        excessTooltip.remove();
                        excessTooltip = null;
                    }
                }, 150);
            }
        });
    }

    _recalculateArmorTotals() {
        try {
            const sheetData = this.getData();

            // Recalculate armor data
            const armorData = this._processArmor(sheetData.actor.armor || [], sheetData.actor);

            // Update the displayed totals in the DOM
            const html = this.element;
            Object.entries(armorData.armorTotals).forEach(([location, totals]) => {
                const currentSpan = html.find(`.armor-slot-container[data-slot="${location}"] .current-total-ap`);
                const maxSpan = html.find(`.armor-slot-container[data-slot="${location}"] .max-total-ap`);

                if (currentSpan.length) currentSpan.text(totals.current);
                if (maxSpan.length) maxSpan.text(totals.max);
            });
        } catch (error) {
            console.error("Error recalculating armor totals:", error);
        }
    }

    _removeTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.removeClass('show');
            setTimeout(() => {
                if (this.activeTooltip) {
                    this.activeTooltip.remove();
                    this.activeTooltip = null;
                }
            }, 150);
        }
    }

    _storeTabState(html) {
        if (!html || !html.length) return;

        // Store main inventory tab
        const activeTab = html.find('.tab-button.active');
        if (activeTab.length) {
            this._activeInventoryTab = activeTab.data('tab') || 'weapons';
        }

        // Store active subtabs for each main tab
        this._activeSubtabs = {};
        html.find('.tab-content').each((index, tabContent) => {
            const $tabContent = $(tabContent);
            const activeSubtab = $tabContent.find('.subtab-button.active');
            if (activeSubtab.length) {
                const tabId = tabContent.id.replace('-tab', '');
                this._activeSubtabs[tabId] = activeSubtab.data('subtab');
            }
        });
    }

    _restoreTabState(html) {
        if (!html || !html.length) return;

        // Restore main inventory tab
        if (this._activeInventoryTab) {
            html.find('.tab-button').removeClass('active');
            html.find('.tab-content').removeClass('active');

            const targetTab = html.find(`.tab-button[data-tab="${this._activeInventoryTab}"]`);
            const targetContent = html.find(`#${this._activeInventoryTab}-tab`);

            if (targetTab.length && targetContent.length) {
                targetTab.addClass('active');
                targetContent.addClass('active');
            }
        }

        // Restore subtabs
        if (this._activeSubtabs) {
            Object.entries(this._activeSubtabs).forEach(([tabId, subtabName]) => {
                const tabContent = html.find(`#${tabId}-tab`);
                if (tabContent.length) {
                    tabContent.find('.subtab-button').removeClass('active');
                    tabContent.find('.subtab-content').removeClass('active');

                    const targetSubtab = tabContent.find(`.subtab-button[data-subtab="${subtabName}"]`);
                    const targetSubcontent = tabContent.find(`#${subtabName}-subtab`);

                    if (targetSubtab.length && targetSubcontent.length) {
                        targetSubtab.addClass('active');
                        targetSubcontent.addClass('active');
                    }
                }
            });
        }
    }


    async close(options = {}) {
        // Clean up tooltips when sheet closes
        this._removeTooltip();
        $('.data-tooltip').remove();

        return super.close(options);
    }




}

// ====================================================================
// 3. ITEM CLASSES & SHEETS
// ====================================================================

/**
* Base Item class for The Fade system
* Handles item data preparation for all item types
*/
class TheFadeItem extends Item {
    /**
    * Prepare item data - called automatically by Foundry
    */
    prepareData() {
        super.prepareData();

        // Get the Item's data
        const itemData = this;
        const data = itemData.system;
        const flags = itemData.flags;

        const prepMap = {
            weapon: this._prepareWeaponData,
            armor: this._prepareArmorData,
            skill: this._prepareSkillData,
            spell: this._prepareSpellData,
            species: this._prepareSpeciesData,
            drug: this._prepareDrugData,
            poison: this._preparePoisonData,
            biological: this._prepareBiologicalData,
            mount: this._prepareMountData,
            vehicle: this._prepareVehicleData,
            staff: this._prepareMagicToolData,
            wand: this._prepareMagicToolData,
            gate: this._prepareGateData,
            magicitem: this._prepareMagicItemData,
            fleshcraft: this._prepareFleshcraftData,
            talent: this._prepareTalentData,
            trait: this._prepareTraitData,
            precept: this._preparePreceptData
        };
        const fn = prepMap[itemData.type];
        if (fn) fn.call(this, itemData);
    }

    // --------------------------------------------------------------------
    // ITEM TYPE PREPARATION METHODS
    // --------------------------------------------------------------------

    /**
    * Prepare weapon-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareWeaponData(itemData) {
        const data = itemData.system;

        foundry.utils.mergeObject(data, DEFAULT_WEAPON, {
            enforceTypes: false,
            insertKeys: true,
            overwrite: false
        });
    }

    /**
    * Prepare armor-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareArmorData(itemData) {
        const data = itemData.system;

        foundry.utils.mergeObject(data, DEFAULT_ARMOR, {
            enforceTypes: false,
            insertKeys: true,
            overwrite: false
        });

        if (data.currentAP === 0) data.currentAP = data.ap;
        if ((data.location === "Arms" || data.location === "Legs" || data.location == "Arms+" || data.location == "Legs+") && data.otherLimbAP === 0) {
            data.otherLimbAP = data.ap;
        }
    }

    /**
    * Prepare skill-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareSkillData(itemData) {
        const data = itemData.system;

        foundry.utils.mergeObject(data, DEFAULT_SKILL, {
            enforceTypes: false,
            insertKeys: true,
            overwrite: false
        });
    }

    /**
    * Prepare spell-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareSpellData(itemData) {
        const data = itemData.system;

        // Initialize spell properties if undefined
        if (!data.school) data.school = "General";
        if (!data.damage) data.damage = "";
        if (!data.damageType) data.damageType = "";
        if (!data.time) data.time = "Instantaneous";
        if (!data.successes) data.successes = 3;
        if (!data.attack) data.attack = "";
        if (!data.description) data.description = "";
    }

    /**
    * Prepare species-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareSpeciesData(itemData) {
        const data = itemData.system;

        // Initialize species properties if undefined
        if (!data.baseHP) data.baseHP = 0;
        if (!data.size) data.size = "medium";
        if (!data.creatureType) data.creatureType = "sapient";
        if (!data.creatureSubtype) data.creatureSubtype = "";
        if (!data.languages) data.languages = "";
        if (!data.description) data.description = "";
        if (!data.speciesAbilities) data.speciesAbilities = {};

        // Initialize ability bonuses
        if (!data.abilityBonuses) {
            data.abilityBonuses = {
                physique: 0,
                finesse: 0,
                mind: 0,
                presence: 0,
                soul: 0
            };
        }

        // Ensure all ability bonuses exist
        Object.keys({ physique: 0, finesse: 0, mind: 0, presence: 0, soul: 0 }).forEach(attr => {
            if (data.abilityBonuses[attr] === undefined) data.abilityBonuses[attr] = 0;
        });

        if (!data.movement) {
            data.movement = {
                land: 4,
                fly: 0,
                swim: 0
            };
        }
    }

    /**
    * Prepare drug-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareDrugData(itemData) {
        const data = itemData.system;

        // Initialize drug properties if undefined
        if (!data.duration) data.duration = "";
        if (!data.addiction) data.addiction = "";
        if (!data.overdose) data.overdose = "";
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    /**
    * Prepare poison-specific data
    * @param {Object} itemData - Item data object
    */
    _preparePoisonData(itemData) {
        const data = itemData.system;

        // Initialize poison properties if undefined
        if (!data.toxicity) data.toxicity = "";
        if (!data.poisonType) data.poisonType = "injury";
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    /**
    * Prepare biological item data
    * @param {Object} itemData - Item data object
    */
    _prepareBiologicalData(itemData) {
        const data = itemData.system;

        // Initialize biological item properties if undefined
        if (!data.hp) data.hp = 0;
        if (!data.energy) data.energy = 0;
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    /**
    * Prepare mount-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareMountData(itemData) {
        const data = itemData.system;

        // Initialize mount properties if undefined
        if (!data.hp) data.hp = 0;
        if (!data.avoid) data.avoid = 0;
        if (!data.size) data.size = "medium";
        if (!data.movement) data.movement = 4;
        if (!data.carryCapacity) data.carryCapacity = 0;
    }

    /**
    * Prepare vehicle-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareVehicleData(itemData) {
        const data = itemData.system;

        // Initialize vehicle properties if undefined
        if (!data.drivers) data.drivers = 1;
        if (!data.passengers) data.passengers = 0;
        if (!data.movement) data.movement = 0;
        if (!data.overland) data.overland = 0;
        if (!data.cargo) data.cargo = "";
        if (!data.vehicleType) data.vehicleType = "land";
    }

    /**
    * Prepare magic tool data (staff/wand)
    * @param {Object} itemData - Item data object
    */
    _prepareMagicToolData(itemData) {
        const data = itemData.system;

        // Initialize staff/wand properties if undefined
        if (!data.strength) data.strength = 1;
        if (!data.spellName) data.spellName = "";
        if (!data.spellDescription) data.spellDescription = "";
        if (!data.school) data.school = "General";

        if (itemData.type === 'staff') {
            if (!data.usesPerDay) data.usesPerDay = 3;
        } else if (itemData.type === 'wand') {
            if (!data.charges) data.charges = 20;
            if (!data.maxCharges) data.maxCharges = 20;
        }
    }

    /**
    * Prepare gate-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareGateData(itemData) {
        const data = itemData.system;

        // Initialize dimensional gate properties if undefined
        if (!data.range) data.range = "";
        if (!data.duration) data.duration = "";
        if (!data.usesPerDay) data.usesPerDay = "";
    }

    /**
     * Prepare magic item specific data
     * @param {Object} itemData - Item data object
     */
    _prepareMagicItemData(itemData) {
        const data = itemData.system;

        // Initialize Items of Power properties if undefined
        if (!data.slot) data.slot = "head";
        if (!data.effect) data.effect = "";
        if (!data.catalyst) data.catalyst = "";
        if (typeof data.attunement === "undefined") data.attunement = false;
        if (typeof data.equipped === "undefined") data.equipped = false;
        if (typeof data.hasAura === "undefined") data.hasAura = true;
        if (!data.auraColor) data.auraColor = "dull gray";
        if (typeof data.conflictsArmor === "undefined") data.conflictsArmor = false;
        if (!data.radiationEffect) data.radiationEffect = "";
        if (!data.creationRequirements) data.creationRequirements = "";
    }
    /**
    * Prepare fleshcraft-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareFleshcraftData(itemData) {
        const data = itemData.system;

        // Initialize fleshcraft properties if undefined
        if (!data.el) data.el = 1;
        if (!data.creatureType) data.creatureType = "";
        if (!data.hp) data.hp = 0;
        if (!data.naturalWeapons) data.naturalWeapons = "";
        if (!data.specialAbilities) data.specialAbilities = "";
    }

    /**
    * Prepare talent-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareTalentData(itemData) {
        const data = itemData.system;

        // Initialize talent properties if undefined
        if (!data.talentType) data.talentType = "general";
        if (!data.description) data.description = "";
        if (!data.effect) data.effect = "";
        if (!data.prerequisites) data.prerequisites = "";
    }


    /**
    * Prepare trait-specific data
    * @param {Object} itemData - Item data object
    */
    _prepareTraitData(itemData) {
        const data = itemData.system;

        // Initialize trait properties if undefined
        if (!data.description) data.description = "";
        if (!data.prerequisites) data.prerequisites = "";
        if (!data.traitType) data.traitType = "general";
        if (!data.source) data.source = "";
    }

    /**
    * Prepare precept-specific data
    * @param {Object} itemData - Item data object
    */
    _preparePreceptData(itemData) {
        const data = itemData.system;

        // Initialize precept properties if undefined
        if (!data.description) data.description = "";
        if (!data.deity) data.deity = "";
        if (!data.domain) data.domain = "";
    }
}

/**
* Item Sheet class for The Fade system
* Handles item sheet rendering and interactions
*/
class TheFadeItemSheet extends ItemSheet {
    /**
    * Default sheet options
    * @returns {Object} Default options
    */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "item", "species"],
            width: 520,
            height: 480,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    /**
    * Get template path based on item type
    * @returns {string} Template path
    */
    get template() {
        const path = "systems/thefade/templates/item";
        // Magic items use the generic item sheet (they already have conditional sections in item-sheet.html)
        if (this.item.type === "magicitem") {
            return `${path}/item-sheet.html`;
        }
        return `${path}/${this.item.type}-sheet.html`;
    }

    /**
    * Get template path based on item type
    * @returns {string} Template path
    */
    getData() {

        let data = {};

        // Start with a basic safe structure
        data = {
            item: this.item || {},
            system: this.item?.system || {},
            dtypes: ["String", "Number", "Boolean"],
            itemTypes: {}
        };

        // Try to call super.getData() safely
        try {
            const superData = super.getData();
            if (superData && typeof superData === 'object') {
                data = foundry.utils.mergeObject(data, superData);
            }
        } catch (error) {
            console.error("Error in super.getData():", error);
        }

        // Safely get item types
        try {
            if (CONFIG?.Item?.typeLabels) {
                data.itemTypes = Object.entries(CONFIG.Item.typeLabels).reduce((obj, e) => {
                    obj[e[0]] = game.i18n.localize(e[1]);
                    return obj;
                }, {});
            }
        } catch (error) {
            console.error("Error setting itemTypes:", error);
            data.itemTypes = {};
        }

        // Set all options objects - use basic objects to avoid any complex operations
        try {
            data.itemCategoryOptions = {
                "magicitem": "Item of Power",
                "drug": "Drug",
                "poison": "Poison",
                "biological": "Biological",
                "medical": "Medical",
                "travel": "Travel & Survival",
                "mount": "Mount",
                "vehicle": "Vehicle",
                "musical": "Musical Instrument",
                "potion": "Potion",
                "staff": "Staff",
                "wand": "Wand",
                "gate": "Dimensional Gate",
                "communication": "Communication Device",
                "containment": "Containment Item",
                "dream": "Dream Harvesting",
                "fleshcraft": "Flesh Craft",
                "clothing": "Clothing"
            };

            data.spellSchoolOptions = {
                "General": "General",
                "Alchemy": "Alchemy",
                "Divine": "Divine",
                "Elementalism": "Elementalism",
                "Malevolent": "Malevolent",
                "Martial": "Martial",
                "Naturalism": "Naturalism",
                "Preternaturalism": "Preternaturalism",
                "Rituals": "Rituals",
                "Runes": "Runes",
                "Spiritualism": "Spiritualism"
            };

            data.magicItemSlotOptions = {
                "head": "Head",
                "neck": "Neck",
                "body": "Body",
                "hands": "Hands",
                "ring": "Ring",
                "belt": "Belt",
                "boots": "Boots"
            };

            data.communicationComplexityOptions = {
                "audio": "Audio Only",
                "audiovisual": "Audio & Visual"
            };

            data.materialOptions = {
                "iron": "Iron (Standard)",
                "bone": "Bone",
                "wood": "Wood",
                "leather": "Leather",
                "copper": "Copper",
                "bronze": "Bronze",
                "coldIron": "Cold Iron",
                "steel": "Steel",
                "coldSteel": "Cold Steel",
                "gold": "Gold",
                "orichalcum": "Orichalcum",
                "silver": "Silver",
                "mithral": "Mithral",
                "platinum": "Platinum",
                "adamantine": "Adamantine",
                "ritewood": "Ritewood",
                "blacksteel": "Blacksteel"
            };

            data.armorLocationOptions = {
                "Head": "Head",
                "Head+": "Head+ (Coif, Gorget)",
                "Body": "Body",
                "Body+": "Body+ (Leather Coat, Chain Shirt)",
                "Arms": "Arms",
                "Arms+": "Arms+ (Ailette, Couter)",
                "Legs": "Legs",
                "Legs+": "Legs+ (Poleyn, Tasset)",
                "Shield": "Shield"
            };

            data.weaponDamageTypeOptions = {
                "B": "Bludgeoning (B)",
                "S": "Slashing (S)",
                "P": "Piercing (P)",
                "BoP": "Bludgeoning or Piercing (B or P)",
                "BP": "Bludgeoning & Piercing (B&P)",
                "SP": "Slashing & Piercing (S&P)",
                "SoP": "Slashing or Piercing (S or P)",
                "SoB": "Slashing or Bludgeoning (S or B)",
                "F": "Fire (F)",
                "C": "Cold (C)",
                "A": "Acid (A)",
                "E": "Electricity (E)",
                "So": "Sonic (So)",
                "Sm": "Smiting (Sm)",
                "Ex": "Expel (Ex)",
                "Psi": "Psychokinetic (Psi)",
                "Co": "Corruption (Co)",
                "Ut": "Untyped (Ut)"
            };

            data.weaponHandednessOptions = {
                "Light": "Light",
                "One-Handed": "One-Handed",
                "Two-Handed": "Two-Handed"
            };

            data.weaponSkillOptions = {
                "Axe": "Axe",
                "Bow": "Bow",
                "Cudgel": "Cudgel",
                "Firearm": "Firearm",
                "Heavy Weaponry": "Heavy Weaponry",
                "Polearm": "Polearm",
                "Sword": "Sword",
                "Thrown": "Thrown",
                "Unarmed": "Unarmed",
                "Spellcasting": "Spellcasting"
            };

            data.weaponAttributeOptions = {
                "physique": "Physique",
                "finesse": "Finesse",
                "soul": "Soul"
            };

            data.skillRankOptions = {
                "untrained": "Untrained",
                "learned": "Learned",
                "practiced": "Practiced",
                "adept": "Adept",
                "experienced": "Experienced",
                "expert": "Expert",
                "mastered": "Mastered"
            };

            data.skillCategoryOptions = {
                "Combat": "Combat",
                "Craft": "Craft",
                "Knowledge": "Knowledge",
                "Magical": "Magical",
                "Physical": "Physical",
                "Sense": "Sense",
                "Social": "Social"
            };

            data.skillAttributeOptions = {
                "physique": "Physique",
                "finesse": "Finesse",
                "mind": "Mind",
                "presence": "Presence",
                "soul": "Soul",
                "physique_finesse": "Physique & Finesse (Average)",
                "mind_soul": "Mind & Soul (Average)",
                "finesse_presence": "Finesse & Presence (Average)",
                "physique_mind": "Physique & Mind (Average)"
            };

            data.creatureTypeOptions = {
                "artificial": "Artificial",
                "beast": "Beast",
                "dragon": "Dragon",
                "extraplanar": "Extraplanar",
                "fey": "Fey",
                "plant": "Plant",
                "sapient": "Sapient",
                "undead": "Undead"
            };

            data.spellAttackOptions = {
                "": "None",
                "Avoid": "vs. Avoid",
                "Resilience": "vs. Resilience",
                "Grit": "vs. Grit"
            };

            data.spellDamageTypeOptions = {
                "": "None",
                "B": "Bludgeoning (B)",
                "S": "Slashing (S)",
                "P": "Piercing (P)",
                "F": "Fire (F)",
                "C": "Cold (C)",
                "A": "Acid (A)",
                "E": "Electricity (E)",
                "So": "Sonic (So)",
                "Sm": "Smiting (Sm)",
                "Ex": "Expel (Ex)",
                "Psi": "Psychokinetic (Psi)",
                "Co": "Corruption (Co)",
                "Ut": "Untyped (Ut)"
            };

            data.mishapModifierOptions = {
                "none": "None",
                "corruption": "Corruption Damage (Failure = One Stage Worse)"
            };

            data.pathTierOptions = {
                "1": "Tier 1",
                "2": "Tier 2",
                "3": "Tier 3"
            };

            data.sizeOptions = SIZE_OPTIONS;
        } catch (error) {
            console.error("Error setting options:", error);
        }

        // Handle special item types
        try {
            if (this.item?.type === 'path') {
                if (this._preparePathSkills) {
                    this._preparePathSkills(data);
                }
            }

            if (this.item?.type === 'talent') {
                data.talentTypes = {
                    "general": "General Talents",
                    "combat": "Combat Talents",
                    "magic": "Magic Talents",
                    "species": "Species Talents",
                    "monster": "Monster Talents",
                    "trait": "Traits",
                    "precept": "Precepts"
                };
            }
        } catch (error) {
            console.error("Error in special item type handling:", error);
        }
        return data;
    }

    /**
    * Activate item sheet listeners
    * @param {HTMLElement} html - Sheet HTML element
    */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Add drag-and-drop highlighting when dragging over the skills tab
        if (this.item.type === 'path') {
            // Get the skills tab and skills list
            const skillsTab = html.find('.tab[data-tab="skills"]');
            const skillsList = html.find('.skills-list');

            // Add dragover event to highlight drop targets
            skillsTab.on('dragover', event => {
                event.preventDefault();
                skillsTab.addClass('drop-target');
            });

            // Add dragleave event to remove highlighting
            skillsTab.on('dragleave', event => {
                event.preventDefault();
                skillsTab.removeClass('drop-target');
            });

            // Add drop event to handle the drop and remove highlighting
            skillsTab.on('drop', event => {
                event.preventDefault();
                skillsTab.removeClass('drop-target');

                // Make sure we use the original browser event
                const dragEvent = event.originalEvent || event;
                this._onDrop(dragEvent);
            });

            // Same events for the skills list if it exists
            if (skillsList.length) {
                skillsList.on('drop', event => {
                    event.preventDefault();
                    skillsList.removeClass('drop-target');

                    // Make sure we use the original browser event
                    const dragEvent = event.originalEvent || event;
                    this._onDrop(dragEvent);
                });
            }
        }

        // Dynamic name length calculation for font sizing
        html.find('.item-name-dynamic input').on('input', function () {
            const nameLength = this.value.length;
            this.style.setProperty('--name-length', nameLength);
        });

        // Initialize name length on sheet open
        html.find('.item-name-dynamic input').each(function () {
            const nameLength = this.value.length;
            this.style.setProperty('--name-length', nameLength);
        });

        // Handle item type change
        html.find('select[name="type"]').change(ev => {
            const newType = ev.currentTarget.value;

            // Only respond if the type has actually changed
            if (newType !== this.item.type) {
                ui.notifications.warn("Changing item types directly is not supported. Please create a new item of the desired type.");

                // Reset the dropdown to the current type
                ev.currentTarget.value = this.item.type;
            }
        });

        // For all other fields, use this approach:
        html.find('input[name], select[name]:not([name="type"]), textarea[name]').change(ev => {
            const input = ev.currentTarget;
            const fieldName = input.name;

            let value = input.value;

            // Convert to number for numeric inputs
            if (input.dataset.dtype === 'Number') {
                value = Number(value);
                if (isNaN(value)) value = 0;
            }

            // Handle system data updates
            if (fieldName.startsWith('system.')) {
                const path = fieldName.replace('system.', '');
                this.item.update({
                    "system": {
                        [path]: value
                    }
                });
            } else if (fieldName !== 'type') { // Skip type field
                // For other updates
                this.item.update({
                    [fieldName]: value
                });
            }
        });

        // Add skill to path
        html.find('.path-skill-create').click(async ev => {
            ev.preventDefault();

            if (this.item.type !== 'path') return;

            await this._showPathSkillCreationDialog();
        });

        // Edit path skill
        html.find('.path-skill-edit').each((index, element) => {
            const li = $(element).closest('li');
            const skillId = li.data('item-id');

            if (skillId) {
                const pathSkills = this.item.system.pathSkills || [];
                const skillData = pathSkills.find(s => s._id === skillId);

                if (skillData && skillData.system.entryType) {
                    const entryType = skillData.system.entryType;

                    // Disable edit for choice entries
                    if (entryType === PATH_SKILL_TYPES.CHOOSE_CATEGORY ||
                        entryType === PATH_SKILL_TYPES.CHOOSE_LORE ||
                        entryType === PATH_SKILL_TYPES.CHOOSE_PERFORM ||
                        entryType === PATH_SKILL_TYPES.CHOOSE_CRAFT) {

                        $(element).addClass('disabled-button')
                            .attr('title', 'Choice Entry - Cannot Edit Directly')
                            .off('click')
                            .on('click', function (e) {
                                e.preventDefault();
                                ui.notifications.info('Choice entries cannot be edited directly. Delete and recreate if needed.');
                            });
                    }
                }
            }
        });

        // Delete path skill
        html.find('.path-skill-delete').click(async ev => {
            ev.preventDefault();
            const li = ev.currentTarget.closest("li");
            const skillId = li.dataset.itemId;

            // Confirm deletion
            new Dialog({
                title: "Confirm Deletion",
                content: "<p>Are you sure you want to remove this skill from the path?</p>",
                buttons: {
                    delete: {
                        icon: '<i class="fas fa-trash"></i>',
                        label: "Delete",
                        callback: async () => {
                            // Get the current path skills
                            const pathSkills = duplicate(this.item.system.pathSkills || []);

                            // Remove the skill from the array
                            const index = pathSkills.findIndex(s => s._id === skillId);
                            if (index !== -1) {
                                pathSkills.splice(index, 1);

                                // Save changes to the path
                                await this.item.update({ "system.pathSkills": pathSkills });
                                this.render(true);
                            }
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "cancel"
            }).render(true);
        });

        // Handle path skill rank changes
        html.find('.path-skill-rank').change(async ev => {
            ev.preventDefault();
            const select = ev.currentTarget;
            const skillId = select.dataset.skillId;
            const newRank = select.value;

            // Get the current path skills
            const pathSkills = duplicate(this.item.system.pathSkills || []);
            const skillIndex = pathSkills.findIndex(s => s._id === skillId);

            if (skillIndex !== -1) {
                // Update the skill rank
                pathSkills[skillIndex].system.rank = newRank;

                // Save changes to the path
                await this.item.update({ "system.pathSkills": pathSkills });
                this.render(true);

                ui.notifications.info(`Updated ${pathSkills[skillIndex].name} to ${newRank} rank.`);
            }
        });

        // Handle skill browsing
        html.find('.skill-browse').off('click').click(ev => {
            ev.preventDefault();

            if (this.item.type !== 'path') return;

            this._showPathSkillBrowserDialog();
        });

        // Add a button to handle adding path skills to a character
        if (this.item.type === 'path') {
            // Add apply to character button if it doesn't exist
            if (html.find('.skill-apply-to-character').length === 0) {
                html.find('.skill-browse').parent().append('<a class="skill-apply-to-character" title="Add Skills to Character"><i class="fas fa-user-plus"></i></a>');
            }

            // Add event listener for applying skills to a character
            html.find('.skill-apply-to-character').click(async ev => {
                ev.preventDefault();

                // Get all characters
                const characters = game.actors.filter(a => a.type === 'character');

                if (characters.length === 0) {
                    ui.notifications.warn("No characters found in this game.");
                    return;
                }

                // Create character options for the dialog
                const characterOptions = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

                // Create a dialog for selecting a character
                const dialog = new Dialog({
                    title: "Add Path Skills to Character",
                    content: `<form>
                    <p>Select a character to add the skills from ${this.item.name}:</p>
                    <div class="form-group">
                    <select id="character-select" name="characterId">
                        ${characterOptions}
                    </select>
                    </div>
                </form>`,
                    buttons: {
                        add: {
                            icon: '<i class="fas fa-plus"></i>',
                            label: "Add Skills",
                            callback: async html => {
                                const characterId = html.find('#character-select').val();
                                const actor = game.actors.get(characterId);

                                if (!actor) return;

                                // Check if the path has associated skills
                                if (this.item.system.pathSkills && this.item.system.pathSkills.length > 0) {
                                    // Collect skills to add
                                    const skillsToAdd = [];
                                    let skillsUpgraded = 0;

                                    for (const pathSkill of this.item.system.pathSkills) {
                                        // Check if character already has this skill
                                        const existingSkill = actor.items.find(i =>
                                            i.type === 'skill' && i.name === pathSkill.name
                                        );

                                        if (!existingSkill) {
                                            // Add this skill to our list
                                            const newSkill = duplicate(pathSkill);
                                            delete newSkill._id; // Remove the path's ID to allow Foundry to generate a new one
                                            skillsToAdd.push(newSkill);
                                        } else {
                                            // Character already has this skill, optionally upgrade the rank if path offers better training
                                            const pathRankValue = getRankValue(pathSkill.system.rank);
                                            const existingRankValue = getRankValue(existingSkill.system.rank);

                                            // If path offers better training, upgrade the skill
                                            if (pathRankValue > existingRankValue) {
                                                await existingSkill.update({
                                                    "system.rank": pathSkill.system.rank
                                                });
                                                skillsUpgraded++;
                                            }
                                        }
                                    }

                                    // Add all new skills to the character
                                    if (skillsToAdd.length > 0) {
                                        await actor.createEmbeddedDocuments("Item", skillsToAdd);
                                    }

                                    // Display results
                                    let message = "";
                                    if (skillsToAdd.length > 0) {
                                        message += `${skillsToAdd.length} skills added. `;
                                    }
                                    if (skillsUpgraded > 0) {
                                        message += `${skillsUpgraded} skills upgraded.`;
                                    }

                                    if (message) {
                                        ui.notifications.info(`Skills from ${this.item.name} applied to ${actor.name}: ${message}`);
                                    } else {
                                        ui.notifications.info(`No new skills to add. ${actor.name} already has all skills from ${this.item.name}.`);
                                    }
                                } else {
                                    ui.notifications.warn(`${this.item.name} has no associated skills to add.`);
                                }
                            }
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel"
                        }
                    },
                    default: "add"
                });

                dialog.render(true);
            });
        }

        // Handle input changes for species sheets
        if (this.item.type === 'species') {
            html.find('input, select, textarea').change(async (ev) => {
                ev.preventDefault();
                ev.stopImmediatePropagation();

                const element = ev.currentTarget;
                const field = element.name;
                let value = element.value;

                if (element.dataset.dtype === 'Number') {
                    value = Number(value);
                }

                await this.item.update({ [field]: value });
            });
        }

        // This handles both path and species abilities
        html.find('.ability-add').click(event => {
            event.preventDefault();

            if (this.item.type === 'path') {
                const abilities = duplicate(this.item.system.abilities || {});
                const id = randomID(16);
                abilities[id] = { name: "New Ability", description: "" };
                this.item.update({ "system.abilities": abilities });
            }
            else if (this.item.type === 'species') {
                const abilities = duplicate(this.item.system.speciesAbilities || {});
                const id = randomID(16);
                abilities[id] = { name: "New Ability", description: "" };
                this.item.update({ "system.speciesAbilities": abilities });
            }
        });

        html.find('.ability-delete').click(async (event) => {
            event.preventDefault();

            // Get the parent ability item and its ID
            const abilityItem = event.currentTarget.closest(".ability-item");
            const abilityId = abilityItem.dataset.abilityId;

            if (!abilityId) return;

            // Create a deletion update using Foundry's special -=null syntax
            let updateData = {};

            if (this.item.type === 'path') {
                updateData = { [`system.abilities.-=${abilityId}`]: null };
            }
            else if (this.item.type === 'species') {
                updateData = { [`system.speciesAbilities.-=${abilityId}`]: null };
            }

            // Apply the update
            await this.item.update(updateData);

            // Force a data reset and re-render
            this.item.reset();

            // Use a small timeout to ensure data is processed
            setTimeout(() => {
                this.render(false);
            }, 50);
        });

        html.find('select[name="system.species.flexibleBonus.selectedAttribute"]').change(async ev => {
            const selectedAttr = ev.target.value;

            // Update the character sheet
            await this.actor.update({
                "system.species.flexibleBonus.selectedAttribute": selectedAttr
            });

            // Refresh the sheet to show the updated bonus
            this.render(true);
        });

        // Handle autogrow textareas
        html.find("textarea.autogrow").each(function () {
            const ta = this;

            const resize = () => {
                ta.style.height = "auto";
                ta.style.height = ta.scrollHeight + "px";
            };

            ta.style.overflowY = "hidden";
            ta.style.resize = "none";

            ta.addEventListener("input", resize);

            // Resize after a short delay in case of tab switch render delay
            setTimeout(resize, 0);
        });

        html.find('.defense-checkbox').change(function () {
            const checkbox = $(this);
            const details = checkbox.closest('.defense').find('.defense-details');

            if (checkbox.is(':checked')) {
                details.css('max-height', details.prop('scrollHeight') + 'px');
            } else {
                details.css('max-height', '0');
            }
        });

        // Initialize defense details state
        html.find('.defense-details').each(function () {
            const details = $(this);
            const checkbox = details.siblings('.defense-toggle-container').find('.defense-checkbox');

            if (checkbox.is(':checked')) {
                details.css('max-height', details.prop('scrollHeight') + 'px');
            } else {
                details.css('max-height', '0');
            }
        });

        // Handle item charges and uses
        if (this.item.type === 'wand') {
            html.find('.charge-use').click(ev => {
                ev.preventDefault();
                const charges = this.item.system.charges || 0;
                if (charges > 0) {
                    this.item.update({ "system.charges": charges - 1 });
                } else {
                    ui.notifications.warn("This wand has no charges remaining.");
                }
            });
        }

        if (this.item.type === 'staff') {
            html.find('.use-per-day').click(ev => {
                ev.preventDefault();
                const uses = this.item.system.uses || 0;
                const maxUses = this.item.system.usesPerDay || 3;
                if (uses < maxUses) {
                    this.item.update({ "system.uses": uses + 1 });
                } else {
                    ui.notifications.warn("This staff has been used the maximum number of times today.");
                }
            });

            html.find('.reset-uses').click(ev => {
                ev.preventDefault();
                this.item.update({ "system.uses": 0 });
                ui.notifications.info("Staff uses have been reset for a new day.");
            });
        }

        // Handle biological item energy consumption
        if (this.item.type === 'biological') {
            html.find('.use-energy').click(ev => {
                ev.preventDefault();
                const energy = this.item.system.energy || 0;
                if (energy > 0) {
                    this.item.update({ "system.energy": energy - 1 });
                } else {
                    ui.notifications.warn("This biological item has no energy remaining.");
                }
            });
        }

        // Handle dimensional gate activation
        if (this.item.type === 'gate') {
            html.find('.activate-gate').click(ev => {
                ev.preventDefault();
                const usesPerDay = this.item.system.usesPerDay || 0;
                const usesRemaining = this.item.system.usesRemaining || usesPerDay;

                if (usesRemaining > 0) {
                    ui.notifications.info(`Gate activated! Duration: ${this.item.system.duration}`);
                    this.item.update({ "system.usesRemaining": usesRemaining - 1 });
                } else {
                    ui.notifications.warn("This gate cannot be used again today.");
                }
            });

            html.find('.reset-gate').click(ev => {
                ev.preventDefault();
                const usesPerDay = this.item.system.usesPerDay || 0;
                this.item.update({ "system.usesRemaining": usesPerDay });
                ui.notifications.info("Gate uses have been reset for a new day.");
            });
        }

        // Handle communication device usage
        if (this.item.type === 'communication') {
            html.find('.activate-relay').click(ev => {
                ev.preventDefault();
                const targetCode = html.find('.target-relay-code').val();

                if (targetCode) {
                    ui.notifications.info(`Attempting to establish connection with relay code: ${targetCode}`);
                } else {
                    ui.notifications.warn("Please enter a target relay code.");
                }
            });
        }

        // Handle potion consumption
        if (this.item.type === 'potion') {
            html.find('.consume-potion').click(ev => {
                ev.preventDefault();
                // If this item is owned by an actor, we can apply its effects
                if (this.item.parent) {
                    ui.notifications.info(`${this.item.name} consumed by ${this.item.parent.name}!`);
                    // Here we would apply the potion's effects to the actor

                    // Remove the potion after use (or reduce quantity)
                    const quantity = this.item.system.quantity || 1;
                    if (quantity > 1) {
                        this.item.update({ "system.quantity": quantity - 1 });
                    } else {
                        this.item.parent.deleteEmbeddedDocuments("Item", [this.item.id]);
                    }
                } else {
                    ui.notifications.warn("This potion is not owned by a character and cannot be consumed.");
                }
            });
        }

        // Checkbox for attuned items of power
        if (this.item.type === 'magicitem') {
            html.find('input[name="system.attunement"]').change(ev => {
                const isAttuned = ev.currentTarget.checked;
                this.item.update({ "system.attunement": isAttuned });

                if (isAttuned) {
                    ui.notifications.info(`${this.item.name} is now attuned to its owner.`);
                } else {
                    ui.notifications.info(`${this.item.name} is no longer attuned to anyone.`);
                }
            });
        }

        // Add general input change handler for all item sheets
        html.find('input[name], select[name], textarea[name]').change(ev => {
            const input = ev.currentTarget;
            const fieldName = input.name;

            let value = input.value;

            // Convert to number for numeric inputs
            if (input.dataset.dtype === 'Number') {
                value = Number(value);
                if (isNaN(value)) value = 0;
            }

            // Handle system data updates
            if (fieldName.startsWith('system.')) {
                const path = fieldName.replace('system.', '');
                this.item.update({
                    "system": {
                        [path]: value
                    }
                });
            } else {
                // For other updates
                this.item.update({
                    [fieldName]: value
                });
            }
        });

        // Reset armor AP
        html.find('.reset-armor-ap').click(async ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const itemId = li.data("itemId");

            if (!itemId) return;

            const item = this.actor.items.get(itemId);
            if (!item || item.type !== "armor") return;

            // Convert to number to ensure consistent types
            const maxAP = Number(item.system.ap);

            try {
                // Reset current AP to max AP
                await item.update({
                    "system.currentAP": maxAP
                });
                ui.notifications.info(`${item.name}'s armor protection has been restored to full.`);
            } catch (error) {
                console.error("Error resetting armor AP:", error);
                ui.notifications.error("Error resetting armor. Check console for details.");
            }
        });

        html.find('.reset-all-armor').click(async ev => {
            ev.preventDefault();

            const armorItems = this.actor.items.filter(i => i.type === "armor");
            if (armorItems.length === 0) {
                ui.notifications.warn("No armor items found.");
                return;
            }

            try {
                for (const armor of armorItems) {
                    const maxAP = Number(armor.system.ap);
                    await armor.update({
                        "system.currentAP": maxAP
                    });
                }

                ui.notifications.info(`All armor has been restored to full protection.`);
            } catch (error) {
                console.error("Error resetting all armor:", error);
                ui.notifications.error("Error resetting all armor. Check console for details.");
            }
        });

        // Quick-add buttons for common path skill entries
        document.addEventListener('quickAddPathSkill', async (e) => {
            if (this.item.type !== 'path') return;

            const type = e.detail.type;
            let skillEntry;

            switch (type) {
                case 'choose-combat-1':
                    skillEntry = {
                        _id: randomID(16),
                        name: "Choose 1 Combat Skill",
                        type: "skill",
                        system: {
                            rank: "learned",
                            category: "Combat",
                            attribute: "varies",
                            entryType: PATH_SKILL_TYPES.CHOOSE_CATEGORY,
                            chooseCount: 1,
                            chooseCategory: "Combat"
                        }
                    };
                    break;

                case 'choose-social-1':
                    skillEntry = {
                        _id: randomID(16),
                        name: "Choose 1 Social Skill",
                        type: "skill",
                        system: {
                            rank: "learned",
                            category: "Social",
                            attribute: "presence",
                            entryType: PATH_SKILL_TYPES.CHOOSE_CATEGORY,
                            chooseCount: 1,
                            chooseCategory: "Social"
                        }
                    };
                    break;

                case 'choose-lore-1':
                    skillEntry = {
                        _id: randomID(16),
                        name: "Choose 1 Lore Skill",
                        type: "skill",
                        system: {
                            rank: "learned",
                            category: "Knowledge",
                            attribute: "mind",
                            entryType: PATH_SKILL_TYPES.CHOOSE_LORE,
                            chooseCount: 1
                        }
                    };
                    break;

                case 'choose-craft-1':
                    skillEntry = {
                        _id: randomID(16),
                        name: "Choose 1 Custom Craft Skill",
                        type: "skill",
                        system: {
                            rank: "learned",
                            category: "Craft",
                            attribute: "varies",
                            entryType: PATH_SKILL_TYPES.CHOOSE_CRAFT,
                            chooseCount: 1
                        }
                    };
                    break;
            }

            if (skillEntry) {
                const pathSkills = duplicate(this.item.system.pathSkills || []);
                pathSkills.push(skillEntry);

                await this.item.update({ "system.pathSkills": pathSkills });
                this.render(true);
                ui.notifications.info(`Added "${skillEntry.name}" to path skills`);
            }
        });

        const sections = ['path', 'talent', 'trait', 'precept'];

        sections.forEach(section => {
            // Checkbox toggle handler
            html.find(`.${section}-checkbox`).change(function () {
                const checkbox = $(this);
                const description = checkbox.siblings(`.${section}-description`);
                const icon = checkbox.siblings(`.${section}-header`).find(`.${section}-toggle-icon`);

                if (checkbox.is(':checked')) {
                    description.css('max-height', '500px');
                    description.css('padding', '10px');
                    icon.css('transform', 'rotate(180deg)');
                } else {
                    description.css('max-height', '0');
                    description.css('padding', '0');
                    icon.css('transform', 'rotate(0deg)');
                }
            });

            // Header click handler (to trigger checkbox)
            html.find(`.${section}-header`).click(function (e) {
                if ($(e.target).closest(`.${section}-controls`).length) return; // Don't trigger on control buttons
                const checkbox = $(this).siblings(`.${section}-checkbox`);
                checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
            });
        });

        if (this.item.type === 'species') {
            html.find('input[name="system.biologicallyImmortal"]').change((ev) => {
                const isChecked = ev.currentTarget.checked;
                const ageInputs = html.find('input[name="system.youngAge"], input[name="system.adultAge"], input[name="system.oldAge"], input[name="system.maximumAge"]');

                if (isChecked) {
                    ageInputs.prop('disabled', true).addClass('disabled');
                } else {
                    ageInputs.prop('disabled', false).removeClass('disabled');
                }
            });

            // Set initial state on render
            const immortalCheckbox = html.find('input[name="system.biologicallyImmortal"]');
            if (immortalCheckbox.is(':checked')) {
                const ageInputs = html.find('input[name="system.youngAge"], input[name="system.adultAge"], input[name="system.oldAge"], input[name="system.maximumAge"]');
                ageInputs.prop('disabled', true).addClass('disabled');
            }
        }
    }

    /**
    * Prepare path skills for display
    * @param {Object} sheetData - Sheet data object
    */
    _preparePathSkills(sheetData) {
        if (this.item.type !== 'path') return;

        const pathSkills = [];

        if (this.item.system.pathSkills && Array.isArray(this.item.system.pathSkills)) {
            for (const skillData of this.item.system.pathSkills) {
                const processedSkill = {
                    _id: skillData._id || randomID(16),
                    name: skillData.name,
                    system: skillData.system || {},
                    img: skillData.img || "icons/svg/item-bag.svg",
                    rank: skillData.system?.rank || skillData.rank || 'learned'  // ADD THIS LINE
                };

                // Determine entry type and set display properties
                const entryType = skillData.system.entryType || PATH_SKILL_TYPES.SPECIFIC_SKILL;

                switch (entryType) {
                    case PATH_SKILL_TYPES.SPECIFIC_SKILL:
                        processedSkill.entryTypeDisplay = "Core Skill";
                        processedSkill.entryTypeClass = "specific";
                        processedSkill.isChoiceEntry = false;
                        processedSkill.isCustomEntry = false;
                        break;

                    case PATH_SKILL_TYPES.SPECIFIC_CUSTOM:
                        processedSkill.entryTypeDisplay = "Custom Skill";
                        processedSkill.entryTypeClass = "custom";
                        processedSkill.isChoiceEntry = false;
                        processedSkill.isCustomEntry = true;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_CATEGORY:
                        processedSkill.entryTypeDisplay = "Choose Category";
                        processedSkill.entryTypeClass = "choice";
                        processedSkill.isChoiceEntry = true;
                        processedSkill.isCustomEntry = false;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_LORE:
                        processedSkill.entryTypeDisplay = "Choose Lore";
                        processedSkill.entryTypeClass = "choice";
                        processedSkill.isChoiceEntry = true;
                        processedSkill.isCustomEntry = true;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_PERFORM:
                        processedSkill.entryTypeDisplay = "Choose Perform";
                        processedSkill.entryTypeClass = "choice";
                        processedSkill.isChoiceEntry = true;
                        processedSkill.isCustomEntry = true;
                        break;

                    case PATH_SKILL_TYPES.CHOOSE_CRAFT:
                        processedSkill.entryTypeDisplay = "Choose Craft";
                        processedSkill.entryTypeClass = "choice";
                        processedSkill.isChoiceEntry = true;
                        processedSkill.isCustomEntry = true;
                        break;

                    default:
                        processedSkill.entryTypeDisplay = "Unknown";
                        processedSkill.entryTypeClass = "unknown";
                        processedSkill.isChoiceEntry = false;
                        processedSkill.isCustomEntry = false;
                }

                pathSkills.push(processedSkill);
            }
        }

        sheetData.pathSkills = pathSkills;
    }

    /**
    * Generate options for core skills dropdown
    */
    _generateCoreSkillOptions() {
        const options = DEFAULT_SKILLS.map(skill =>
            `<option value="${skill.name}">${skill.name} (${skill.category})</option>`
        ).join('');
        return options;
    }

    /**
    * Show dialog for browsing and adding existing skills to paths
    * This is for adding core skills to paths via browsing
    */
    _showPathSkillBrowserDialog() {
        // Open skill compendium for browsing
        openCompendiumBrowser("skill");

        // Listen for skill selection
        const self = this;
        const handler = function (e) {
            const skill = e.detail.item;

            if (skill && skill.type === "skill") {
                // Add as specific skill entry
                const pathSkills = duplicate(self.item.system.pathSkills || []);

                // Check if already exists
                const exists = pathSkills.some(s => s.name === skill.name);

                if (!exists) {
                    const skillEntry = {
                        _id: randomID(16),
                        name: skill.name,
                        type: "skill",
                        system: {
                            rank: "learned",
                            category: skill.system.category,
                            attribute: skill.system.attribute,
                            entryType: PATH_SKILL_TYPES.SPECIFIC_SKILL
                        }
                    };

                    pathSkills.push(skillEntry);
                    self.item.update({ "system.pathSkills": pathSkills });
                    ui.notifications.info(`Added ${skill.name} to path skills`);
                    self.render(true);
                } else {
                    ui.notifications.warn(`${skill.name} is already in this path`);
                }
            }

            document.removeEventListener("compendiumSelection", handler);
        };

        document.addEventListener("compendiumSelection", handler);
    }

    /**
    * Process the path skill entry creation
    */
    async _processPathSkillEntry(html) {
        const entryType = html.find('#entry-type').val();
        const targetRank = html.find('#target-rank').val();

        let skillEntry;

        switch (entryType) {
            case 'specific-skill':
                const skillName = html.find('#specific-skill').val();
                const coreSkill = DEFAULT_SKILLS.find(s => s.name === skillName);
                if (!coreSkill) {
                    ui.notifications.error("Core skill not found");
                    return;
                }

                skillEntry = {
                    _id: randomID(16),
                    name: skillName,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: coreSkill.category,
                        attribute: coreSkill.attribute,
                        entryType: PATH_SKILL_TYPES.SPECIFIC_SKILL
                    }
                };
                break;

            case 'custom-craft':
                const craftName = html.find('#custom-name').val().trim();
                if (!craftName) {
                    ui.notifications.error("Craft skill name is required");
                    return;
                }

                skillEntry = {
                    _id: randomID(16),
                    name: `Craft (${craftName})`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Craft",
                        attribute: "mind",
                        entryType: PATH_SKILL_TYPES.SPECIFIC_CUSTOM,
                        skillType: "craft",
                        subtype: craftName
                    }
                };
                break;

            case 'custom-lore':
                const loreSubject = html.find('#custom-name').val().trim();
                if (!loreSubject) {
                    ui.notifications.error("Lore subject is required");
                    return;
                }

                skillEntry = {
                    _id: randomID(16),
                    name: `Lore (${loreSubject})`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Knowledge",
                        attribute: "mind",
                        entryType: PATH_SKILL_TYPES.SPECIFIC_CUSTOM,
                        skillType: "lore",
                        subtype: loreSubject
                    }
                };
                break;

            case 'custom-perform':
                const performType = html.find('#custom-name').val().trim();
                if (!performType) {
                    ui.notifications.error("Performance type is required");
                    return;
                }

                skillEntry = {
                    _id: randomID(16),
                    name: `Perform (${performType})`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Physical",
                        attribute: "finesse_presence",
                        entryType: PATH_SKILL_TYPES.SPECIFIC_CUSTOM,
                        skillType: "perform",
                        subtype: performType
                    }
                };
                break;

            case 'choose-category':
                const category = html.find('#choose-category').val();
                const count = parseInt(html.find('#choose-count').val());

                skillEntry = {
                    _id: randomID(16),
                    name: `Choose ${count} ${category} Skill${count > 1 ? 's' : ''}`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: category,
                        attribute: "varies",
                        entryType: PATH_SKILL_TYPES.CHOOSE_CATEGORY,
                        chooseCount: count,
                        chooseCategory: category
                    }
                };
                break;

            case 'choose-lore':
                const loreCount = parseInt(html.find('#choose-count').val());

                skillEntry = {
                    _id: randomID(16),
                    name: `Choose ${loreCount} Lore Skill${loreCount > 1 ? 's' : ''}`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Knowledge",
                        attribute: "mind",
                        entryType: PATH_SKILL_TYPES.CHOOSE_LORE,
                        chooseCount: loreCount
                    }
                };
                break;

            case 'choose-perform':
                const performCount = parseInt(html.find('#choose-count').val());

                skillEntry = {
                    _id: randomID(16),
                    name: `Choose ${performCount} Perform Skill${performCount > 1 ? 's' : ''}`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Physical",
                        attribute: "finesse_presence",
                        entryType: PATH_SKILL_TYPES.CHOOSE_PERFORM,
                        chooseCount: performCount
                    }
                };
                break;

            case 'choose-craft':
                const craftCount = parseInt(html.find('#choose-count').val());

                skillEntry = {
                    _id: randomID(16),
                    name: `Choose ${craftCount} Custom Craft Skill${craftCount > 1 ? 's' : ''}`,
                    type: "skill",
                    system: {
                        rank: targetRank,
                        category: "Craft",
                        attribute: "varies",
                        entryType: PATH_SKILL_TYPES.CHOOSE_CRAFT,
                        chooseCount: craftCount
                    }
                };
                break;

            default:
                ui.notifications.error("Invalid entry type");
                return;
        }

        // Add to path skills
        const pathSkills = duplicate(this.item.system.pathSkills || []);
        pathSkills.push(skillEntry);

        await this.item.update({ "system.pathSkills": pathSkills });
        this.render(true);
        ui.notifications.info(`Added "${skillEntry.name}" to path skills`);
    }

    async _showPathSkillCreationDialog() {
        return new Promise((resolve) => {
            const dialog = new Dialog({
                title: "Add Path Skill Entry",
                content: `
            <form>
                <div class="form-group">
                    <label>Entry Type:</label>
                    <select id="entry-type" name="entryType">
                        <option value="specific-skill">Specific Core Skill</option>
                        <option value="custom-craft">Custom Craft Skill</option>
                        <option value="custom-lore">Lore Skill</option>
                        <option value="custom-perform">Perform Skill</option>
                        <option value="choose-category">Choose from Category</option>
                        <option value="choose-lore">Choose Lore Skills</option>
                        <option value="choose-perform">Choose Perform Skills</option>
                        <option value="choose-craft">Choose Custom Craft Skills</option>
                    </select>
                </div>
                
                <!-- Target Rank -->
                <div class="form-group">
                    <label>Target Rank:</label>
                    <select id="target-rank" name="targetRank">
                        <option value="learned" selected>Learned</option>
                        <option value="practiced">Practiced</option>
                        <option value="adept">Adept</option>
                        <option value="experienced">Experienced</option>
                        <option value="expert">Expert</option>
                        <option value="mastered">Mastered</option>
                    </select>
                </div>

                <!-- Category Selection (for choose-category) -->
                <div class="form-group" id="category-group" style="display: none;">
                    <label>Category:</label>
                    <select id="choose-category">
                        <option value="Combat">Combat</option>
                        <option value="Social">Social</option>
                        <option value="Physical">Physical</option>
                        <option value="Knowledge">Knowledge</option>
                        <option value="Craft">Craft</option>
                    </select>
                </div>

                <!-- Count Selection (for choose types) -->
                <div class="form-group" id="count-group" style="display: none;">
                    <label>Number to Choose:</label>
                    <select id="choose-count">
                        <option value="1" selected>1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>

                <!-- Custom Name (for custom skills) -->
                <div class="form-group" id="custom-name-group" style="display: none;">
                    <label id="custom-name-label">Custom Name:</label>
                    <input type="text" id="custom-name" placeholder="Enter name">
                </div>

                <!-- Specific Skill Selection -->
                <div class="form-group" id="specific-skill-group" style="display: none;">
                    <label>Core Skill:</label>
                    <select id="specific-skill">
                        ${this._generateCoreSkillOptions()}
                    </select>
                </div>
            </form>
            
            <script>
                // Handle form visibility based on entry type
                document.getElementById('entry-type').addEventListener('change', function() {
                    const entryType = this.value;
                    const categoryGroup = document.getElementById('category-group');
                    const countGroup = document.getElementById('count-group');
                    const customNameGroup = document.getElementById('custom-name-group');
                    const specificSkillGroup = document.getElementById('specific-skill-group');
                    const customNameLabel = document.getElementById('custom-name-label');
                    
                    // Hide all groups first
                    categoryGroup.style.display = 'none';
                    countGroup.style.display = 'none';
                    customNameGroup.style.display = 'none';
                    specificSkillGroup.style.display = 'none';
                    
                    // Show relevant groups based on type
                    if (entryType === 'choose-category') {
                        categoryGroup.style.display = 'block';
                        countGroup.style.display = 'block';
                    } else if (entryType.startsWith('choose-')) {
                        countGroup.style.display = 'block';
                    } else if (entryType.startsWith('custom-')) {
                        customNameGroup.style.display = 'block';
                        if (entryType === 'custom-craft') {
                            customNameLabel.textContent = 'Craft Type:';
                        } else if (entryType === 'custom-lore') {
                            customNameLabel.textContent = 'Lore Subject:';
                        } else if (entryType === 'custom-perform') {
                            customNameLabel.textContent = 'Performance Type:';
                        }
                    } else if (entryType === 'specific-skill') {
                        specificSkillGroup.style.display = 'block';
                    }
                });
            </script>
            `,
                buttons: {
                    add: {
                        icon: '<i class="fas fa-plus"></i>',
                        label: "Add Entry",
                        callback: async html => {
                            await this._processPathSkillEntry(html);
                            resolve(true);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(false)
                    }
                },
                default: "add",
                close: () => resolve(false)
            });
            dialog.render(true);
        });
    }

    /**
    * Handle ability deletion (both path and species abilities)
    * @param {Event} event - Delete event
    */
    async _onAbilityDelete(event) {
        event.preventDefault();

        const abilityItem = event.currentTarget.closest(".ability-item");
        if (!abilityItem) return;

        const abilityId = abilityItem.dataset.abilityId;
        if (!abilityId) return;

        // Determine whether we're dealing with path or species
        let updateData = {};

        if (this.item.type === 'path') {
            const abilities = duplicate(this.item.system.abilities || {});
            if (abilities[abilityId]) {
                delete abilities[abilityId];
                updateData = {
                    "system.abilities": abilities
                };
            }
        }
        else if (this.item.type === 'species') {
            const abilities = duplicate(this.item.system.speciesAbilities || {});
            if (abilities[abilityId]) {
                delete abilities[abilityId];
                updateData = {
                    "system.speciesAbilities": abilities
                };
            }
        }

        // Only update if we found something to delete
        if (Object.keys(updateData).length > 0) {
            await this.item.update(updateData);
            this.render(true);
        }
    }

    /**
    * Handle dropping data on the item sheet
    * @param {Event} event - Drop event
    */
    async _onDrop(event) {
        event.preventDefault();

        // Get dropped data
        let dragData;
        try {
            // Use originalEvent as a fallback if available
            const dataTransfer = event.dataTransfer || (event.originalEvent && event.originalEvent.dataTransfer);

            if (!dataTransfer) {
                console.error("No dataTransfer found in the event");
                return false;
            }

            const data = dataTransfer.getData('text/plain');
            if (!data) {
                console.error("No data found in dataTransfer");
                return false;
            }

            dragData = JSON.parse(data);
        } catch (err) {
            console.error("Error parsing drop data:", err);
            return false;
        }

        // Only process if this is a path sheet
        if (this.item.type !== 'path') {
            return super._onDrop(event);
        }

        // Handle dropping a skill
        if (dragData.type === "Item") {
            let skillDoc;

            // Try to load the item from various sources
            try {
                // From UUID
                if (dragData.uuid) {
                    skillDoc = await fromUuid(dragData.uuid);
                }
                // From compendium
                else if (dragData.pack && dragData.id) {
                    const pack = game.packs.get(dragData.pack);
                    if (pack) {
                        skillDoc = await pack.getDocument(dragData.id);
                    }
                }
                // Directly from data
                else if (dragData.data) {
                    skillDoc = dragData.data;
                }
            } catch (err) {
                console.error("Error loading item:", err);
                return false;
            }

            // Check if we got a skill
            if (!skillDoc) {
                return false;
            }

            // Check if it's a skill type
            const isSkill = skillDoc.type === "skill" ||
                (skillDoc.data && skillDoc.data.type === "skill") ||
                (skillDoc.system && skillDoc.system.rank);

            if (!isSkill) {
                ui.notifications.warn("Only skills can be added to paths.");
                return false;
            }

            // Get skill data
            let skillData;
            if (skillDoc.toObject) {
                skillData = skillDoc.toObject();
            } else {
                skillData = duplicate(skillDoc);
            }

            // Initialize path skills array if needed
            let pathSkills = duplicate(this.item.system.pathSkills || []);
            if (!Array.isArray(pathSkills)) {
                pathSkills = [];
            }

            // Check for duplicate
            const isDuplicate = pathSkills.some(s => s.name === skillData.name);
            if (isDuplicate) {
                ui.notifications.warn(`${skillData.name} is already added to this path.`);
                return false;
            }

            // Add unique ID if needed
            if (!skillData._id) {
                skillData._id = randomID(16);
            }

            // Add to path skills and update
            pathSkills.push(skillData);
            await this.item.update({
                "system.pathSkills": pathSkills
            });

            // Show success and refresh
            ui.notifications.info(`Added ${skillData.name} to ${this.item.name}`);
            this.render(true);
            return true;
        }

        // Pass to parent for other drop types
        return super._onDrop(event);
    }


}

// ====================================================================
// 4. UTILITY FUNCTIONS
// ====================================================================

/**
* Convert skill rank to numeric value for comparison
* @param {string} rank - The skill rank
* @returns {number} Numeric value of the rank
*/
function getRankValue(rank) {
    switch (rank) {
        case "untrained": return 0;
        case "learned": return 1;
        case "practiced": return 2;
        case "adept": return 3;
        case "experienced": return 4;
        case "expert": return 5;
        case "mastered": return 6;
        default: return 0;
    }
}

/**
* Apply spell filtering based on stored filter criteria
* @param {HTMLElement} html - HTML element containing filters
* @param {Object} filters - Filter criteria object
*/
function applySpellFilters(html, filters) {
    // Apply school filter
    if (filters.school && filters.school !== 'all') {
        html.find('.spell-wrapper').hide();
        html.find(`.spell-wrapper .spell-item[data-school="${filters.school}"]`).parents('.spell-wrapper').show();
        html.find('.spell-school-filter').val(filters.school);
    }

    // Apply search filter
    if (filters.search && filters.search !== '') {
        const searchTerm = filters.search.toLowerCase();
        html.find('.spell-search').val(filters.search);

        html.find('.spell-wrapper').each(function () {
            if (!$(this).is(':visible')) return;

            const spellName = $(this).find('.spell-name').text().toLowerCase();
            const spellDesc = $(this).find('.spell-description-content').text().toLowerCase();

            if (spellName.includes(searchTerm) || spellDesc.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }
}

/**
* Open compendium browser for item selection
* @param {string} itemType - Type of item to browse
* @param {Actor} actor - Actor to add items to
* @param {string} compendiumName - Specific compendium name (optional)
*/
function openCompendiumBrowser(itemType, actor, compendiumName = null) {
    // Determine which compendium to use based on item type if not specified
    if (!compendiumName) {
        switch (itemType) {
            case "skill": compendiumName = "skills"; break;
            case "path": compendiumName = "paths"; break;
            case "species": compendiumName = "species"; break;
            case "weapon": compendiumName = "weapons"; break;
            case "spell": compendiumName = "spells"; break;
            case "talent": compendiumName = "talents"; break;
            case "trait": compendiumName = "talents"; break;
            case "precept": compendiumName = "talents"; break;
            case "armor": compendiumName = "armor"; break;
            case "magicitem": compendiumName = "magic-item"; break;
            case "potion": compendiumName = "magic-item"; break;
            case "medical": compendiumName = "mundane-item"; break;
            case "travel": compendiumName = "mundane-item"; break;
            case "biological": compendiumName = "mundane-item"; break;
            case "musical": compendiumName = "mundane-item"; break;
            case "drug": compendiumName = "mundane-item"; break;
            case "poison": compendiumName = "mundane-item"; break;
            case "clothing": compendiumName = "mundane-item"; break;
            case "communication": compendiumName = "mundane-item"; break;
            case "containment": compendiumName = "mundane-item"; break;
            case "dream": compendiumName = "mundane-item"; break;
            case "staff": compendiumName = "magic-item"; break;
            case "wand": compendiumName = "magic-item"; break;
            case "gate": compendiumName = "magic-item"; break;
            case "mount": compendiumName = "mundane-item"; break;
            case "vehicle": compendiumName = "mundane-item"; break;
            case "fleshcraft": compendiumName = "mundane-item"; break;
            default: compendiumName = itemType + "s"; // Fallback to pluralized name
        }
    }

    // Find the appropriate compendium pack
    const packs = game.packs.filter(p => p.metadata.name === compendiumName);
    const pack = packs.length > 0 ? packs[0] : null;

    if (!pack) {
        ui.notifications.warn(`${compendiumName} compendium not found. Ensure you have a compendium named '${compendiumName}'.`);
        return;
    }

    // Open the compendium
    pack.render(true);

    // Set up a one-time context menu for adding items from the compendium
    Hooks.once("renderCompendium", (app, html) => {
        if (app.collection.metadata.name === compendiumName) {
            // Create a new context menu
            const contextMenu = new ContextMenu(html, ".directory-item", [
                {
                    name: `Add to ${actor ? "Character" : "Sheet"}`,
                    icon: '<i class="fas fa-plus"></i>',
                    callback: async (li) => {
                        try {
                            const entryId = li.data("document-id");
                            const item = await pack.getDocument(entryId);

                            if (item) {
                                if (actor) {
                                    const exists = actor.items.some(i => i.name === item.name && i.type === item.type);

                                    if (!exists) {
                                        // Convert old item types to new types
                                        let itemData = item.toObject();
                                        itemData = convertLegacyItemType(itemData, itemType);

                                        await actor.createEmbeddedDocuments("Item", [itemData]);
                                        ui.notifications.info(`Added ${item.name} to ${actor.name}.`);
                                    } else {
                                        ui.notifications.warn(`${item.name} is already added to this character.`);
                                    }
                                } else {
                                    ui.notifications.info(`Selected ${item.name} from compendium.`);
                                    const event = new CustomEvent("compendiumSelection", {
                                        detail: { item: item }
                                    });
                                    document.dispatchEvent(event);
                                }
                            }
                        } catch (err) {
                            console.error(`Error adding ${itemType} from compendium:`, err);
                            ui.notifications.error(`Could not add ${itemType} from compendium.`);
                        }
                    }
                }
            ]);
        }
    });

    function convertLegacyItemType(itemData, expectedType) {
        // If the item is already the correct type, return as-is
        if (itemData.type === expectedType) {
            return itemData;
        }

        // If it's an old "item" type, convert based on itemCategory or expected type
        if (itemData.type === "item") {
            const itemCategory = itemData.system?.itemCategory;

            // Convert based on itemCategory first
            if (itemCategory === "magicitem") {
                itemData.type = "magicitem";
            } else if (itemCategory === "potion") {
                itemData.type = "potion";
            } else if (itemCategory === "drug") {
                itemData.type = "drug";
            } else if (itemCategory === "poison") {
                itemData.type = "poison";
            } else if (itemCategory === "biological") {
                itemData.type = "biological";
            } else if (itemCategory === "medical") {
                itemData.type = "medical";
            } else if (itemCategory === "travel") {
                itemData.type = "travel";
            } else if (itemCategory === "musical") {
                itemData.type = "musical";
            } else if (itemCategory === "clothing") {
                itemData.type = "clothing";
            } else if (itemCategory === "communication") {
                itemData.type = "communication";
            } else if (itemCategory === "containment") {
                itemData.type = "containment";
            } else if (itemCategory === "dream") {
                itemData.type = "dream";
            } else if (itemCategory === "staff") {
                itemData.type = "staff";
            } else if (itemCategory === "wand") {
                itemData.type = "wand";
            } else if (itemCategory === "gate") {
                itemData.type = "gate";
            } else if (itemCategory === "mount") {
                itemData.type = "mount";
            } else if (itemCategory === "vehicle") {
                itemData.type = "vehicle";
            } else if (itemCategory === "fleshcraft") {
                itemData.type = "fleshcraft";
            } else {
                // No specific category, use the expected type
                itemData.type = expectedType;
            }

            // Remove the old itemCategory since we're now using specific types
            if (itemData.system && itemData.system.itemCategory) {
                delete itemData.system.itemCategory;
            }
        }

        return itemData;
    }
}

/**
 * Register all item sheet types for the system
 */
function registerItemSheets() {
    Items.registerSheet("thefade", TheFadeItemSheet, {
        types: [
            "weapon", "armor", "skill", "path", "spell", "talent", "trait", "precept",
            "species", "drug", "poison", "biological", "medical", "travel",
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

// --------------------------------------------------------------------
// CHARACTER INITIALIZATION FUNCTIONS
// --------------------------------------------------------------------

/**
* Initialize default skills for a new character
* Call this when creating a new character or when migrating existing characters
*/
async function initializeDefaultSkills(actor) {
    if (actor.type !== 'character') return;

    const skillsToCreate = [];

    for (const skill of DEFAULT_SKILLS) {
        // Check if character already has this skill
        const existingSkill = actor.items.find(i =>
            i.type === 'skill' && i.name === skill.name
        );

        if (!existingSkill) {
            skillsToCreate.push({
                name: skill.name,
                type: "skill",
                system: {
                    rank: skill.rank,
                    category: skill.category,
                    attribute: skill.attribute,
                    description: "",
                    miscBonus: 0,
                    isCore: true // Flag to mark as core skill
                }
            });
        }
    }

    if (skillsToCreate.length > 0) {
        await actor.createEmbeddedDocuments("Item", skillsToCreate);
        ui.notifications.info(`Added ${skillsToCreate.length} missing default skills to ${actor.name}.`);
    }
}

/**
 * Create a custom skill (Custom Craft, Lore, or Perform)
 */
async function createCustomSkill(actor, skillType, subtype, rank = "untrained") {
    if (!subtype || subtype.trim() === "") {
        ui.notifications.error("Subtype is required for custom skills.");
        return null;
    }

    let skillName, category, attribute;

    switch (skillType.toLowerCase()) {
        case "craft":
            skillName = subtype.trim(); // Custom crafts are just the name (e.g., "Soapmaking")
            category = "Craft";
            attribute = "mind"; // Default to mind, but can be changed
            break;

        case "lore":
            skillName = `Lore (${subtype.trim()})`;
            category = "Knowledge";
            attribute = "mind";
            break;

        case "perform":
            skillName = `Perform (${subtype.trim()})`;
            category = "Physical";
            attribute = "finesse_presence"; // Combined attribute
            break;

        default:
            ui.notifications.error("Invalid custom skill type. Must be Craft, Lore, or Perform.");
            return null;
    }

    // Check if skill already exists
    const existingSkill = actor.items.find(i =>
        i.type === 'skill' && i.name === skillName
    );

    if (existingSkill) {
        ui.notifications.warn(`${skillName} already exists.`);
        return existingSkill;
    }

    const skillData = {
        name: skillName,
        type: "skill",
        system: {
            rank: rank,
            category: category,
            attribute: attribute,
            description: "",
            miscBonus: 0,
            isCore: false, // Mark as custom skill
            skillType: skillType.toLowerCase(),
            subtype: subtype.trim()
        }
    };

    const createdSkills = await actor.createEmbeddedDocuments("Item", [skillData]);
    ui.notifications.info(`Created custom skill: ${skillName}`);
    return createdSkills[0];
}

/**
 * Show dialog to create custom skill
 */
async function showCustomSkillDialog(actor) {
    return new Promise((resolve) => {
        const dialog = new Dialog({
            title: "Create Custom Skill",
            content: `
                <form>
                    <div class="form-group">
                        <label>Skill Type:</label>
                        <select id="skill-type" name="skillType">
                            <option value="craft">Custom Craft</option>
                            <option value="lore">Lore</option>
                            <option value="perform">Perform</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label id="subtype-label">Skill Name:</label>
                        <input type="text" id="skill-subtype" name="subtype" placeholder="e.g., Soapmaking" />
                        <p class="hint" id="skill-hint">Enter the name of your custom craft skill</p>
                    </div>
                    <div class="form-group">
                        <label>Starting Rank:</label>
                        <select id="skill-rank" name="rank">
                            <option value="untrained">Untrained</option>
                            <option value="learned" selected>Learned</option>
                            <option value="practiced">Practiced</option>
                            <option value="adept">Adept</option>
                            <option value="experienced">Experienced</option>
                            <option value="expert">Expert</option>
                            <option value="mastered">Mastered</option>
                        </select>
                    </div>
                </form>
                <script>
                    document.getElementById('skill-type').addEventListener('change', function() {
                        const type = this.value;
                        const label = document.getElementById('subtype-label');
                        const input = document.getElementById('skill-subtype');
                        const hint = document.getElementById('skill-hint');
                        
                        if (type === 'craft') {
                            label.textContent = 'Skill Name:';
                            input.placeholder = 'e.g., Soapmaking, Sculpting, Masonry';
                            hint.textContent = 'Enter the name of your custom craft skill';
                        } else if (type === 'lore') {
                            label.textContent = 'Lore Subject:';
                            input.placeholder = 'e.g., Anthropology, History, Geography';
                            hint.textContent = 'Enter the subject area for this Lore skill';
                        } else if (type === 'perform') {
                            label.textContent = 'Performance Type:';
                            input.placeholder = 'e.g., Singing, Dancing, Comedy';
                            hint.textContent = 'Enter the type of performance for this skill';
                        }
                    });
                </script>
            `,
            buttons: {
                create: {
                    icon: '<i class="fas fa-plus"></i>',
                    label: "Create Skill",
                    callback: async html => {
                        const skillType = html.find('#skill-type').val();
                        const subtype = html.find('#skill-subtype').val();
                        const rank = html.find('#skill-rank').val();

                        const skill = await createCustomSkill(actor, skillType, subtype, rank);
                        resolve(skill);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => resolve(null)
                }
            },
            default: "create",
            close: () => resolve(null)
        });
        dialog.render(true);
    });
}

// --------------------------------------------------------------------
// PATH SKILL MODIFICATION SYSTEM
// --------------------------------------------------------------------

/**
* Apply skill modifications from a path to a character
* Instead of adding skills, this modifies existing skill ranks
*/
async function applyPathSkillModifications(actor, path) {
    if (!path.system.pathSkills || path.system.pathSkills.length === 0) {
        return;
    }

    let skillsModified = 0;
    let customSkillsCreated = 0;
    let choicesMade = 0;

    for (const pathSkill of path.system.pathSkills) {
        const entryType = pathSkill.system.entryType;

        switch (entryType) {
            case PATH_SKILL_TYPES.SPECIFIC_SKILL:
                // Improve existing core skill
                const coreSkill = actor.items.find(i =>
                    i.type === 'skill' && i.name === pathSkill.name
                );

                if (coreSkill) {
                    const currentRankValue = getRankValue(coreSkill.system.rank);
                    const pathRankValue = getRankValue(pathSkill.system.rank);

                    if (pathRankValue > currentRankValue) {
                        await coreSkill.update({
                            "system.rank": pathSkill.system.rank
                        });
                        skillsModified++;
                    }
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
                    path  // Add this parameter
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

/**
* Improve a character's skill to the specified rank
* @param {Actor} actor - The character actor
* @param {Object} skillData - The skill data from DEFAULT_SKILLS
* @param {string} targetRank - The rank to improve to
*/
async function improveCharacterSkill(actor, skillData, targetRank) {
    // Find existing skill on character
    const existingSkill = actor.items.find(i =>
        i.type === 'skill' && i.name === skillData.name
    );

    if (existingSkill) {
        // Update existing skill if target rank is higher
        const currentRankValue = getRankValue(existingSkill.system.rank);
        const targetRankValue = getRankValue(targetRank);

        if (targetRankValue > currentRankValue) {
            await existingSkill.update({ "system.rank": targetRank });
        }
    } else {
        // Create new skill
        const newSkill = {
            name: skillData.name,
            type: "skill",
            system: {
                rank: targetRank,
                category: skillData.category,
                attribute: skillData.attribute
            }
        };

        await actor.createEmbeddedDocuments("Item", [newSkill]);
    }
}

/**
* Handle "Choose X skills" options from paths
*/
async function handleChooseSkillsOption(actor, pathSkill) {
    // Parse the instruction (e.g., "Choose 2 Combat Skills", "Choose 3 Lore Skills")
    const instruction = pathSkill.name;
    const match = instruction.match(/choose (\d+) (.+?) skills?/i);

    if (!match) {
        ui.notifications.warn(`Could not parse skill choice instruction: ${instruction}`);
        return;
    }

    const numToChoose = parseInt(match[1]);
    const skillCategory = match[2].toLowerCase();

    if (skillCategory.includes("lore")) {
        // Special handling for Lore skills
        await showChooseLoreSkillsDialog(actor, numToChoose, pathSkill.system.rank);
    } else if (skillCategory.includes("perform")) {
        // Special handling for Perform skills
        await showChoosePerformSkillsDialog(actor, numToChoose, pathSkill.system.rank);
    } else if (skillCategory.includes("craft")) {
        // Special handling for Craft skills
        await showChooseCraftSkillsDialog(actor, numToChoose, pathSkill.system.rank);
    } else {
        // Regular skill category choice
        await showChooseRegularSkillsDialog(actor, numToChoose, skillCategory, pathSkill.system.rank);
    }
}

/**
* Show dialog for choosing regular skills from a category
* Now excludes skills already in the path at Learned or higher
*/
async function showChooseRegularSkillsDialog(actor, numToChoose, category, rank, path = null) {
    const categorySkills = DEFAULT_SKILLS.filter(skill =>
        skill.category.toLowerCase() === category.toLowerCase()
    );

    if (categorySkills.length === 0) {
        ui.notifications.warn(`No skills found for category: ${category}`);
        return;
    }

    // Filter out skills already in the path at Learned or higher
    let availableSkills = categorySkills;

    if (path && path.system.pathSkills) {
        const pathSkillNames = path.system.pathSkills
            .filter(pathSkill => {
                // Check if this is a specific skill (not a choice entry)
                const entryType = pathSkill.system.entryType;
                return entryType === PATH_SKILL_TYPES.SPECIFIC_SKILL ||
                    entryType === PATH_SKILL_TYPES.SPECIFIC_CUSTOM;
            })
            .filter(pathSkill => {
                // Check if it's at Learned or higher rank
                const rankValue = getRankValue(pathSkill.system.rank);
                const learnedValue = getRankValue("learned");
                return rankValue >= learnedValue;
            })
            .map(pathSkill => pathSkill.name.toLowerCase());

        // Filter out skills already in path
        availableSkills = categorySkills.filter(skill =>
            !pathSkillNames.includes(skill.name.toLowerCase())
        );
    }

    if (availableSkills.length === 0) {
        ui.notifications.warn(`No ${category} skills available - all skills in this category are already in the path at Learned or higher.`);
        return;
    }

    if (availableSkills.length < numToChoose) {
        ui.notifications.warn(`Only ${availableSkills.length} ${category} skills available, but ${numToChoose} requested. Showing available skills.`);
        numToChoose = availableSkills.length;
    }

    return new Promise((resolve) => {
        const skillOptions = availableSkills.map(skill =>
            `<label><input type="checkbox" value="${skill.name}"> ${skill.name}</label>`
        ).join('<br>');

        const dialog = new Dialog({
            title: `Choose ${numToChoose} ${category} Skills`,
            content: `
                <form>
                    <p>Select ${numToChoose} skills to improve to ${rank} rank:</p>
                    ${availableSkills.length < categorySkills.length ?
                    `<p><em>Note: Skills already in the path at Learned or higher are not shown.</em></p>` :
                    ''
                }
                    <div class="skill-choices">
                        ${skillOptions}
                    </div>
                </form>
            `,
            buttons: {
                apply: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Apply",
                    callback: async html => {
                        const selected = [];
                        html.find('input[type="checkbox"]:checked').each(function () {
                            selected.push(this.value);
                        });

                        if (selected.length !== numToChoose) {
                            ui.notifications.warn(`You must select exactly ${numToChoose} skills.`);
                            return;
                        }

                        // Apply the selected skills to the character
                        for (const skillName of selected) {
                            const skill = availableSkills.find(s => s.name === skillName);
                            if (skill) {
                                await improveCharacterSkill(actor, skill, rank);
                            }
                        }

                        ui.notifications.info(`Applied ${selected.length} ${category} skills at ${rank} rank.`);
                        resolve(true);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => resolve(false)
                }
            },
            default: "apply",
            close: () => resolve(false)
        });
        dialog.render(true);
    });
}

/**
* Show dialog for choosing Lore skills to create
*/
async function showChooseLoreSkillsDialog(actor, numToChoose, rank) {
    return new Promise((resolve) => {
        let loreForms = '';
        for (let i = 0; i < numToChoose; i++) {
            loreForms += `
                <div class="form-group">
                    <label>Lore Subject ${i + 1}:</label>
                    <input type="text" name="lore${i}" placeholder="e.g., Anthropology, History" />
                </div>
            `;
        }

        const dialog = new Dialog({
            title: `Choose ${numToChoose} Lore Skills`,
            content: `
                <form>
                    <p>Enter the subjects for ${numToChoose} Lore skills (rank: ${rank}):</p>
                    ${loreForms}
                </form>
            `,
            buttons: {
                create: {
                    icon: '<i class="fas fa-plus"></i>',
                    label: "Create Skills",
                    callback: async html => {
                        const loreSubjects = [];
                        for (let i = 0; i < numToChoose; i++) {
                            const subject = html.find(`input[name="lore${i}"]`).val().trim();
                            if (subject) {
                                loreSubjects.push(subject);
                            }
                        }

                        if (loreSubjects.length !== numToChoose) {
                            ui.notifications.warn(`You must enter ${numToChoose} lore subjects.`);
                            return false;
                        }

                        // Create the lore skills
                        for (const subject of loreSubjects) {
                            await createCustomSkill(actor, "lore", subject, rank);
                        }

                        resolve(true);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => resolve(false)
                }
            },
            default: "create"
        });
        dialog.render(true);
    });
}

/**
* Show dialog for choosing Perform skills to create
*/
async function showChoosePerformSkillsDialog(actor, numToChoose, rank) {
    return new Promise((resolve) => {
        let performForms = '';
        for (let i = 0; i < numToChoose; i++) {
            performForms += `
                <div class="form-group">
                    <label>Performance Type ${i + 1}:</label>
                    <input type="text" name="perform${i}" placeholder="e.g., Singing, Dancing" />
                </div>
            `;
        }

        const dialog = new Dialog({
            title: `Choose ${numToChoose} Perform Skills`,
            content: `
                <form>
                    <p>Enter the types for ${numToChoose} Perform skills (rank: ${rank}):</p>
                    ${performForms}
                </form>
            `,
            buttons: {
                create: {
                    icon: '<i class="fas fa-plus"></i>',
                    label: "Create Skills",
                    callback: async html => {
                        const performTypes = [];
                        for (let i = 0; i < numToChoose; i++) {
                            const type = html.find(`input[name="perform${i}"]`).val().trim();
                            if (type) {
                                performTypes.push(type);
                            }
                        }

                        if (performTypes.length !== numToChoose) {
                            ui.notifications.warn(`You must enter ${numToChoose} performance types.`);
                            return false;
                        }

                        // Create the perform skills
                        for (const type of performTypes) {
                            await createCustomSkill(actor, "perform", type, rank);
                        }

                        resolve(true);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => resolve(false)
                }
            },
            default: "create"
        });
        dialog.render(true);
    });
}

/**
* Show dialog for choosing Craft skills to create
*/
async function showChooseCraftSkillsDialog(actor, numToChoose, rank) {
    return new Promise((resolve) => {
        let craftForms = '';
        for (let i = 0; i < numToChoose; i++) {
            craftForms += `
                <div class="form-group">
                    <label>Craft Skill ${i + 1}:</label>
                    <input type="text" name="craft${i}" placeholder="e.g., Soapmaking, Sculpting" />
                </div>
            `;
        }

        const dialog = new Dialog({
            title: `Choose ${numToChoose} Craft Skills`,
            content: `
                <form>
                    <p>Enter the names for ${numToChoose} custom Craft skills (rank: ${rank}):</p>
                    ${craftForms}
                </form>
            `,
            buttons: {
                create: {
                    icon: '<i class="fas fa-plus"></i>',
                    label: "Create Skills",
                    callback: async html => {
                        const craftNames = [];
                        for (let i = 0; i < numToChoose; i++) {
                            const name = html.find(`input[name="craft${i}"]`).val().trim();
                            if (name) {
                                craftNames.push(name);
                            }
                        }

                        if (craftNames.length !== numToChoose) {
                            ui.notifications.warn(`You must enter ${numToChoose} craft skill names.`);
                            return false;
                        }

                        // Create the craft skills
                        for (const name of craftNames) {
                            await createCustomSkill(actor, "craft", name, rank);
                        }

                        resolve(true);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => resolve(false)
                }
            },
            default: "create"
        });
        dialog.render(true);
    });
}

// --------------------------------------------------------------------
// PATHS AND SKILLS CONFIGURATION
// --------------------------------------------------------------------