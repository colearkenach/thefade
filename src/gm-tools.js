import {
    buildQuickMonsterStats,
    ENCOUNTER_DANGER_LEVELS,
    ENCOUNTER_MODIFIERS,
    encounterTypeFromRoll,
    QUICK_MONSTER_OPTIONS,
    SKILL_CHALLENGE_COMPLEXITIES
} from "./rules.js";
import {
    ACCESS_LEVEL_MODIFIERS,
    ACCESS_LEVEL_RANKS,
    ACCESS_LEVEL_SKILLS,
    AVERAGE_GEAR_ACCESS_LEVELS,
    calculateAccessLevel
} from "./gear-rules.js";
import {
    DARK_MAGIC_ITEM_NAMES,
    ITEM_POWER_ATTUNEMENT_RULES,
    ITEM_POWER_SLOT_RULES,
    getItemPowerSlotDefinitions
} from "./item-power-rules.js";

const DEFAULT_CHALLENGE = Object.freeze({
    name: "New Skill Challenge",
    goal: "",
    complexity: "simple",
    baseDT: 3,
    successes: 0,
    failures: 0,
    round: 1,
    successTarget: 4,
    failureLimit: 2,
    timeLimit: 6,
    timeUnit: "rounds",
    escalating: true,
    skills: "",
    success: "",
    failure: "",
    complications: ""
});

const DEFAULT_ENCOUNTER = Object.freeze({ escalation: 0 });

function clone(value) {
    return foundry.utils.deepClone(value);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export class TheFadeGMToolkit extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "thefade-gm-toolkit",
            classes: ["thefade", "gm-toolkit"],
            title: "The Fade GM Toolkit",
            template: "systems/thefade/templates/apps/gm-toolkit.html",
            width: 900,
            height: 720,
            closeOnSubmit: false,
            submitOnChange: false,
            tabs: [{ navSelector: ".gm-tool-tabs", contentSelector: ".gm-tool-body", initial: "encounter" }],
            scrollY: [".gm-tool-body"]
        });
    }

    getData() {
        const challenge = foundry.utils.mergeObject(clone(DEFAULT_CHALLENGE), clone(game.settings.get("thefade", "skillChallengeState") || {}), { inplace: false });
        const encounter = foundry.utils.mergeObject(clone(DEFAULT_ENCOUNTER), clone(game.settings.get("thefade", "encounterState") || {}), { inplace: false });
        const challengeStatus = this._challengeStatus(challenge);
        return {
            challenge,
            encounter,
            challengeStatus,
            effectiveDT: Number(challenge.baseDT) + (challenge.escalating ? Number(challenge.failures) : 0),
            challengeComplexities: SKILL_CHALLENGE_COMPLEXITIES,
            dangerLevels: ENCOUNTER_DANGER_LEVELS,
            encounterModifiers: ENCOUNTER_MODIFIERS.map(modifier => ({
                ...modifier,
                signed: modifier.value > 0 ? `+${modifier.value}` : String(modifier.value)
            })),
            quickOptions: QUICK_MONSTER_OPTIONS,
            accessLevelRanks: ACCESS_LEVEL_RANKS,
            averageGearAccessLevels: AVERAGE_GEAR_ACCESS_LEVELS,
            accessLevelSkills: ACCESS_LEVEL_SKILLS,
            accessLevelModifiers: ACCESS_LEVEL_MODIFIERS.map(modifier => ({
                ...modifier,
                signed: modifier.value > 0 ? `+${modifier.value}` : String(modifier.value)
            })),
            itemPowerSlotRules: ITEM_POWER_SLOT_RULES,
            itemPowerAttunementRules: ITEM_POWER_ATTUNEMENT_RULES,
            itemPowerSlotRule: game.settings.get("thefade", "itemPowerSlotRule"),
            itemPowerAttunementRule: game.settings.get("thefade", "itemPowerAttunementRule"),
            alternateItemPowerSlots: getItemPowerSlotDefinitions("alternate").map(slot => ({
                ...slot,
                displayNewSlot: slot.tableLabel || slot.label
            })),
            darkMagicItemNames: DARK_MAGIC_ITEM_NAMES,
            sizeOptions: CONFIG.thefade?.sizeOptions ?? {
                miniscule:"Miniscule", diminutive:"Diminutive", tiny:"Tiny", small:"Small", medium:"Medium",
                large:"Large", massive:"Massive", immense:"Immense", enormous:"Enormous", titanic:"Titanic"
            }
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find(".encounter-roll").click(() => this._rollEncounter(html));
        html.find(".encounter-reset").click(() => this._resetEncounter());
        html.find(".challenge-save").click(() => this._saveChallenge(html));
        html.find(".challenge-complexity").change(event => this._applyComplexity(html, event.currentTarget.value));
        html.find(".challenge-record").click(event => this._recordChallenge(html, event.currentTarget.dataset.result));
        html.find(".challenge-reset").click(() => this._resetChallenge());
        html.find(".quick-preview").click(() => this._previewQuickMonster(html));
        html.find(".quick-create").click(() => this._createQuickMonster(html));
        html.find(".access-level-control").on("change input", () => this._updateAccessLevel(html));
        html.find(".access-level-post").click(() => this._postAccessLevel(html));
        html.find(".item-power-settings-save").click(() => this._saveItemPowerSettings(html));
        this._updateAccessLevel(html);
    }

    async _updateObject() {
        // Buttons save their own focused state. Suppress FormApplication's
        // broad object update because this app is not backed by a Document.
    }

    _challengePanel(html) {
        return html.find(".skill-challenge-panel")[0];
    }

    _readChallenge(html) {
        const panel = this._challengePanel(html);
        const value = selector => panel?.querySelector(selector)?.value ?? "";
        const checked = selector => !!panel?.querySelector(selector)?.checked;
        return {
            name: value('[name="challenge.name"]') || DEFAULT_CHALLENGE.name,
            goal: value('[name="challenge.goal"]'),
            complexity: value('[name="challenge.complexity"]') || "simple",
            baseDT: Math.max(1, Number(value('[name="challenge.baseDT"]')) || 3),
            successes: Math.max(0, Number(value('[name="challenge.successes"]')) || 0),
            failures: Math.max(0, Number(value('[name="challenge.failures"]')) || 0),
            round: Math.max(1, Number(value('[name="challenge.round"]')) || 1),
            successTarget: Math.max(1, Number(value('[name="challenge.successTarget"]')) || 4),
            failureLimit: Math.max(1, Number(value('[name="challenge.failureLimit"]')) || 2),
            timeLimit: Math.max(0, Number(value('[name="challenge.timeLimit"]')) || 0),
            timeUnit: value('[name="challenge.timeUnit"]') || "rounds",
            escalating: checked('[name="challenge.escalating"]'),
            skills: value('[name="challenge.skills"]'),
            success: value('[name="challenge.success"]'),
            failure: value('[name="challenge.failure"]'),
            complications: value('[name="challenge.complications"]')
        };
    }

    _challengeStatus(challenge) {
        if (Number(challenge.successes) >= Number(challenge.successTarget)) return { key:"success", label:"Succeeded" };
        if (Number(challenge.failures) >= Number(challenge.failureLimit)) return { key:"failure", label:"Failed" };
        if (Number(challenge.timeLimit) > 0 && Number(challenge.round) > Number(challenge.timeLimit)) return { key:"failure", label:"Time Expired" };
        return { key:"active", label:"Active" };
    }

    async _saveChallenge(html, { notify = true } = {}) {
        const state = this._readChallenge(html);
        await game.settings.set("thefade", "skillChallengeState", state);
        if (notify) ui.notifications.info("Skill challenge saved.");
        this.render(false);
        return state;
    }

    _applyComplexity(html, key) {
        const preset = SKILL_CHALLENGE_COMPLEXITIES[key];
        if (!preset) return;
        const panel = this._challengePanel(html);
        panel.querySelector('[name="challenge.successTarget"]').value = preset.successes;
        panel.querySelector('[name="challenge.failureLimit"]').value = preset.failures;
        panel.querySelector('[name="challenge.timeLimit"]').value = preset.time;
    }

    async _recordChallenge(html, result) {
        const state = this._readChallenge(html);
        if (result === "success") state.successes += 1;
        else if (result === "majorSuccess") state.successes += 2;
        else if (result === "failure") state.failures += 1;
        else if (result === "round") state.round += 1;
        const status = this._challengeStatus(state);
        await game.settings.set("thefade", "skillChallengeState", state);
        await ChatMessage.create({
            content: `<div class="thefade challenge-chat"><h3>${escapeHTML(state.name)}</h3><p><strong>${escapeHTML(status.label)}</strong> - ${state.successes}/${state.successTarget} successes, ${state.failures}/${state.failureLimit} failures, ${escapeHTML(state.timeUnit)} ${state.round}/${state.timeLimit || "-"}.</p><p>Current DT: <strong>${state.baseDT + (state.escalating ? state.failures : 0)}</strong></p></div>`
        });
        this.render(false);
    }

    async _resetChallenge() {
        await game.settings.set("thefade", "skillChallengeState", clone(DEFAULT_CHALLENGE));
        this.render(false);
    }

    async _rollEncounter(html) {
        const panel = html.find(".encounter-panel")[0];
        const danger = panel.querySelector('[name="encounter.danger"]').value;
        const presetModifier = Number(panel.querySelector('[name="encounter.modifierPreset"]').value) || 0;
        const customModifier = Number(panel.querySelector('[name="encounter.customModifier"]').value) || 0;
        const modifier = presetModifier + customModifier;
        const dangerData = ENCOUNTER_DANGER_LEVELS[danger] ?? ENCOUNTER_DANGER_LEVELS.moderate;
        const state = foundry.utils.mergeObject(clone(DEFAULT_ENCOUNTER), clone(game.settings.get("thefade", "encounterState") || {}), { inplace: false });

        if (dangerData.threshold == null) {
            await ChatMessage.create({ content:`<div class="thefade encounter-chat"><h3>Encounter Die</h3><p><strong>${dangerData.label}:</strong> no encounter roll is required.</p></div>` });
            return;
        }

        const checkRoll = await new Roll("1d12").evaluate();
        const total = checkRoll.total + modifier;
        const triggered = total >= dangerData.threshold;
        let typeRoll = null;
        let type = null;
        const escalates = ["moderate", "high", "extreme"].includes(danger);
        if (triggered) {
            typeRoll = await new Roll("1d12").evaluate();
            type = encounterTypeFromRoll(typeRoll.total, escalates ? state.escalation : 0);
            if (escalates) state.escalation = type.key === "hostile" ? 0 : state.escalation + 1;
            await game.settings.set("thefade", "encounterState", state);
        }

        const modifierText = modifier ? ` ${modifier > 0 ? "+" : ""}${modifier}` : "";
        const resultHTML = triggered
            ? `<p class="encounter-triggered"><strong>Encounter triggered:</strong> ${escapeHTML(type.label)} (type roll ${typeRoll.total}). ${escapeHTML(type.description)}</p>`
            : `<p><strong>No encounter.</strong></p>`;
        await ChatMessage.create({
            content: `<div class="thefade encounter-chat"><h3>Encounter Die - ${escapeHTML(dangerData.label)}</h3><p>Check: <strong>${checkRoll.total}${modifierText} = ${total}</strong> vs. ${dangerData.threshold}+</p>${resultHTML}<p>Escalation: <strong>${state.escalation}</strong></p></div>`
        });
        this.render(false);
    }

    async _resetEncounter() {
        await game.settings.set("thefade", "encounterState", clone(DEFAULT_ENCOUNTER));
        this.render(false);
    }

    _readAccessLevel(html) {
        const panel = html.find(".unique-gear-panel")[0];
        const base = Number(panel?.querySelector('[name="access.base"]')?.value) || 2;
        const modifiers = [...(panel?.querySelectorAll('.access-modifier:checked') || [])].map(input => {
            const variable = input.closest(".access-modifier-row")?.querySelector(".access-modifier-variable");
            return variable ? Number(variable.value) || 0 : Number(input.dataset.value) || 0;
        });
        const custom = Number(panel?.querySelector('[name="access.custom"]')?.value) || 0;
        return { base, modifiers, custom, total: calculateAccessLevel(base, modifiers, custom) };
    }

    _updateAccessLevel(html) {
        const access = this._readAccessLevel(html);
        html.find(".access-level-result strong").text(access.total);
        html.find(".access-modifier-row").each((_, row) => {
            const checkbox = row.querySelector(".access-modifier");
            const variable = row.querySelector(".access-modifier-variable");
            if (variable) variable.disabled = !checkbox?.checked;
        });
        return access;
    }

    async _postAccessLevel(html) {
        const access = this._updateAccessLevel(html);
        const itemName = html.find('[name="access.itemName"]').val() || "Unique Gear";
        await ChatMessage.create({
            content: `<div class="thefade access-level-chat"><h3>${escapeHTML(itemName)}</h3><p>Final Access Level: <strong>${access.total}</strong> (base ${access.base}, modifiers ${access.modifiers.reduce((sum, value) => sum + value, 0) + access.custom >= 0 ? "+" : ""}${access.modifiers.reduce((sum, value) => sum + value, 0) + access.custom}).</p><p>The GM chooses the skill appropriate to the acquisition attempt.</p></div>`
        });
    }

    async _saveItemPowerSettings(html) {
        if (!game.user?.isGM) return ui.notifications.warn("Only a GM can change world rules.");
        const panel = html.find(".item-power-rules-panel")[0];
        const slotRule = panel?.querySelector('[name="itemPower.slotRule"]')?.value || "standard";
        const attunementRule = panel?.querySelector('[name="itemPower.attunementRule"]')?.value || "standard";
        await game.settings.set("thefade", "itemPowerSlotRule", slotRule);
        await game.settings.set("thefade", "itemPowerAttunementRule", attunementRule);
        ui.notifications.info("Item of Power world rules updated.");
        this.render(false);
    }

    _readQuickMonster(html) {
        const panel = html.find(".quick-monster-panel")[0];
        const value = name => panel.querySelector(`[name="quick.${name}"]`)?.value;
        return {
            name: value("name") || "Quick Monster",
            el: value("el"),
            attackTier: value("attackTier"),
            defenseTier: value("defenseTier"),
            size: value("size"),
            role: value("role"),
            armor: value("armor"),
            damageType: value("damageType") || "B"
        };
    }

    _previewQuickMonster(html) {
        const options = this._readQuickMonster(html);
        const stats = buildQuickMonsterStats(options);
        html.find(".quick-results").html(`
            <div><strong>${escapeHTML(options.name)}</strong> (EL ${stats.el})</div>
            <div>${stats.attackDice}D attack - Defense ${stats.defense} - HP ${stats.hp} - AP ${stats.ap} - Damage ${stats.damage}</div>
        `);
    }

    async _createQuickMonster(html) {
        if (!game.user?.isGM) return ui.notifications.warn("Only a GM can create NPCs.");
        const options = this._readQuickMonster(html);
        const stats = buildQuickMonsterStats(options);
        const attributeValue = Math.max(2, stats.defense * 2);
        const actor = await Actor.create({
            name: options.name,
            type: "npc",
            img: "icons/svg/mystery-man.svg",
            system: {
                hp: { value:stats.hp, max:stats.hp },
                attributes: {
                    physique:{ value:attributeValue }, finesse:{ value:attributeValue }, mind:{ value:attributeValue },
                    presence:{ value:attributeValue }, soul:{ value:attributeValue }
                },
                size:stats.size,
                notes:`Quick Monster (EL ${stats.el}, ${stats.role}). Attack ${stats.attackDice}D; Defense ${stats.defense}; HP ${stats.hp}; AP ${stats.ap}; Damage ${stats.damage}.`
            },
            flags: { thefade:{ quickMonster:stats } }
        });
        const items = [{
            name:"Primary Attack", type:"weapon", img:"icons/svg/claw.svg",
            system:{ damage:stats.damage, damageType:options.damageType, critical:4, handedness:"Natural Weapon", range:"Melee", integrity:10, qualities:"Quick Monster", qualityIds:[], skill:"Unarmed", attribute:"physique", miscBonus:stats.attackDice - stats.defense, equipped:true, weight:0, price:0, quantity:1 }
        }];
        if (stats.ap > 0) {
            items.push({ name:"Quick Protection", type:"armor", img:"icons/svg/shield.svg", system:{ ap:stats.ap, currentAP:stats.ap, location:"Body", equipped:true, weight:0, price:0, quantity:1 } });
        }
        await actor.createEmbeddedDocuments("Item", items);
        ui.notifications.info(`Created ${actor.name}.`);
        actor.sheet.render(true);
    }

}

let gmToolkit = null;

export function openGMToolkit() {
    if (!gmToolkit) gmToolkit = new TheFadeGMToolkit();
    gmToolkit.render(true);
    return gmToolkit;
}

export function getDefaultSkillChallengeState() {
    return clone(DEFAULT_CHALLENGE);
}

export function getDefaultEncounterState() {
    return clone(DEFAULT_ENCOUNTER);
}
