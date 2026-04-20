// TheFadeActor document class (extracted from thefade.js).
import { BODY_PARTS, FALLBACK_ACTOR_DATA } from './constants.js';
import { aggregateConditionState, computeRollModifiers, summarizeConditionState } from './conditions.js';
import { applyBaseDefenseStances, applyPassiveStances, summarizeStance, getDamageMitigation } from './stances.js';

/**
* Base Actor class for The Fade system
* Handles core actor data preparation and functionality
*/
export class TheFadeActor extends Actor {

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

        // Ensure status-effect conditions exist so the UI always has something to bind to.
        // Conditions with severity store { active, intensity }; binary ones store { active }.
        const SEVERITY_CONDITIONS = ["bleed", "dazed", "fatigue", "fear", "illness", "pain", "paralysis", "staggered", "stunned"];
        const BINARY_CONDITIONS = ["blindness", "confusion", "deafness", "flatFooted", "sleep"];
        if (!data.conditions || typeof data.conditions !== "object") {
            data.conditions = {};
        }
        for (const key of SEVERITY_CONDITIONS) {
            if (!data.conditions[key] || typeof data.conditions[key] !== "object") {
                data.conditions[key] = { active: false, intensity: "trivial" };
            }
            if (typeof data.conditions[key].active !== "boolean") data.conditions[key].active = false;
            if (!["trivial", "moderate", "severe"].includes(data.conditions[key].intensity)) {
                data.conditions[key].intensity = "trivial";
            }
        }
        for (const key of BINARY_CONDITIONS) {
            if (!data.conditions[key] || typeof data.conditions[key] !== "object") {
                data.conditions[key] = { active: false };
            }
            if (typeof data.conditions[key].active !== "boolean") data.conditions[key].active = false;
        }

        // Single active combat stance (Dodge / Parrying / Brace / Tough / Resolute / none).
        const VALID_STANCES = ["none", "dodgeStance", "parryingStance", "brace", "toughItOut", "resoluteWill"];
        if (!VALID_STANCES.includes(data.activeStance)) {
            data.activeStance = "none";
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

            // Apply active-condition modifiers (defenses, speed, action economy)
            this._applyConditionState(data);

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

        // Derive an HP state label for the UI.
        // Rulebook: unconscious at 0; die at -2 * maxHP. "Dying" is the negative band in between.
        const hp = data.hp.value;
        const max = Math.max(1, data.hp.max);
        let state, label;
        if (hp >= max)          { state = "healthy";     label = "Healthy"; }
        else if (hp > max / 2)  { state = "bloodied";    label = "Bloodied"; }
        else if (hp > 0)        { state = "wounded";     label = "Wounded"; }
        else if (hp === 0)      { state = "unconscious"; label = "Unconscious"; }
        else if (hp > -max * 2) { state = "dying";       label = "Dying"; }
        else                    { state = "dead";        label = "Dead"; }
        data.hp.state = state;
        data.hp.stateLabel = label;
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

        // Stance-level defense overrides (Tough it Out / Resolute Will replace
        // the half-attribute formula with full-attribute for Resilience/Grit).
        applyBaseDefenseStances(data);

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
        // Stash Acrobatics rank dice so stance code can add them to Avoid in Dodge Stance.
        data.defenses.acrobaticsDodgeDice = acrobonaticsDodge;

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

        // Apply stance effects that depend on facing-corrected passive values
        // (Dodge Stance bonus to Avoid; Parrying Stance restores Parry on Back Flank).
        applyPassiveStances(data, data.defenses.acrobaticsDodgeDice || 0);

        // Re-clamp in case a stance pushed totalAvoid back up from 0.
        data.totalAvoid = Math.max(0, data.totalAvoid);

        // Stance summary string for the sheet.
        data.stanceSummary = summarizeStance(data);

        // Expose damage-mitigation flags for attack resolution (Brace for Impact).
        data.damageMitigation = getDamageMitigation(data.activeStance);
    }

    /**
     * Apply passive state deltas from active conditions: defenses, speed,
     * action economy flags, and prone/helpless/immobile states. Must run
     * after facing so the facing avoid penalty is already baked in.
     */
    _applyConditionState(data) {
        const state = aggregateConditionState(data.conditions);
        data.conditionState = state;
        data.conditionSummary = summarizeConditionState(state);

        if (state.avoidDelta) {
            data.totalAvoid = Math.max(0, (data.totalAvoid || 0) + state.avoidDelta);
        }
        if (state.gritDelta) {
            data.totalGrit = Math.max(0, (data.totalGrit || 0) + state.gritDelta);
        }
        if (state.resilienceDelta) {
            data.totalResilience = Math.max(0, (data.totalResilience || 0) + state.resilienceDelta);
        }

        // Compute effective movement from the base movement values, leaving
        // data.movement as the canonical un-penalized source of truth.
        const mult = state.immobile ? 0 : state.speedMultiplier;
        data.effectiveMovement = {
            land: Math.floor((data.movement?.land || 0) * mult),
            fly: Math.floor((data.movement?.fly || 0) * mult),
            swim: Math.floor((data.movement?.swim || 0) * mult),
            climb: Math.floor((data.movement?.climb || 0) * mult),
            burrow: Math.floor((data.movement?.burrow || 0) * mult)
        };
    }

    /**
     * Compute per-roll dice modifiers from the actor's active conditions.
     * Roll handlers call this after assembling the base pool and before
     * constructing the Roll formula. Returns { bonusDice, penaltyDice,
     * notes[], autoFail }.
     */
    getConditionRollModifiers(context) {
        return computeRollModifiers(this.system?.conditions, context || { kind: "generic" });
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
