import { SIZE_OPTIONS, PATH_SKILL_TYPES, DEFAULT_SKILLS } from './constants.js';
import { openCompendiumBrowser } from './compendium.js';
import { getRankValue } from './skills.js';

export class TheFadeItemSheet extends ItemSheet {
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
