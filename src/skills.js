import { DEFAULT_SKILLS, PATH_SKILL_TYPES } from './constants.js';

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

export async function initializeDefaultSkills(actor) {
    if (actor.type !== 'character') return;

    const skillsToCreate = [];

    for (const skill of DEFAULT_SKILLS) {
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
                    isCore: true
                }
            });
        }
    }

    if (skillsToCreate.length > 0) {
        await actor.createEmbeddedDocuments("Item", skillsToCreate);
        ui.notifications.info(`Added ${skillsToCreate.length} missing default skills to ${actor.name}.`);
    }
}

export async function createCustomSkill(actor, skillType, subtype, rank = "untrained") {
    if (!subtype || subtype.trim() === "") {
        ui.notifications.error("Subtype is required for custom skills.");
        return null;
    }

    let skillName, category, attribute;

    switch (skillType.toLowerCase()) {
        case "craft":
            skillName = subtype.trim();
            category = "Craft";
            attribute = "mind";
            break;
        case "lore":
            skillName = `Lore (${subtype.trim()})`;
            category = "Knowledge";
            attribute = "mind";
            break;
        case "perform":
            skillName = `Perform (${subtype.trim()})`;
            category = "Physical";
            attribute = "finesse_presence";
            break;
        default:
            ui.notifications.error("Invalid custom skill type. Must be Craft, Lore, or Perform.");
            return null;
    }

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
            isCore: false,
            skillType: skillType.toLowerCase(),
            subtype: subtype.trim()
        }
    };

    const createdSkills = await actor.createEmbeddedDocuments("Item", [skillData]);
    ui.notifications.info(`Created custom skill: ${skillName}`);
    return createdSkills[0];
}

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

export async function improveCharacterSkill(actor, skillData, targetRank) {
    const existingSkill = actor.items.find(i =>
        i.type === 'skill' && i.name === skillData.name
    );

    if (existingSkill) {
        const currentRankValue = getRankValue(existingSkill.system.rank);
        const targetRankValue = getRankValue(targetRank);

        if (targetRankValue > currentRankValue) {
            await existingSkill.update({ "system.rank": targetRank });
        }
    } else {
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

export async function showChooseRegularSkillsDialog(actor, numToChoose, category, rank, path = null) {
    const categorySkills = DEFAULT_SKILLS.filter(skill =>
        skill.category.toLowerCase() === category.toLowerCase()
    );

    if (categorySkills.length === 0) {
        ui.notifications.warn(`No skills found for category: ${category}`);
        return;
    }

    let availableSkills = categorySkills;

    if (path && path.system.pathSkills) {
        const pathSkillNames = path.system.pathSkills
            .filter(pathSkill => {
                const entryType = pathSkill.system.entryType;
                return entryType === PATH_SKILL_TYPES.SPECIFIC_SKILL ||
                    entryType === PATH_SKILL_TYPES.SPECIFIC_CUSTOM;
            })
            .filter(pathSkill => {
                const rankValue = getRankValue(pathSkill.system.rank);
                const learnedValue = getRankValue("learned");
                return rankValue >= learnedValue;
            })
            .map(pathSkill => pathSkill.name.toLowerCase());

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
                    ''}
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

