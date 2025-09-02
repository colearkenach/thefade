import { SIZE_OPTIONS, AURA_COLOR_OPTIONS, AURA_SHAPE_OPTIONS, FLEXIBLE_BONUS_OPTIONS, AURA_INTENSITY_OPTIONS, ADDICTION_LEVEL_OPTIONS, SKILL_RANK_OPTIONS, FALLBACK_ACTOR_DATA } from './constants.js';
import { createCustomSkill, initializeDefaultSkills, showCustomSkillDialog } from './skills.js';
import { openCompendiumBrowser } from './compendium.js';

export class TheFadeCharacterSheet extends ActorSheet {
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
            };
        }

        data.sizeOptions = SIZE_OPTIONS;
        data.flexibleBonusAttributeOptions = FLEXIBLE_BONUS_OPTIONS;
        data.auraColorOptions = AURA_COLOR_OPTIONS;
        data.auraShapeOptions = AURA_SHAPE_OPTIONS;
        data.auraIntensityOptions = AURA_INTENSITY_OPTIONS;
        data.addictionLevelOptions = ADDICTION_LEVEL_OPTIONS;
        data.skillRankOptions = SKILL_RANK_OPTIONS;

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