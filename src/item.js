import { DEFAULT_WEAPON, DEFAULT_ARMOR, DEFAULT_SKILL } from './constants.js';

export class TheFadeItem extends Item {
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
