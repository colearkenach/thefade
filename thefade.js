/**
 * The Fade (Abyss) Character Sheet for Foundry VTT
 * This module defines a character sheet for The Fade (Abyss) TTRPG system.
 */

// Character Sheet Class
class TheFadeCharacterSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "actor"],
            template: "systems/thefade/templates/actor/character-sheet.html",
            width: 800,
            height: 950,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
        });
    }

    getData() {
        const data = super.getData();

        data.system = data.actor.system;

        data.dtypes = ["String", "Number", "Boolean"];

        // Add size options to template data
        data.sizeOptions = {
            "miniscule": "Miniscule",
            "diminutive": "Diminutive",
            "tiny": "Tiny",
            "small": "Small",
            "medium": "Medium",
            "large": "Large",
            "massive": "Massive",
            "immense": "Immense",
            "enormous": "Enormous",
            "titanic": "Titanic"
        };

        // Prepare items
        if (data.actor.type == 'character') {
            this._prepareCharacterItems(data);
            this._prepareCharacterData(data);
        }

        // Ensure magic items data is available to template
        data.actor.magicItems = data.actor.system.magicItems || {};
        data.actor.unequippedMagicItems = data.actor.system.unequippedMagicItems || [];
        data.actor.currentAttunements = data.actor.system.currentAttunements || 0;
        data.actor.maxAttunements = data.actor.system.maxAttunements || 0;

        return data;
    }

    /**
     * Organize and classify Items for Character sheets.
     *
     * @param {Object} actorData The actor to prepare.
     *
     * @return {undefined}
     */
    _prepareCharacterItems(sheetData) {
        const actorData = sheetData.actor;

        // Initialize containers
        const gear = [];
        const weapons = [];
        const armor = [];
        const paths = [];
        const spells = [];
        const skills = [];
        const talents = [];
        const itemsOfPower = [];
        const potions = [];
        const drugs = [];

        // Iterate through items, allocating to containers
        for (let i of sheetData.items) {
            i.img = i.img || DEFAULT_TOKEN;

            if (i.type === 'item') {
                // Sort by item category
                if (i.system.itemCategory === 'magicitem') {
                    itemsOfPower.push(i);
                } else if (i.system.itemCategory === 'potion') {
                    potions.push(i);
                } else if (i.system.itemCategory === 'drug') {
                    drugs.push(i);
                } else {
                    gear.push(i);
                }
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
        }

        // Sort skills by category and name
        skills.sort((a, b) => {
            if (a.system.category !== b.system.category) {
                return a.system.category.localeCompare(b.system.category);
            }
            return a.name.localeCompare(b.name);
        });

        // Process Items of Power
        const equippedItemsOfPower = {};
        const unequippedItemsOfPower = [];

        for (let item of itemsOfPower) {
            if (item.system.equipped && item.system.slot) {
                equippedItemsOfPower[item.system.slot] = item;
            } else {
                unequippedItemsOfPower.push(item);
            }
        }

        // Process Armor
        const equippedArmor = {};
        const unequippedArmor = [];

        for (let item of armor) {
            if (item.system.equipped && item.system.location) {
                equippedArmor[item.system.location] = item;
            } else {
                unequippedArmor.push(item);
            }
        }

        // Calculate attunements for Items of Power
        const currentAttunements = itemsOfPower.filter(item => item.system.attunement === true).length;
        const totalLevel = actorData.system.level || 1;
        const soulAttribute = actorData.system.attributes?.soul?.value || 1;
        const maxAttunements = Math.max(0, Math.floor(totalLevel / 4) + soulAttribute);


        // Calculate dice pools for skills
        skills.forEach(skill => {
            const attributeName = skill.system.attribute;
            let attrValue = 0;

            if (attributeName.includes('_')) {
                const attributes = attributeName.split('_');
                const attr1 = this.actor.system.attributes[attributes[0]]?.value || 0;
                const attr2 = this.actor.system.attributes[attributes[1]]?.value || 0;
                attrValue = Math.floor((attr1 + attr2) / 2);
            } else {
                attrValue = this.actor.system.attributes[attributeName]?.value || 0;
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
        });

        // Calculate dice pools for weapons
        weapons.forEach(weapon => {
            const skillName = weapon.system.skill;
            const skill = skills.find(s => s.name === skillName);

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

            if (skill) {
                weapon.calculatedDice = skill.calculatedDice + (weapon.system.miscBonus || 0);
            } else {
                // Untrained
                const attributeName = weapon.system.attribute || "physique";
                if (attributeName !== "none") {
                    let attrValue = this.actor.system.attributes[attributeName]?.value || 0;
                    let dicePool = Math.floor(attrValue / 2);
                    dicePool += (weapon.system.miscBonus || 0);
                    weapon.calculatedDice = Math.max(1, dicePool);
                } else {
                    weapon.calculatedDice = Math.max(1, weapon.system.miscBonus || 0);
                }
            }
        });

        // Assign and return
        actorData.gear = gear;
        actorData.weapons = weapons;
        actorData.armor = armor;
        actorData.paths = paths;
        actorData.spells = spells;
        actorData.skills = skills;
        actorData.talents = talents;
        actorData.itemsOfPower = itemsOfPower;
        actorData.equippedItemsOfPower = equippedItemsOfPower;
        actorData.unequippedItemsOfPower = unequippedItemsOfPower;
        actorData.equippedArmor = equippedArmor;
        actorData.unequippedArmor = unequippedArmor;
        actorData.potions = potions;
        actorData.drugs = drugs;
        actorData.currentAttunements = currentAttunements;
        actorData.maxAttunements = maxAttunements;
    }

    _activateInventoryListeners(html) {
        // Collapsible sections
        html.find('.collapsible-header').click(event => {
            event.preventDefault();
            const header = $(event.currentTarget);
            const targetId = header.data('target');
            const content = html.find(`#${targetId}`);
            const icon = header.find('i');

            if (content.hasClass('collapsed')) {
                content.removeClass('collapsed');
                content.css('max-height', content[0].scrollHeight + 'px');
                header.removeClass('collapsed');
            } else {
                content.addClass('collapsed');
                content.css('max-height', '0');
                header.addClass('collapsed');
            }
        });

        // Initialize collapsed state - expand by default
        html.find('.collapsible-content').each(function () {
            $(this).css('max-height', this.scrollHeight + 'px');
        });

        // Equip/Unequip Items of Power and Armor
        html.find('.item-equip').click(async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).closest('.item').data('item-id');
            const item = this.actor.items.get(itemId);

            if (item) {
                await item.update({ 'system.equipped': true });
                this.render(false);
            }
        });

        html.find('.item-unequip').click(async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).closest('.equipped-item').data('item-id');
            const item = this.actor.items.get(itemId);

            if (item) {
                await item.update({ 'system.equipped': false });
                this.render(false);
            }
        });

        // Attunement checkbox
        html.find('.attunement-checkbox').change(async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).data('item-id');
            const item = this.actor.items.get(itemId);
            const isAttuned = event.currentTarget.checked;

            if (item) {
                // Check attunement limits
                if (isAttuned) {
                    const currentAttunements = this.actor.items.filter(i =>
                        i.system.itemCategory === 'magicitem' && i.system.attunement === true
                    ).length;
                    const totalLevel = this.actor.system.level || 1;
                    const soulAttribute = this.actor.system.attributes?.soul?.value || 1;
                    const maxAttunements = Math.max(0, Math.floor(totalLevel / 4) + soulAttribute);

                    if (currentAttunements >= maxAttunements) {
                        ui.notifications.warn(`Cannot attune to more items. Limit: ${maxAttunements}`);
                        event.currentTarget.checked = false;
                        return;
                    }
                }

                await item.update({ 'system.attunement': isAttuned });
                ui.notifications.info(`${item.name} ${isAttuned ? 'attuned' : 'no longer attuned'}.`);
            }
        });
    }

    /**
     * Calculate derived stats for the character
     */
    _prepareCharacterData(sheetData) {
        const data = sheetData.actor.system;
        // console.log("Preparing character data with facing:", data.defenses.facing);

        // First calculate base defenses and stats without facing modifiers
        this._calculateBaseDefenses(data, sheetData.actor);

        // Then apply facing modifiers
        this._applyFacingModifiers(data);

        // Calculate carrying capacity
        this._calculateCarryingCapacity(data);
    }

    /**
     * Calculate base defenses without facing modifiers
     */
    _calculateBaseDefenses(data, actor) {
        // Handle attributes
        Object.keys(data.attributes).forEach(attr => {
            if (data.attributes[attr].flexibleBonus) {
                // Store the flexible bonus for display
                data.attributes[attr].flexibleBonusDisplay = `+${data.attributes[attr].flexibleBonus}`;
            }
        });

        if (data.species?.flexibleBonus?.value > 0) {
            const selectedAttr = data.species.flexibleBonus.selectedAttribute;
            if (selectedAttr && data.attributes[selectedAttr]) {
                data.attributes[selectedAttr].flexibleBonus = data.species.flexibleBonus.value;
            }
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
        data.totalResilience = data.defenses.resilience + Number(data.defenses.resilienceBonus || 0);
        data.totalAvoid = data.defenses.avoid + Number(data.defenses.avoidBonus || 0);
        data.totalGrit = data.defenses.grit + Number(data.defenses.gritBonus || 0);

        // Calculate Passive Dodge based on Acrobatics skill and Finesse
        let acrobonaticsDodge = 0;
        let finesseDodge = Math.floor(data.attributes.finesse.value / 4); // 1/4 of finesse

        // Find Acrobatics skill
        const acrobaticsSkill = actor.items.find(i =>
            i.type === 'skill' && i.name.toLowerCase() === 'acrobatics');

        if (acrobaticsSkill) {
            // Calculate dodge bonus based on skill rank
            const rank = acrobaticsSkill.system.rank;
            if (rank === 'adept') acrobonaticsDodge = 1;
            else if (rank === 'experienced') acrobonaticsDodge = 1;
            else if (rank === 'expert') acrobonaticsDodge = 2;
            else if (rank === 'mastered') acrobonaticsDodge = 3;
        }

        // Use the higher of Acrobatics or Finesse dodge
        data.defenses.basePassiveDodge = Math.max(acrobonaticsDodge, finesseDodge);
        data.defenses.passiveDodge = data.defenses.basePassiveDodge;

        // Calculate Passive Parry based on highest weapon skill
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

        data.defenses.basePassiveParry = highestParry;
        data.defenses.passiveParry = data.defenses.basePassiveParry;

        // Calculate max HP based on Species, Path, Physique, and misc bonus
        let baseHP = data.species.baseHP || 0;
        let pathHP = 0;

        // Add HP from Paths
        if (actor.items) {
            actor.items.forEach(item => {
                if (item.type === "path") {
                    pathHP += item.system.baseHP || 0;
                }
            });
        }

        // Calculate max HP and update both properties
        const calculatedMaxHP = baseHP + pathHP + data.attributes.physique.value + (data.hpMiscBonus || 0);
        data.hp.max = calculatedMaxHP;
        data.maxHP = calculatedMaxHP;

        // Calculate max Sanity and update both properties
        const calculatedMaxSanity = 10 + data.attributes.mind.value + (data.sanity?.miscBonus || 0);
        data.sanity.max = calculatedMaxSanity;
        data.maxSanity = calculatedMaxSanity;
    }

    /**
     * Apply facing modifiers to defenses
     */
    _applyFacingModifiers(data) {
        // Apply facing modifications to defensive values
        const facing = data.defenses.facing || 'front';

        // console.log(`Applying facing modifiers for: ${facing}`);

        // Apply modifications based on facing
        if (facing === 'flank') {
            // Full passive defenses, but -1 to Avoid
            data.defenses.avoidPenalty = -1;
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

        // Apply avoid penalty to total avoid
        data.totalAvoid += data.defenses.avoidPenalty;

        // Ensure total avoid doesn't go below 0
        data.totalAvoid = Math.max(0, data.totalAvoid);

        /*
        console.log(`After facing modifiers: 
      Passive Dodge: ${data.defenses.passiveDodge}
      Passive Parry: ${data.defenses.passiveParry}
      Total Avoid: ${data.totalAvoid} (includes penalty of ${data.defenses.avoidPenalty})`);
      */
    }

    /**
     * Calculate carrying capacity
     */
    _calculateCarryingCapacity(data) {
        const physique = data.attributes.physique.value;
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
     * Special handler just for facing dropdown
     * @private
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
     */
    async _handleFacingChange(event) {
        event.preventDefault();
        event.stopPropagation();

        const actor = this.actor;
        const sheet = this;
        const newFacing = event.target.value;

        // console.log(`Facing changed to: ${newFacing}`);

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
     * Handle facing update with direct approach
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
            // console.log(`Facing direct change to: ${newFacing}`);

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

                // console.log(`Facing successfully updated to: ${newFacing}`);
                ui.notifications.info(`Facing changed to: ${newFacing}`);
            } catch (error) {
                console.error("Facing update failed:", error);
                ui.notifications.error("Failed to update facing");
            }
        });
    }

    /**
     * Force defense recalculation
     */
    async _onDefenseRecalculation(event) {
        const actor = this.actor;
        const data = actor.system;

        if (!data.defenses) return;

        // Get the current facing
        const facing = data.defenses.facing || "front";
        // console.log(`Recalculating defenses with facing: ${facing}`);

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

        // Log the changes for debugging
        /*
        console.log(`Defense adjustments:
        Original Dodge: ${originalDodge} → New Dodge: ${newDodge}
        Original Parry: ${originalParry} → New Parry: ${newParry}
        Avoid Penalty: ${avoidPenalty}`);
        */

        // Update the actor with the new calculated values
        await actor.update({
            "system.defenses.passiveDodge": newDodge,
            "system.defenses.passiveParry": newParry,
            "system.defenses.avoidPenalty": avoidPenalty
        });
    }

    /**
     * Use flags to manage facing
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

        // console.log("Initializing facing from flags:", currentFacing);

        // Set dropdown to match flag
        facingDropdown.val(currentFacing);

        // Handle dropdown change
        facingDropdown.off('change').on('change', async function (event) {
            // Stop event propagation to prevent other handlers from running
            event.stopPropagation();
            event.preventDefault();

            const newFacing = this.value;

            // console.log(`Facing changed to: ${newFacing}`);

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
        console.log(`Updating defenses for facing ${facing} with base values:
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
        console.log(`New defense values after facing ${facing}:
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
        console.log(`Calculated base defenses:
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
    */
    _initializeDefenseExpansion(html) {
        // Remove any existing event handlers to prevent duplicates
        html.find('.defense-checkbox').off('change');

        // Add new handlers
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
     * Update displayed defense values with more direct approach
     */
    async _updateDefenseDisplays() {
        const actor = this.actor;

        // Get current values directly from flags
        const currentDodge = actor.getFlag("thefade", "currentPassiveDodge") || 0;
        const currentParry = actor.getFlag("thefade", "currentPassiveParry") || 0;
        const avoidPenalty = actor.getFlag("thefade", "avoidPenalty") || 0;

        // Calculate base avoid
        const baseAvoid = Math.floor(actor.system.attributes.finesse.value / 2);
        const avoidBonus = actor.system.defenses.avoidBonus || 0;

        // Calculate total avoid with penalty
        const totalAvoid = Math.max(0, baseAvoid + avoidBonus + avoidPenalty);

        /*
        console.log(`Updating defense displays:
        Base Avoid: ${baseAvoid}
        Avoid Bonus: ${avoidBonus}
        Avoid Penalty: ${avoidPenalty}
        Total Avoid: ${totalAvoid}
        Current Dodge: ${currentDodge}
        Current Parry: ${currentParry}`);
        */

        // Update values directly on the actor using a single update for efficiency
        const updateData = {
            "system.defenses.passiveDodge": currentDodge,
            "system.defenses.passiveParry": currentParry,
            "system.defenses.avoidPenalty": avoidPenalty,
            "system.totalAvoid": totalAvoid
        };

        // If the actor isn't loaded yet or is being initialized, skip the update
        if (!actor.id) return;

        // Apply the update
        await actor.update(updateData);

        // Update the UI elements directly
        try {
            // Use jQuery to update values on the sheet
            const sheet = this.element;

            if (sheet) {
                // Update avoid display
                sheet.find('input.avoid-value').val(totalAvoid);

                // Update passive dodge display
                sheet.find('input.passive-dodge-value').val(currentDodge);

                // Update passive parry display
                sheet.find('input.passive-parry-value').val(currentParry);
            }
        } catch (error) {
            console.error("Error updating UI elements:", error);
        }
    }

    // This method needs to be called when the sheet is first loaded or rendered
    async _initializeDefenseSystem(html) {
        // First handle expansion behavior
        this._initializeDefenseExpansion(html);

        // Calculate and store base defenses
        await this._calculateAndStoreBaseDefenses();

        // Initialize facing dropdown with flags
        await this._initializeFacingWithFlags(html);

        // Make sure displays are updated
        await this._updateDefenseDisplays();
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Initialize defense system with flags
        this._initializeDefenseSystem(html);

        this._activateInventoryListeners(html);

        // Add regular input change handler for other fields
        html.find('input[name], select[name]:not([name="system.defenses.facing"])').change(ev => {
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
                this.actor.update({
                    "system": {
                        [path]: value
                    }
                });
            } else {
                // For other updates
                this.actor.update({
                    [fieldName]: value
                });
            }
        });


        // Add explicit input change handler
        html.find('input[name], select[name]').change(ev => {
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
            // console.log("Facing changed to:", facing);

            // Use direct document API to update
            try {
                await actor.update({
                    "system.defenses.facing": facing
                });
                // console.log("Facing update successful");
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

        // Existing listeners remain the same
        html.find('.item-create').click(ev => {
            ev.preventDefault();
            const header = ev.currentTarget;
            const type = header.dataset.type;

            const data = duplicate(header.dataset);
            const name = `New ${type.capitalize()}`;

            const itemData = {
                name: name,
                type: type,
                system: data
            };

            delete itemData.system["type"];

            return this.actor.createEmbeddedDocuments("Item", [itemData]);
        });

        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const itemId = li.data("itemId");
            if (!itemId) return;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            item.sheet.render(true);
        });

        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const itemId = li.data("itemId");

            if (!itemId) return;

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

        html.find('.skill-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("skill", this.actor);
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

        html.find('.item-browse').click(ev => {
            ev.preventDefault();
            openCompendiumBrowser("item", this.actor);
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

        // Handle equipping magic items
        html.find('.item-equip').click(ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            const itemId = element.closest('.magic-item').dataset.itemId;
            const targetSlot = element.dataset.slot;

            const item = this.actor.items.get(itemId);
            if (!item) return;

            // Check if slot is compatible
            const actualSlot = targetSlot === 'ring' ? this._getAvailableRingSlot() : targetSlot;
            if (!actualSlot) {
                ui.notifications.warn(`No available ${targetSlot} slot.`);
                return;
            }

            // Equip the item
            this._equipMagicItem(item, actualSlot);
        });

        // Handle unequipping magic items
        html.find('.item-unequip').click(ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            const itemId = element.closest('.equipped-item').dataset.itemId;

            const item = this.actor.items.get(itemId);
            if (item) {
                this._unequipMagicItem(item);
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

        this._initializeFacingDropdown(html);
        this._updateFacingDirectly(html);
        this._setupArmorResetListeners(html);
        // Initialize tooltips
        this._initializeDataTooltips(html);
    }

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

        _onUnequipMagicItem(event) {
            event.preventDefault();
            const element = event.currentTarget;
            const itemId = element.closest('.equipped-item').dataset.itemId;
        
            const item = this.actor.items.get(itemId);
            if (item) {
                this._unequipMagicItem(item);
            }
        }

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

    _unequipMagicItem(item) {
        const updates = {
            "system.equipped": false,
            "system.attunement": false
        };

        item.update(updates);
        ui.notifications.info(`${item.name} unequipped.`);
    }

    _getAvailableRingSlot() {
        const ring1 = this.actor.system.magicItems?.ring1;
        const ring2 = this.actor.system.magicItems?.ring2;

        if (!ring1) return 'ring1';
        if (!ring2) return 'ring2';
        return null;
    }

    _getCurrentAttunements() {
        return this.actor.items.filter(item =>
            item.type === 'magicitem' &&
            item.system.attunement === true
        ).length;
    }

    _getMaxAttunements() {
        const totalLevel = this.actor.system.level || 1;
        const soulAttribute = this.actor.system.attributes.soul.value || 1;
        return Math.max(0, Math.floor(totalLevel / 4) + soulAttribute);
    }


    /**
     * Handle rolling a Skill check
     * @param {Event} event   The originating click event
     * @private
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
     * Handle rolling an Attribute check
     * @param {Event} event   The originating click event
     * @private
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
     * Handle rolling an Attack with a weapon
     * @param {Event} event   The originating click event
     * @private
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
    * Display a dialog to select target for attack or spell
    * @param {string} title Dialog title
    * @returns {Promise<object|null>} Object with targetId and facingType, or null if cancelled
    * @private
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
     * Handle rolling generic dice
     * @param {Event} event   The originating click event
     * @private
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
      ${successesMessage}
    `
        });
    }

    /**
     * Handle rolling Initiative
     * @param {Event} event   The originating click event
     * @private
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
     * Display a dialog to get the spell's difficulty threshold
     * @returns {Promise<number|null>} The spell DT or null if cancelled
     * @private
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

    /**
     * Display a dialog to get the difficulty threshold
     * @param {string} title Dialog title
     * @param {number} defaultDT Default DT value
     * @returns {Promise<number|null>} The selected DT or null if cancelled
     * @private
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

    /**
 * Special method to handle armor AP reset functionality
 * Add this as a new method in the TheFadeCharacterSheet class
 */
    _setupArmorResetListeners(html) {
        // console.log("Setting up armor reset listeners");

        // Individual armor reset
        const resetButtons = html.find('.reset-armor-button');
        // console.log(`Found ${resetButtons.length} individual reset buttons`);

        resetButtons.on('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            // console.log("Reset armor button clicked");

            const button = event.currentTarget;
            const li = button.closest('.item');

            if (!li) {
                console.error("Could not find parent item element");
                return;
            }

            const itemId = li.dataset.itemId || $(li).data("itemId");
            // console.log("Item ID:", itemId);

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

            // console.log(`Resetting armor ${item.name} (${itemId})`);
            // console.log(`Current AP: ${item.system.currentAP}, Max AP: ${item.system.ap}`);

            try {
                // Convert to numbers to ensure type consistency
                const maxAP = Number(item.system.ap);

                await item.update({
                    "system.currentAP": maxAP
                });

                // console.log(`Reset successful, new AP: ${maxAP}`);
                ui.notifications.info(`${item.name}'s armor protection has been restored to full.`);
            } catch (error) {
                console.error("Error updating armor:", error);
                ui.notifications.error("Failed to reset armor. See console for details.");
            }
        });

        // Reset all armor
        const resetAllButton = html.find('.reset-all-armor');
        // console.log(`Found ${resetAllButton.length} reset all armor buttons`);

        resetAllButton.on('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            // console.log("Reset all armor button clicked");

            const armorItems = this.actor.items.filter(i => i.type === "armor");
            // console.log(`Found ${armorItems.length} armor items`);

            if (armorItems.length === 0) {
                ui.notifications.warn("No armor items found.");
                return;
            }

            try {
                for (const armor of armorItems) {
                    const maxAP = Number(armor.system.ap);
                    // console.log(`Resetting ${armor.name} from ${armor.system.currentAP} to ${maxAP}`);

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

    /**
     * Initialize data path tooltips for development
     * @param {HTMLElement} html - The rendered HTML
     * @private
     */
    _initializeDataTooltips(html) {
        let tooltip = null;

        // Handle mouseenter on form elements and display elements
        html.on('mouseenter', 'input, select, textarea, .defense-value input, .total-value, .base-value, .avoid-value, .passive-dodge-value, .passive-parry-value', function (event) {
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

            // Remove existing tooltip
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }

            // Create new tooltip
            tooltip = $(`<div class="data-tooltip">${dataPath}</div>`);
            $('body').append(tooltip);

            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipWidth = tooltip.outerWidth();

            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            let top = rect.top - tooltip.outerHeight() - 8;

            // Keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }
            if (top < 10) {
                top = rect.bottom + 8;
            }

            tooltip.css({
                left: left + 'px',
                top: top + 'px'
            });

            // Show tooltip
            setTimeout(() => tooltip.addClass('show'), 10);
        });

        // Handle mouseleave
        html.on('mouseleave', 'input, select, textarea, .defense-value input, .total-value, .base-value, .avoid-value, .passive-dodge-value, .passive-parry-value', function () {
            if (tooltip) {
                tooltip.removeClass('show');
                setTimeout(() => {
                    if (tooltip) {
                        tooltip.remove();
                        tooltip = null;
                    }
                }, 150);
            }
        });
    }
}

// Register the sheet application
Actors.registerSheet("thefade", TheFadeCharacterSheet, {
  types: ["character"],
  makeDefault: true
});

// Function to register all item sheets
function registerItemSheets() {
    // Define the base TheFadeItemSheet
    Items.registerSheet("thefade", TheFadeItemSheet, {
        types: [
            "weapon", "armor", "skill", "path", "spell", "talent", "item",
            "species", "drug", "poison", "biological", "medical", "travel",
            "mount", "vehicle", "musical", "potion", "staff", "wand", "gate",
            "communication", "containment", "dream", "fleshcraft", "magicitem"
        ],
        makeDefault: true
    });

    // For future: If we want specialized sheets for specific item types
    // We can add them here, for example:
    /*
    Items.registerSheet("thefade", TheFadeMagicItemSheet, {
      types: ["magicitem"],
      makeDefault: true
    });
    */
}

/**
 * Apply spell filtering based on stored filters
 * @param {HTMLElement} html - The rendered HTML
 * @param {Object} filters - The filter values
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

// System Initialization Hook
Hooks.once('init', async function () {
    // console.log("Initializing The Fade (Abyss) System");

    // Define all the item types that will be available
    CONFIG.Item = CONFIG.Item || {};
    CONFIG.Item.documentClass = TheFadeItem;

    // This array MUST match the types in template.json
    CONFIG.Item.types = [
        "weapon", "armor", "skill", "path", "spell", "talent", "item", "species",
        "drug", "poison", "biological", "medical", "travel", "mount", "vehicle",
        "musical", "potion", "staff", "wand", "gate", "communication",
        "containment", "dream", "fleshcraft", "magicitem"
    ];

    // Define labels for display
    CONFIG.Item.typeLabels = {
        weapon: "TYPES.Item.weapon",
        armor: "TYPES.Item.armor",
        skill: "TYPES.Item.skill",
        path: "TYPES.Item.path",
        spell: "TYPES.Item.spell",
        talent: "TYPES.Item.talent",
        item: "TYPES.Item.item",
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
        magicitem: "TYPES.Item.magicitem"
    };

    // Define custom Entity classes
    CONFIG.Actor.documentClass = TheFadeActor;
    CONFIG.Item.documentClass = TheFadeItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);

    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    Actors.registerSheet("thefade", TheFadeCharacterSheet, {
        types: ["character"],
        makeDefault: true
    });

    Items.registerSheet("thefade", TheFadeItemSheet, {
        makeDefault: true
    });

    // Pre-load templates
    loadTemplates([
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
        "systems/thefade/templates/dialogs/character-select.html"
    ]);

    // ADD THE INITIATIVE CODE HERE
    // Set up initiative formula for the system
    CONFIG.Combat.initiative = {
        formula: "1d12 + @system.attributes.finesse.value",
        decimals: 0
    };

    // Override the default initiative formula method
    Combat.prototype.getInitiativeFormula = function (combatant) {
        const actor = combatant.actor;
        if (!actor) return "1d12";

        // For The Fade system, calculate initiative using finesse and mind
        if (actor.type === "character") {
            const finesse = actor.system.attributes.finesse?.value || 0;
            const mind = actor.system.attributes.mind?.value || 0;
            const modifier = Math.floor((finesse + mind) / 2);
            return `1d12 + ${modifier}`;
        }

        // Default formula
        return "1d12";
    };

    const originalRollInitiative = Combat.prototype.rollInitiative;
    Combat.prototype.rollInitiative = async function (ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
        // Ensure ids is an array
        ids = typeof ids === "string" ? [ids] : ids;

        // Process each combatant
        for (let id of ids) {
            const combatant = this.combatants.get(id);
            if (!combatant?.isOwner) continue;

            // Get actor-specific formula
            const actorFormula = this.getInitiativeFormula(combatant);

            // Create and evaluate the roll
            const roll = new Roll(actorFormula);
            await roll.evaluate({ async: true });

            // Update the combatant initiative
            await this.updateEmbeddedDocuments("Combatant", [{
                _id: id,
                initiative: roll.total
            }]);

            // Display the result as a chat message
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

        // Update the current turn if requested
        if (updateTurn && this.turns) {
            await this.update({ turn: 0 });
        }

        return this;
    };

    // Register Handlebars helper for capitalizing text
    Handlebars.registerHelper('titleCase', function (str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    });

    // Register Handlebars helper for equality comparison
    Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
    });

    // Register a helper for lowercase conversion
    Handlebars.registerHelper('lowercase', function (str) {
        return (str || '').toLowerCase();
    });

    // Register times helper for creating numbered checkboxes
    Handlebars.registerHelper('times', function (n, block) {
        let accum = '';
        for (let i = 1; i <= n; ++i)
            accum += block.fn(i);
        return accum;
    });

    // Register concat helper
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
            case "armor": compendiumName = "armor"; break;
            case "item": compendiumName = "equipment"; break;
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
                            // Get the item from the compendium
                            const entryId = li.data("document-id");
                            const item = await pack.getDocument(entryId);

                            if (item) {
                                // If we have an actor, add the item to the actor
                                if (actor) {
                                    // Check if the item already exists
                                    const exists = actor.items.some(i => i.name === item.name && i.type === item.type);

                                    if (!exists) {
                                        // Create a new item for the actor
                                        await actor.createEmbeddedDocuments("Item", [item.toObject()]);
                                        ui.notifications.info(`Added ${item.name} to ${actor.name}.`);
                                    } else {
                                        ui.notifications.warn(`${item.name} is already added to this character.`);
                                    }
                                }
                                // Otherwise handle special cases (like adding skills to paths)
                                else {
                                    ui.notifications.info(`Selected ${item.name} from compendium.`);
                                    // Trigger custom event that sheet classes can listen for
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
}

// System Initialization Hook
Hooks.once('init', async function () {
    // console.log("Initializing The Fade (Abyss) System");

    // Define custom Entity classes
    CONFIG.Actor.documentClass = TheFadeActor;
    CONFIG.Item.documentClass = TheFadeItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("thefade", TheFadeItemSheet, { makeDefault: true });

    // Pre-load templates
    loadTemplates([
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
        "systems/thefade/templates/dialogs/character-select.html"
    ]);

    // Handle things being dropped onto the sheet! Spells, Paths, Species, and so forth!
    Hooks.on("createItem", async (item, options, userId) => {

        // Adding Paths
        if (item.type === 'path' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
            const actor = item.parent;
            const path = item;

            // Check if the path has associated skills
            if (path.system.pathSkills && path.system.pathSkills.length > 0) {
                // Collect skills to add
                const skillsToAdd = [];
                let skillsUpgraded = 0;

                for (const pathSkill of path.system.pathSkills) {
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
                    ui.notifications.info(`Skills from ${path.name} applied to ${actor.name}: ${message}`);
                }
            }
        }

        // Adding Species
        if (item.type === 'species' && item.parent && item.parent.type === 'character' && game.user.id === userId) {
            const actor = item.parent;
            const species = item;

            // Step 1: Build deletion object using dot notation for each attribute
            const deletions = {};

            for (const attr of Object.keys(actor.system.attributes)) {
                deletions[`system.attributes.${attr}.speciesBonus`] = null;
                deletions[`system.attributes.${attr}.flexibleBonus`] = null;
            }

            // Also clear the flexible bonus
            deletions["system.species.flexibleBonus"] = {
                value: 0,
                selectedAttribute: ""
            };

            // Apply the deletions forcefully
            await actor.update(deletions);


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
                }
            });

            // Reapply ability bonuses cleanly
            const updatedAttributes = duplicate(actor.system.attributes);
            for (const [attr, bonus] of Object.entries(species.system.abilityBonuses)) {
                if (updatedAttributes[attr] && bonus !== 0) {
                    updatedAttributes[attr].speciesBonus = bonus;
                }
            }

            await actor.update({
                "system.attributes": updatedAttributes
            });

            // Update abilities as text
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

    Hooks.on("init", () => {
        // Set the default initiative formula for the system
        CONFIG.Combat.initiative = {
            formula: "1d12 + @attributes.finesse.value + @attributes.mind.value",
            decimals: 2
        };
    });
});

// Actor and Item Base Classes
class TheFadeActor extends Actor {
    prepareData() {
        super.prepareData();

        const actorData = this;
        const data = actorData.system;
        const flags = actorData.flags;

        // Make separate methods for each Actor type (character, npc, etc.)
        if (actorData.type === 'character') {
            this._prepareCharacterData(actorData);
        }

        // Ensure attributes always have a value
        if (data.attributes) {
            Object.keys(data.attributes).forEach(attr => {
                if (data.attributes[attr].value === undefined) {
                    data.attributes[attr].value = 1;
                }
            });
        }

        // Ensure defenses has required properties
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
                facing: "front"
            };
        }

        // Ensure facing has a default value
        if (!data.defenses.facing) {
            data.defenses.facing = "front";
        }

        // Make separate methods for each Actor type (character, npc, etc.)
        if (actorData.type === 'character') {
            this._prepareCharacterData(actorData);
        }

        // Ensure attributes always have a value
        if (data.attributes) {
            Object.keys(data.attributes).forEach(attr => {
                if (data.attributes[attr].value === undefined) {
                    data.attributes[attr].value = 1;
                }
            });
        }

        // this.prepareMagicItems();

        // Ensure naturalDeflection exists as an object with all body parts
        if (!data.naturalDeflection || typeof data.naturalDeflection !== 'object') {
            data.naturalDeflection = {
                head: 0,
                body: 0,
                leftarm: 0,
                rightarm: 0,
                leftleg: 0,
                rightleg: 0
            };
        } else {
            // Ensure all body parts exist
            const bodyParts = ['head', 'body', 'leftarm', 'rightarm', 'leftleg', 'rightleg'];
            bodyParts.forEach(part => {
                if (data.naturalDeflection[part] === undefined) {
                    data.naturalDeflection[part] = 0;
                }
            });
        }
    }

    _prepareCharacterData(actorData) {
        const data = actorData.system;

        // Initialize attributes if undefined
        if (!data.attributes) {
            data.attributes = {
                physique: { value: 1 },
                finesse: { value: 1 },
                mind: { value: 1 },
                presence: { value: 1 },
                soul: { value: 1 }
            };
        }

        // Ensure each attribute has a value
        Object.keys(data.attributes).forEach(attr => {
            if (data.attributes[attr].value === undefined) {
                data.attributes[attr].value = 1;
            }

            // Ensure the value is a number
            data.attributes[attr].value = Number(data.attributes[attr].value) || 1;

            // Make sure the species bonus is accounted for in calculations
            // The actual value already includes the bonus, this is just for display
            data.attributes[attr].speciesBonus = data.attributes[attr].speciesBonus || 0;
        });

        // Calculate defenses based on attributes and include bonuses
        // Initialize bonus values if they don't exist
        if (!data.defenses.resilienceBonus) data.defenses.resilienceBonus = 0;
        if (!data.defenses.avoidBonus) data.defenses.avoidBonus = 0;
        if (!data.defenses.gritBonus) data.defenses.gritBonus = 0;

        // Calculate base defenses based on attributes
        data.defenses.resilience = Math.floor(data.attributes.physique.value / 2);
        data.defenses.avoid = Math.floor(data.attributes.finesse.value / 2);
        data.defenses.grit = Math.floor(data.attributes.mind.value / 2);

        // Ensure minimum value of 1 for base defenses
        data.defenses.resilience = Math.max(1, data.defenses.resilience);
        data.defenses.avoid = Math.max(1, data.defenses.avoid);
        data.defenses.grit = Math.max(1, data.defenses.grit);

        // Calculate total defenses including bonuses
        data.totalResilience = data.defenses.resilience + Number(data.defenses.resilienceBonus || 0);
        data.totalAvoid = data.defenses.avoid + Number(data.defenses.avoidBonus || 0);
        data.totalGrit = data.defenses.grit + Number(data.defenses.gritBonus || 0);

        // Ensure minimum value of 1 for defenses
        Object.keys(data.defenses).forEach(key => {
            // Skip the bonus fields when enforcing minimums
            if (!key.includes('Bonus')) {
                data.defenses[key] = Math.max(1, data.defenses[key]);
            }
        });

        // Calculate Max HP based on Species, Path, Physique, and misc bonus
        let baseHP = data.species.baseHP || 0;
        let pathHP = 0;

        // Add HP from Paths
        if (actorData.items) { // Check if items exist
            actorData.items.forEach(item => {
                if (item.type === "path") {
                    pathHP += item.system.baseHP || 0;
                }
            });
        }

        // Calculate max HP and update both the token attribute and display property
        const calculatedMaxHP = baseHP + pathHP + data.attributes.physique.value + (data.hpMiscBonus || 0);
        data.hp.max = calculatedMaxHP;
        data.maxHP = calculatedMaxHP; // For backward compatibility with UI

        // Calculate max Sanity and update both properties
        const calculatedMaxSanity = 10 + data.attributes.mind.value + (data.sanity?.miscBonus || 0);
        data.sanity.max = calculatedMaxSanity;
        data.maxSanity = calculatedMaxSanity; // For backward compatibility with UI

        // Ensure HP and Sanity values don't exceed max
        if (data.hp.value > data.hp.max) data.hp.value = data.hp.max;
        if (data.sanity.value > data.sanity.max) data.sanity.value = data.sanity.max;

        // Calculate Sin Threshold
        if (!data.darkMagic) {
            data.darkMagic = {
                spellsLearned: {},
                currentSin: 0,
                sinThresholdBonus: 0,
                addictionLevel: "none"
            };
        }

        // Count dark magic spells learned
        let darkMagicCount = 0;
        for (let key in data.darkMagic.spellsLearned) {
            if (data.darkMagic.spellsLearned[key]) darkMagicCount++;
        }

        // Calculate sin threshold: Soul - 1 per dark magic spell + bonus
        data.darkMagic.sinThreshold = data.attributes.soul.value - darkMagicCount + (data.darkMagic.sinThresholdBonus || 0);

        // Sort Items of Power into equipped/unequipped
        for (let item of data.itemsOfPower) {
            if (item.system.equipped && item.system.slot) {
                data.equippedItemsOfPower[item.system.slot] = item;
            } else {
                data.unequippedItemsOfPower.push(item);
            }
        }

        // Prepare armor with slots
        data.equippedArmor = {};
        data.unequippedArmor = [];
        const armorSlots = ['head', 'torso', 'arms', 'legs'];

        for (let armor of data.armor) {
            if (armor.system.equipped && armor.system.location) {
                data.equippedArmor[armor.system.location] = armor;
            } else {
                data.unequippedArmor.push(armor);
            }
        }

        // Prepare potions and drugs
        data.potions = items.filter(i => i.system.itemCategory === "potion");
        data.drugs = items.filter(i => i.system.itemCategory === "drug");
    }

    /**
    * Get a Roll object for the actor's initiative
    * @returns {Roll}
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
}

// Add this to the initialization hooks section
Hooks.once('ready', async function () {
    // Add a fix button to manually update token bars
    if (game.user.isGM) {
        let fixButton = $(`<button id="fade-fix-tokens">Fix Token Resources</button>`);
        fixButton.click(async function () {
            ui.notifications.info("Updating all Fade token resource bars...");

            // Get all tokens on the active scene
            const tokens = canvas.tokens.placeables.filter(t =>
                t.actor && t.actor.type === "character" && t.document.actorLink
            );

            let count = 0;
            for (let token of tokens) {
                const actor = token.actor;

                // Force token data update
                await token.document.update({
                    "actorData.system.hp.max": actor.system.hp.max,
                    "actorData.system.sanity.max": actor.system.sanity.max
                });
                count++;
            }

            ui.notifications.info(`Updated ${count} tokens on the current scene.`);
        });

        // Add the button to the scene controls
        $('#controls').append(fixButton);
        fixButton.css({
            "position": "fixed",
            "bottom": "10px",
            "left": "10px",
            "z-index": "1000"
        });
    }
});

//Hooks.on("renderChatMessage", (message, html, data) => {
//});

Hooks.on("renderChatMessage", (message, html, data) => {
    // Handle weapon attack bonus options
    if (html.find('.bonus-options').length) {
        handleBonusOptions(html);
    }

    // Handle spell manifestation bonus options
    if (html.find('.spell-bonus').length) {
        handleSpellBonusOptions(html);
    }

    // Handle spell attack bonus options
    if (html.find('.attack-bonus-options').length) {
        handleAttackBonusOptions(html);
    }
});

function handleBonusOptions(html) {
    if (!html.find('.bonus-options').length) return;

    const bonusOptions = html.find('.bonus-option');
    const appliedEffects = html.find('.applied-effects');
    let remainingSuccesses = parseInt(html.find('.remaining-successes').text());

    // Track used effects to ensure each can only be used once
    const usedEffects = new Set();

    bonusOptions.on('click', async (event) => {
        const button = event.currentTarget;
        const option = button.dataset.option;
        const cost = parseInt(button.dataset.cost);

        // Don't allow selecting the same effect twice (except critical)
        //if (option !== "critical" && usedEffects.has(option)) {
        //    ui.notifications.warn(`This effect has already been applied.`);
        //    return;
        //}

        // Check if we have enough successes
        if (remainingSuccesses < cost) {
            ui.notifications.warn(`Not enough bonus successes remaining.`);
            return;
        }

        // Decrement remaining successes
        remainingSuccesses -= cost;
        html.find('.remaining-successes').text(remainingSuccesses);

        // Process the effect based on option type
        let effectHTML = "";

        switch (option) {
            case "critical":
                const critDamage = parseInt(button.dataset.damage);
                effectHTML = `<p><strong>Critical Hit:</strong> +${critDamage} damage - Additional damage from a powerful strike</p>`;
                break;
            case "fire":
                const fireDuration = await new Roll("1d6").evaluate({ async: true });
                const fireRounds = fireDuration.total + (cost - 2);
                effectHTML = `<p><strong>Fire:</strong> Target catches fire for ${fireRounds} rounds - 1d6 fire damage per round until extinguished</p>`;
                usedEffects.add(option);
                break;
            case "cold":
                effectHTML = `<p><strong>Cold:</strong> Fatigue (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to physical actions</p>`;
                usedEffects.add(option);
                break;
            case "acid":
                effectHTML = `<p><strong>Acid:</strong> Pain (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to concentration</p>`;
                usedEffects.add(option);
                break;
            case "electricity":
                effectHTML = `<p><strong>Electricity:</strong> Chain lightning - Attack chains to adjacent target for half damage</p>`;
                usedEffects.add(option);
                break;
            case "sonic":
                const halfDamage = parseInt(button.dataset.damage || 1);
                effectHTML = `<p><strong>Sonic:</strong> Deafness for ${halfDamage} rounds - Target cannot hear and has disadvantage on awareness checks</p>`;
                usedEffects.add(option);
                break;
            case "smiting":
                const fearDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Smiting:</strong> Fear (Moderate) for ${fearDuration.total} rounds - Target must make a Grit check to take aggressive actions</p>`;
                usedEffects.add(option);
                break;
            case "expel":
                const stunDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Expel:</strong> Stunned (Moderate) for ${stunDuration.total} rounds - Target can take only one action per turn</p>`;
                usedEffects.add(option);
                break;
            case "psychokinetic-damage":
                effectHTML = `<p><strong>Psychokinetic (Sanity):</strong> Deal half damage to target's sanity as well as HP</p>`;
                usedEffects.add(option);
                break;
            case "psychokinetic-confusion":
                const confusionDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Psychokinetic (Confusion):</strong> Confusion for ${confusionDuration.total} rounds - Target has trouble determining friend from foe</p>`;
                usedEffects.add(option);
                break;
            case "corruption":
                effectHTML = `<p><strong>Corruption:</strong> Half damage unhealable for 24 hours - Wounds resist magical and natural healing</p>`;
                usedEffects.add(option);
                break;
        }

        // Add effect to display
        appliedEffects.append(effectHTML);

        // Disable clicked button if it's not critical (can use critical multiple times)
        //if (option !== "critical") {
        //    $(button).prop('disabled', true).addClass('disabled');
        //}

        // Disable all buttons if not enough successes remain
        bonusOptions.each((i, btn) => {
            if (parseInt(btn.dataset.cost) > remainingSuccesses) {
                $(btn).prop('disabled', true).addClass('disabled');
            }
        });
    });
}

function handleSpellBonusOptions(html) {
    const bonusOptions = html.find('.spell-bonus, .spell-custom-bonus');
    const appliedEffects = html.find('.applied-effects');
    let remainingSuccesses = parseInt(html.find('.remaining-successes').text());

    // Track used effects and counters for multi-use options
    const usedEffects = new Set();
    const counters = {
        damageIncrease: 0,
        rangeIncrease: 0,
        durationIncrease: 0
    };

    bonusOptions.on('click', async (event) => {
        const button = event.currentTarget;
        const option = button.dataset.option;
        const cost = parseInt(button.dataset.cost);

        // For options that can only be used once
        //if (option !== "increasedamage" && option !== "increaserange" && option !== "increaseduration" && usedEffects.has(option)) {
        //    ui.notifications.warn(`This effect has already been applied.`);
        //    return;
        //}

        if (remainingSuccesses < cost) {
            ui.notifications.warn(`Not enough bonus successes remaining.`);
            return;
        }

        remainingSuccesses -= cost;
        html.find('.remaining-successes').text(remainingSuccesses);

        let effectHTML = "";
        switch (option) {
            case "critical":
                const critDamage = parseInt(button.dataset.damage);
                effectHTML = `<p><strong>Critical Hit:</strong> +${critDamage} damage - Additional damage from a powerful magical strike</p>`;
                usedEffects.add(option);
                break;

            case "increasedamage":
                counters.damageIncrease++;
                effectHTML = `<p><strong>Increased Damage:</strong> +${counters.damageIncrease} to base damage</p>`;
                break;

            case "increaserange":
                counters.rangeIncrease++;
                effectHTML = `<p><strong>Increased Range:</strong> +${counters.rangeIncrease} hex to spell range</p>`;
                break;

            case "increaseduration":
                counters.durationIncrease++;
                effectHTML = `<p><strong>Increased Duration:</strong> +${counters.durationIncrease} time increment</p>`;
                break;

            case "spellbonus":
                effectHTML = `<p><strong>Enhanced Effect:</strong> Spell potency increased</p>`;
                usedEffects.add(option);
                break;

            case "custombonus":
                effectHTML = `<p><strong>Bonus Effect:</strong> ${button.textContent.trim()}</p>`;
                usedEffects.add(option);
                break;
        }

        // Add effect to display
        appliedEffects.append(effectHTML);

        // For single-use options, disable the button
        //if (option !== "increasedamage" && option !== "increaserange" && option !== "increaseduration") {
        //    $(button).prop('disabled', true).addClass('disabled');
        //}

        // Disable all buttons if not enough successes
        bonusOptions.each((i, btn) => {
            if (parseInt(btn.dataset.cost) > remainingSuccesses) {
                $(btn).prop('disabled', true).addClass('disabled');
            }
        });
    });
}

function handleAttackBonusOptions(html) {
    const bonusOptions = html.find('.attack-bonus');
    const appliedEffects = html.find('.attack-applied-effects');
    let remainingSuccesses = parseInt(html.find('.attack-remaining-successes').text());

    // Track used effects to ensure each can only be used once
    const usedEffects = new Set();

    bonusOptions.on('click', async (event) => {
        const button = event.currentTarget;
        const option = button.dataset.option;
        const cost = parseInt(button.dataset.cost);

        // Don't allow selecting the same effect twice
        if (option !== "critical" && usedEffects.has(option)) {
            ui.notifications.warn(`This effect has already been applied.`);
            return;
        }

        // Check if we have enough successes
        if (remainingSuccesses < cost) {
            ui.notifications.warn(`Not enough bonus successes remaining.`);
            return;
        }

        // Decrement remaining successes
        remainingSuccesses -= cost;
        html.find('.attack-remaining-successes').text(remainingSuccesses);

        // Process the effect based on option type
        let effectHTML = "";

        switch (option) {
            case "critical":
                const critDamage = parseInt(button.dataset.damage);
                effectHTML = `<p><strong>Critical Hit:</strong> +${critDamage} damage - Additional damage from a powerful strike</p>`;
                break;
            case "fire":
                const fireDuration = await new Roll("1d6").evaluate({ async: true });
                const fireRounds = fireDuration.total + (cost - 2);
                effectHTML = `<p><strong>Fire:</strong> Target catches fire for ${fireRounds} rounds - 1d6 fire damage per round until extinguished</p>`;
                break;
            case "cold":
                effectHTML = `<p><strong>Cold:</strong> Fatigue (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to physical actions</p>`;
                break;
            case "acid":
                effectHTML = `<p><strong>Acid:</strong> Pain (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to concentration</p>`;
                break;
            case "electricity":
                effectHTML = `<p><strong>Electricity:</strong> Chain lightning - Attack chains to adjacent target for half damage</p>`;
                break;
            case "sonic":
                const halfDamage = parseInt(button.dataset.damage || 1);
                effectHTML = `<p><strong>Sonic:</strong> Deafness for ${halfDamage} rounds - Target cannot hear and has disadvantage on awareness checks</p>`;
                break;
            case "smiting":
                const fearDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Smiting:</strong> Fear (Moderate) for ${fearDuration.total} rounds - Target must make a Grit check to take aggressive actions</p>`;
                break;
            case "expel":
                const stunDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Expel:</strong> Stunned (Moderate) for ${stunDuration.total} rounds - Target can take only one action per turn</p>`;
                break;
            case "psychokinetic-damage":
                effectHTML = `<p><strong>Psychokinetic (Sanity):</strong> Deal half damage to target's sanity as well as HP</p>`;
                break;
            case "psychokinetic-confusion":
                const confusionDuration = await new Roll("1d6").evaluate({ async: true });
                effectHTML = `<p><strong>Psychokinetic (Confusion):</strong> Confusion for ${confusionDuration.total} rounds - Target has trouble determining friend from foe</p>`;
                break;
            case "corruption":
                effectHTML = `<p><strong>Corruption:</strong> Half damage unhealable for 24 hours - Wounds resist magical and natural healing</p>`;
                break;
        }

        // Add effect to display
        appliedEffects.append(effectHTML);

        // Mark effect as used if it's not critical
        if (option !== "critical") {
            usedEffects.add(option);
        }

        // Disable clicked button
        // $(button).prop('disabled', true).addClass('disabled');

        // Disable all buttons if not enough successes remain
        bonusOptions.each((i, btn) => {
            // Disable the button if it's a used one-time effect
            if (usedEffects.has(btn.dataset.option)) {
                $(btn).prop('disabled', true).addClass('disabled');
            }

            // Disable if not enough successes
            if (parseInt(btn.dataset.cost) > remainingSuccesses) {
                $(btn).prop('disabled', true).addClass('disabled');
            }
        });
    });
}

// ITEM FUNCTIONS
class TheFadeItem extends Item {
    prepareData() {
        super.prepareData();

        // Get the Item's data
        const itemData = this;
        const data = itemData.system;
        const flags = itemData.flags;

        // Different preparations based on item type
        if (itemData.type === 'weapon') this._prepareWeaponData(itemData);
        else if (itemData.type === 'armor') this._prepareArmorData(itemData);
        else if (itemData.type === 'skill') this._prepareSkillData(itemData);
        else if (itemData.type === 'spell') this._prepareSpellData(itemData);
        else if (itemData.type === 'species') this._prepareSpeciesData(itemData);
        else if (itemData.type === 'drug') this._prepareDrugData(itemData);
        else if (itemData.type === 'poison') this._preparePoisonData(itemData);
        else if (itemData.type === 'biological') this._prepareBiologicalData(itemData);
        else if (itemData.type === 'mount') this._prepareMountData(itemData);
        else if (itemData.type === 'vehicle') this._prepareVehicleData(itemData);
        else if (itemData.type === 'staff' || itemData.type === 'wand') this._prepareMagicToolData(itemData);
        else if (itemData.type === 'gate') this._prepareGateData(itemData);
        else if (itemData.type === 'magicitem') this._prepareMagicItemData(itemData);
        else if (itemData.type === 'fleshcraft') this._prepareFleshcraftData(itemData);
    }

    _prepareWeaponData(itemData) {
        const data = itemData.system;

        // Initialize weapon properties if undefined
        if (!data.damage) data.damage = 0;
        if (!data.damageType) data.damageType = "S";
        if (!data.critical) data.critical = 4;
        if (!data.handedness) data.handedness = "One-Handed";
        if (!data.range) data.range = "Melee";
        if (!data.integrity) data.integrity = 10;
        if (!data.weight) data.weight = 1;
        if (!data.qualities) data.qualities = "";
        if (!data.skill) data.skill = "Sword";
        if (!data.attribute) data.attribute = "physique";
        if (!data.miscBonus) data.miscBonus = 0;
    }

    _prepareArmorData(itemData) {
        const data = itemData.system;

        // Initialize armor properties if undefined
        if (!data.ap) data.ap = 0;
        if (data.currentAP === undefined) data.currentAP = data.ap;
        if (!data.isHeavy) data.isHeavy = false;
        if (!data.location) data.location = "Body";
        if (!data.weight) data.weight = 1;
        if (!data.autoBlock) data.autoBlock = "";

        // Initialize other limb AP for arms/legs
        if ((data.location === "Arms" || data.location === "Legs" || data.location == "Arms+" || data.location == "Legs+") && data.otherLimbAP === undefined) {
            data.otherLimbAP = data.ap;
        }
    }

    _prepareSkillData(itemData) {
        const data = itemData.system;

        // Initialize skill properties if undefined
        if (!data.rank) data.rank = "untrained";
        if (!data.category) data.category = "Combat";
        if (!data.attribute) data.attribute = "physique";
        if (!data.description) data.description = "";
        if (!data.miscBonus) data.miscBonus = 0;
    }

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

    _prepareDrugData(itemData) {
        const data = itemData.system;

        // Initialize drug properties if undefined
        if (!data.duration) data.duration = "";
        if (!data.addiction) data.addiction = "";
        if (!data.overdose) data.overdose = "";
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    _preparePoisonData(itemData) {
        const data = itemData.system;

        // Initialize poison properties if undefined
        if (!data.toxicity) data.toxicity = "";
        if (!data.poisonType) data.poisonType = "injury";
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    _prepareBiologicalData(itemData) {
        const data = itemData.system;

        // Initialize biological item properties if undefined
        if (!data.hp) data.hp = 0;
        if (!data.energy) data.energy = 0;
        if (!data.effect) data.effect = "";
        if (!data.weight) data.weight = 0;
    }

    _prepareMountData(itemData) {
        const data = itemData.system;

        // Initialize mount properties if undefined
        if (!data.hp) data.hp = 0;
        if (!data.avoid) data.avoid = 0;
        if (!data.size) data.size = "medium";
        if (!data.movement) data.movement = 4;
        if (!data.carryCapacity) data.carryCapacity = 0;
    }

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

    _prepareGateData(itemData) {
        const data = itemData.system;

        // Initialize dimensional gate properties if undefined
        if (!data.range) data.range = "";
        if (!data.duration) data.duration = "";
        if (!data.usesPerDay) data.usesPerDay = "";
    }

    _prepareMagicItemData(itemData) {
        const data = itemData.system;

        // Initialize item of power properties if undefined
        if (!data.slot) data.slot = "body";
        if (!data.effect) data.effect = "";
        if (!data.attunement) data.attunement = true;
    }

    _prepareFleshcraftData(itemData) {
        const data = itemData.system;

        // Initialize fleshcraft properties if undefined
        if (!data.el) data.el = 1;
        if (!data.creatureType) data.creatureType = "";
        if (!data.hp) data.hp = 0;
        if (!data.naturalWeapons) data.naturalWeapons = "";
        if (!data.specialAbilities) data.specialAbilities = "";
    }
}

// ITEM SHEET FUNCTIONS
class TheFadeItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "item", "species"],
            width: 520,
            height: 480,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    get template() {
        const path = "systems/thefade/templates/item";
        // Magic items use the generic item sheet (they already have conditional sections in item-sheet.html)
        if (this.item.type === "magicitem") {
            return `${path}/item-sheet.html`;
        }
        return `${path}/${this.item.type}-sheet.html`;
    }

    getData() {
        const data = super.getData();

        // Ensure proper data structure for templates
        data.system = data.item.system;
        data.dtypes = ["String", "Number", "Boolean"];

        // Get the full list of item types for the dropdown
        data.itemTypes = Object.entries(CONFIG.Item.typeLabels).reduce((obj, e) => {
            obj[e[0]] = game.i18n.localize(e[1]);
            return obj;
        }, {});

        // Prepare path skills for the path sheet
        if (this.item.type === 'path') {
            this._preparePathSkills(data);
        }

        return data;
    }

    _preparePathSkills(sheetData) {
        if (this.item.type !== 'path') return;

        // Get the path skills from the item data
        const pathSkills = [];

        // If the path has skills stored in its data
        if (this.item.system.pathSkills && Array.isArray(this.item.system.pathSkills)) {
            for (const skillData of this.item.system.pathSkills) {
                // Create a proper skill object for the template
                pathSkills.push({
                    _id: skillData._id || randomID(16),
                    name: skillData.name,
                    system: skillData.system || {},
                    img: skillData.img || "icons/svg/item-bag.svg"
                });
            }
        }

        // Add the path skills to the sheet data
        sheetData.pathSkills = pathSkills;

        // Debug info
        // console.log("Path Skills prepared:", pathSkills);
    }

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

            // Create a new skill item
            const itemData = {
                name: "New Skill",
                type: "skill",
                system: {
                    rank: "learned",
                    category: "Combat",
                    attribute: "physique",
                    description: ""
                }
            };

            // Set up path skills array if it doesn't exist
            if (!this.item.system.pathSkills) {
                await this.item.update({ "system.pathSkills": [] });
            }

            // Create the skill as a temporary item
            const skill = await Item.create(itemData, { temporary: true });

            // Generate a unique ID for this skill
            const skillId = randomID(16);
            const skillObject = skill.toObject();
            skillObject._id = skillId;

            // Add it to the path's skills array
            const pathSkills = duplicate(this.item.system.pathSkills || []);
            pathSkills.push(skillObject);

            await this.item.update({ "system.pathSkills": pathSkills });

            // Refresh the sheet after adding a skill
            this.render(true);

            // Open the skill sheet for editing
            skill.sheet.render(true);
        });

        // Edit path skill
        html.find('.path-skill-edit').click(async ev => {
            ev.preventDefault();
            const li = ev.currentTarget.closest("li");
            const skillId = li.dataset.itemId;

            // Get the current path skills
            const pathSkills = duplicate(this.item.system.pathSkills || []);
            const skillData = pathSkills.find(s => s._id === skillId);

            if (skillData) {
                // Create a temporary skill for editing
                const tempSkill = await Item.create(skillData, { temporary: true });

                // Open the skill sheet
                const skillSheet = tempSkill.sheet.render(true);

                // Add a hook to update the path's skill when the skill sheet is closed
                Hooks.once("closeItemSheet", async (sheet) => {
                    if (sheet.item.id === tempSkill.id) {
                        // Find the skill in the path's array
                        const index = pathSkills.findIndex(s => s._id === skillId);
                        if (index !== -1) {
                            // Update the skill in the path's skills array
                            const updatedSkill = tempSkill.toObject();
                            updatedSkill._id = skillId; // Keep the same ID
                            pathSkills[index] = updatedSkill;

                            // Save changes to the path
                            await this.item.update({ "system.pathSkills": pathSkills });
                            this.render(true);
                        }
                    }
                });
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
        html.find('.skill-browse').click(ev => {
            ev.preventDefault();

            // Call our new generic browser function
            openCompendiumBrowser("skill");

            // Listen for the custom event we'll dispatch when an item is selected
            const self = this;
            const handler = function (e) {
                const skill = e.detail.item;

                if (skill && skill.type === "skill") {
                    // Add the skill to the path
                    const pathSkills = duplicate(self.item.system.pathSkills || []);

                    // Generate a unique ID for this skill
                    const skillId = randomID(16);
                    const skillObject = skill.toObject();
                    skillObject._id = skillId;

                    // Check if the skill already exists
                    const exists = pathSkills.some(s => s.name === skillObject.name);

                    if (!exists) {
                        pathSkills.push(skillObject);
                        self.item.update({ "system.pathSkills": pathSkills });
                        ui.notifications.info(`Added ${skill.name} to ${self.item.name}.`);
                        self.render(true);
                    } else {
                        ui.notifications.warn(`${skill.name} is already added to this path.`);
                    }
                }

                // Clean up the event listener
                document.removeEventListener("compendiumSelection", handler);
            };

            document.addEventListener("compendiumSelection", handler);
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
                    content: `
        <form>
          <p>Select a character to add the skills from ${this.item.name}:</p>
          <div class="form-group">
            <select id="character-select" name="characterId">
              ${characterOptions}
            </select>
          </div>
        </form>
      `,
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
    }

    /**
   * Handle ability deletion (both path and species)
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
                updateData = { "system.abilities": abilities };
            }
        }
        else if (this.item.type === 'species') {
            const abilities = duplicate(this.item.system.speciesAbilities || {});
            if (abilities[abilityId]) {
                delete abilities[abilityId];
                updateData = { "system.speciesAbilities": abilities };
            }
        }

        // Only update if we found something to delete
        if (Object.keys(updateData).length > 0) {
            await this.item.update(updateData);
            this.render(true);
        }
    }

    /**
     * Handle dropping data on the sheet
    */
    async _onDrop(event) {
        // console.log("Drop event triggered on path sheet");
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
            // console.log("Dropped data:", dragData);
        } catch (err) {
            console.error("Error parsing drop data:", err);
            return false;
        }

        // Only process if this is a path sheet
        if (this.item.type !== 'path') {
            // console.log("Not a path sheet");
            return super._onDrop(event);
        }

        // Handle dropping a skill
        if (dragData.type === "Item") {
            // console.log("Item drop detected");
            let skillDoc;

            // Try to load the item from various sources
            try {
                // From UUID
                if (dragData.uuid) {
                    // console.log("Loading from UUID:", dragData.uuid);
                    skillDoc = await fromUuid(dragData.uuid);
                }
                // From compendium
                else if (dragData.pack && dragData.id) {
                    // console.log("Loading from compendium:", dragData.pack, dragData.id);
                    const pack = game.packs.get(dragData.pack);
                    if (pack) {
                        skillDoc = await pack.getDocument(dragData.id);
                    }
                }
                // Directly from data
                else if (dragData.data) {
                    // console.log("Using raw data");
                    skillDoc = dragData.data;
                }
            } catch (err) {
                console.error("Error loading item:", err);
                return false;
            }

            // Check if we got a skill
            if (!skillDoc) {
                // console.log("No skill document found");
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

            // console.log("Skill data:", skillData);

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

// Helper function to convert skill ranks to numeric values for comparison
function getRankValue(rank) {
    const ranks = {
        "untrained": 0,
        "learned": 1,
        "practiced": 2,
        "adept": 3,
        "experienced": 4,
        "expert": 5,
        "mastered": 6
    };

    return ranks[rank] || 0;
}