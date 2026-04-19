// Utility helpers for The Fade system (extracted from thefade.js).
import { DEFAULT_SKILLS, PATH_SKILL_TYPES, DEFAULT_TOKEN } from './constants.js';

/**
* Convert skill rank to numeric value for comparison
* @param {string} rank - The skill rank
* @returns {number} Numeric value of the rank
*/
export function getRankValue(rank) {
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
export function applySpellFilters(html, filters) {
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
export function openCompendiumBrowser(itemType, actor, compendiumName = null) {
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
* Initialize default skills for a new character
* Call this when creating a new character or when migrating existing characters
*/
export async function initializeDefaultSkills(actor) {
    if (actor.type !== 'character') return;
    if (actor.getFlag("thefade", "addingSkills")) return;
    await actor.setFlag("thefade", "addingSkills", true);

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

    await actor.unsetFlag("thefade", "addingSkills");

}

/**
 * Create a custom skill (Custom Craft, Lore, or Perform)
 */
export async function createCustomSkill(actor, skillType, subtype, rank = "untrained") {
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
export async function showCustomSkillDialog(actor) {
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
export async function applyPathSkillModifications(actor, path) {
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
export async function improveCharacterSkill(actor, skillData, targetRank) {
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
export async function handleChooseSkillsOption(actor, pathSkill) {
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
export async function showChooseRegularSkillsDialog(actor, numToChoose, category, rank, path = null) {
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
export async function showChooseLoreSkillsDialog(actor, numToChoose, rank) {
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
export async function showChoosePerformSkillsDialog(actor, numToChoose, rank) {
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
export async function showChooseCraftSkillsDialog(actor, numToChoose, rank) {
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
