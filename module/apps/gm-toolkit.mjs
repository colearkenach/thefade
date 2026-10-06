// GM Toolkit: the Encounter Die, skill challenges, quick monster creation,
// Unique Gear access levels, and Item of Power world rules.
//   Skill challenges: Bestiary of Morta IV, pp. 330-334.
//   Encounter Die:    Bestiary of Morta IV, pp. 335-339.
// The skill challenge and encounter escalation persist in the world settings
// `thefade.skillChallengeState` and `thefade.encounterState`; the other tools
// keep working values on the single toolkit instance for the session.
import {
    buildQuickMonsterStats, ENCOUNTER_DANGER_LEVELS, ENCOUNTER_MODIFIERS, encounterTypeFromRoll,
    QUICK_MONSTER_OPTIONS, RULE_SOURCES, SKILL_CHALLENGE_COMPLEXITIES
} from "../rules/rules.js";
import {
    ACCESS_LEVEL_MODIFIERS, ACCESS_LEVEL_RANKS, ACCESS_LEVEL_SKILLS, AVERAGE_GEAR_ACCESS_LEVELS, calculateAccessLevel
} from "../rules/gear-rules.js";
import {
    DARK_MAGIC_ITEM_NAMES, ITEM_POWER_ATTUNEMENT_RULES, ITEM_POWER_SLOT_RULES, getItemPowerSlotDefinitions
} from "../rules/item-power-rules.js";
import { getDefaultEncounterState, getDefaultSkillChallengeState } from "./gm-toolkit-state.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { escapeHTML } = foundry.utils;

const SYSTEM = "thefade";
const TEMPLATES = "systems/thefade/templates/apps/gm-toolkit";
const ATTRIBUTES = ["physique", "finesse", "mind", "presence", "soul"];
const TIME_UNITS = ["rounds", "minutes", "hours"];

/** Danger levels at which a non-hostile encounter raises the escalation. */
const ESCALATING_DANGERS = new Set(["moderate", "high", "extreme"]);

/** Encounter size guidance rows (THEFADE.GMToolkit.encounter.size.<key>). */
const ENCOUNTER_SIZE_ROWS = ["muchWeaker", "weaker", "even", "stronger", "muchStronger"];

/** Damage types offered for a quick monster's natural attack. */
const QUICK_DAMAGE_TYPES = ["B", "S", "P", "F", "C", "E", "A", "Ut"];

/** Skill challenge fields that change the status display when edited. */
const CHALLENGE_DISPLAY_KEYS = ["complexity", "baseDT", "successes", "failures", "round", "successTarget",
    "failureLimit", "timeLimit", "timeUnit", "escalating"];

/** What each "record" button adds to the skill challenge. */
const CHALLENGE_RESULTS = {
    success: { successes: 1 },
    majorSuccess: { successes: 2 },
    failure: { failures: 1 },
    time: { round: 1 }
};

/** Dark Magic Item value bands, in Corruption Value order (1-4). */
const CORRUPTION_BANDS = ["minor", "moderate", "major", "legendary"];

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** Signed number with a true minus sign: +2, −1, 0. */
function signed(value) {
    const n = Number(value) || 0;
    return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

/** Whole number from a form value, or `fallback` when blank or invalid. */
function toInt(value, fallback, min = -Infinity) {
    if (value === null || value === undefined || value === "") return fallback;
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? Math.max(min, n) : fallback;
}

/** Clean a (possibly partial or legacy) skill challenge record. */
function sanitizeChallenge(data) {
    const defaults = getDefaultSkillChallengeState();
    const text = value => String(value ?? "");
    return {
        name: text(data.name).trim() || defaults.name,
        goal: text(data.goal),
        complexity: data.complexity in SKILL_CHALLENGE_COMPLEXITIES ? data.complexity : defaults.complexity,
        baseDT: toInt(data.baseDT, defaults.baseDT, 1),
        successes: toInt(data.successes, 0, 0),
        failures: toInt(data.failures, 0, 0),
        round: toInt(data.round, 1, 1),
        successTarget: toInt(data.successTarget, defaults.successTarget, 1),
        failureLimit: toInt(data.failureLimit, defaults.failureLimit, 1),
        timeLimit: toInt(data.timeLimit, 0, 0),
        timeUnit: TIME_UNITS.includes(data.timeUnit) ? data.timeUnit : defaults.timeUnit,
        escalating: !!data.escalating,
        skills: text(data.skills),
        success: text(data.success),
        failure: text(data.failure),
        complications: text(data.complications)
    };
}

/** "active", "success", "failure", or "expired". */
function challengeStatus(challenge) {
    if (challenge.successes >= challenge.successTarget) return "success";
    if (challenge.failures >= challenge.failureLimit) return "failure";
    if (challenge.timeLimit > 0 && challenge.round > challenge.timeLimit) return "expired";
    return "active";
}

/** Escalating challenges add each failure to the base DT. */
function effectiveDT(challenge) {
    return challenge.baseDT + (challenge.escalating ? challenge.failures : 0);
}

/** Localized time progress, e.g. "2 / 6 rounds". */
function timeLabel(challenge) {
    const unit = game.i18n.localize(`THEFADE.GMToolkit.challenge.unitLower.${challenge.timeUnit}`);
    return challenge.timeLimit > 0
        ? game.i18n.format("THEFADE.GMToolkit.challenge.timeOf", { round: challenge.round, limit: challenge.timeLimit, unit })
        : game.i18n.format("THEFADE.GMToolkit.challenge.timeOpen", { round: challenge.round, unit });
}

/** Group the d12 faces of the encounter type table into ranges for a given escalation. */
function encounterTypeRows(escalation) {
    const rows = [];
    for (let face = 1; face <= 12; face++) {
        const type = encounterTypeFromRoll(face, escalation);
        const last = rows.at(-1);
        if (last?.key === type.key) last.max = face;
        else rows.push({ key: type.key, label: type.label, description: type.description, min: face, max: face });
    }
    return rows.map(row => ({ ...row, range: row.min === row.max ? String(row.min) : `${row.min}–${row.max}` }));
}

/** Registered choices for a world setting, falling back to the rules table. */
function settingChoices(key, fallback) {
    return game.settings.settings.get(`${SYSTEM}.${key}`)?.choices ?? fallback;
}

/**
 * Post a toolkit chat card, honouring the chat roll-mode selector.
 * `title`, `subtitle`, and `body` must already be escaped.
 */
async function postCard({ cssClass, title, subtitle = "", body = "", rolls = [] }) {
    const content = `<div class="thefade chat-card gm-toolkit-card ${cssClass}">`
        + `<header class="tf-card-header"><div class="tf-card-title"><h3>${title}</h3>`
        + (subtitle ? `<span class="tf-card-subtitle">${subtitle}</span>` : "")
        + `</div></header>${body}</div>`;
    const data = { content, rolls };
    if (rolls.length) data.sound = CONFIG.sounds.dice;
    ChatMessage.applyRollMode(data, game.settings.get("core", "rollMode"));
    return ChatMessage.implementation.create(data);
}

/** Card body: an outcome line plus a list of notes (all pre-escaped). */
function cardBody(outcome, notes = [], extra = "") {
    const line = outcome ? `<div class="tf-result-line"><span class="tf-outcome ${outcome.key}">${outcome.label}</span>${extra}</div>` : "";
    const list = notes.length ? `<ul class="tf-notes">${notes.map(note => `<li>${note}</li>`).join("")}</ul>` : "";
    return line + list;
}

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

export default class GMToolkit extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "thefade-gm-toolkit",
        tag: "form",
        classes: ["thefade", "gm-toolkit"],
        window: { title: "THEFADE.GMToolkit.title", icon: "fa-solid fa-toolbox", resizable: true },
        position: { width: 820, height: 720 },
        form: { handler: GMToolkit.#onSubmitForm, submitOnChange: true, closeOnSubmit: false },
        actions: {
            rollEncounter: GMToolkit.#onRollEncounter,
            resetEscalation: GMToolkit.#onResetEscalation,
            recordChallenge: GMToolkit.#onRecordChallenge,
            resetChallenge: GMToolkit.#onResetChallenge,
            createMonster: GMToolkit.#onCreateMonster,
            postAccessLevel: GMToolkit.#onPostAccessLevel,
            saveItemPowerRules: GMToolkit.#onSaveItemPowerRules
        }
    };

    static PARTS = {
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        encounter: { template: `${TEMPLATES}/encounter.hbs`, scrollable: [""] },
        challenge: { template: `${TEMPLATES}/challenge.hbs`, scrollable: [""] },
        monster: { template: `${TEMPLATES}/monster.hbs`, scrollable: [""] },
        gear: { template: `${TEMPLATES}/gear.hbs`, scrollable: [""] },
        power: { template: `${TEMPLATES}/power.hbs`, scrollable: [""] }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "encounter", icon: "fa-solid fa-dice-d12" },
                { id: "challenge", icon: "fa-solid fa-list-check" },
                { id: "monster", icon: "fa-solid fa-dragon" },
                { id: "gear", icon: "fa-solid fa-shield-halved" },
                { id: "power", icon: "fa-solid fa-gem" }
            ],
            initial: "encounter",
            labelPrefix: "THEFADE.GMToolkit.tab"
        }
    };

    /** Working values for the tools that are not persisted to world settings. */
    #draft = {
        encounter: { danger: "moderate", modifier: "", custom: 0 },
        monster: {
            name: "", el: 5, size: "medium", attackTier: "competent", defenseTier: "average",
            role: "standard", armor: "unarmored", damageType: "B"
        },
        access: { itemName: "", base: 2, custom: 0, modifiers: {}, variable: {} },
        power: null
    };

    /** The stored skill challenge, completed with defaults. */
    get challenge() {
        const stored = game.settings.get(SYSTEM, "skillChallengeState") ?? {};
        return sanitizeChallenge({ ...getDefaultSkillChallengeState(), ...stored });
    }

    /** The stored encounter state, completed with defaults. */
    get encounterState() {
        const stored = game.settings.get(SYSTEM, "encounterState") ?? {};
        return { ...getDefaultEncounterState(), ...stored, escalation: toInt(stored.escalation, 0, 0) };
    }

    /** @override */
    _canRender(options) {
        if (!game.user.isGM) throw new Error(game.i18n.localize("THEFADE.GMToolkit.gmOnly"));
        return super._canRender(options);
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.sources = RULE_SOURCES;
        return context;
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (context.tabs?.[partId]) context.tab = context.tabs[partId];
        switch (partId) {
            case "encounter": context.encounter = this.#prepareEncounter(); break;
            case "challenge": context.challenge = this.#prepareChallenge(); break;
            case "monster": context.monster = this.#prepareMonster(); break;
            case "gear": context.access = this.#prepareAccess(); break;
            case "power": context.power = this.#preparePower(); break;
        }
        return context;
    }

    #prepareEncounter() {
        const draft = this.#draft.encounter;
        const level = ENCOUNTER_DANGER_LEVELS[draft.danger] ?? ENCOUNTER_DANGER_LEVELS.moderate;
        const escalates = ESCALATING_DANGERS.has(draft.danger);
        const { escalation } = this.encounterState;
        const modifier = this.#encounterModifier();
        const formula = modifier ? `1d12 ${signed(modifier)}` : "1d12";
        const dangerOptions = Object.fromEntries(Object.entries(ENCOUNTER_DANGER_LEVELS).map(([key, entry]) => {
            const label = game.i18n.localize(entry.label);
            return [key, entry.threshold == null
                ? game.i18n.format("THEFADE.GMToolkit.encounter.dangerSafe", { label })
                : game.i18n.format("THEFADE.GMToolkit.encounter.dangerOption", { label, threshold: entry.threshold })];
        }));
        return {
            danger: draft.danger,
            modifier: draft.modifier,
            custom: draft.custom,
            dangerOptions,
            modifierOptions: ENCOUNTER_MODIFIERS.map((entry, index) => ({
                value: String(index),
                label: `${game.i18n.localize(entry.label)} (${signed(entry.value)})`
            })),
            example: level.example,
            canRoll: level.threshold != null,
            triggerHint: level.threshold == null
                ? game.i18n.localize("THEFADE.GMToolkit.encounter.noRollHint")
                : game.i18n.format("THEFADE.GMToolkit.encounter.triggerHint", { threshold: level.threshold, formula }),
            escalation,
            escalates,
            typeRows: encounterTypeRows(escalates ? escalation : 0),
            sizeRows: ENCOUNTER_SIZE_ROWS.map(key => ({
                el: `THEFADE.GMToolkit.encounter.size.${key}.el`,
                count: `THEFADE.GMToolkit.encounter.size.${key}.count`
            })),
        };
    }

    #prepareChallenge() {
        const challenge = this.challenge;
        const status = challengeStatus(challenge);
        return {
            ...challenge,
            status: { key: status, label: game.i18n.localize(`THEFADE.GMToolkit.challenge.status.${status}`) },
            effectiveDT: effectiveDT(challenge),
            timeLabel: timeLabel(challenge),
            complexityOptions: Object.fromEntries(Object.entries(SKILL_CHALLENGE_COMPLEXITIES).map(([key, entry]) => [key, entry.label])),
            unitOptions: Object.fromEntries(TIME_UNITS.map(unit => [unit, `THEFADE.GMToolkit.challenge.unit.${unit}`])),
        };
    }

    #prepareMonster() {
        const draft = this.#draft.monster;
        const stats = buildQuickMonsterStats(draft);
        return {
            ...draft,
            stats,
            attribute: Math.max(2, stats.defense * 2),
            sizeOptions: CONFIG.THEFADE.sizes,
            attackOptions: QUICK_MONSTER_OPTIONS.attack,
            defenseOptions: QUICK_MONSTER_OPTIONS.defense,
            roleOptions: QUICK_MONSTER_OPTIONS.role,
            armorOptions: QUICK_MONSTER_OPTIONS.armor,
            damageTypeOptions: Object.fromEntries(QUICK_DAMAGE_TYPES.map(code => [code, CONFIG.THEFADE.damageTypes?.[code] ?? code]))
        };
    }

    #prepareAccess() {
        const draft = this.#draft.access;
        const rows = ACCESS_LEVEL_MODIFIERS.map(entry => {
            const checked = !!draft.modifiers[entry.key];
            const value = entry.variable ? toInt(draft.variable[entry.key], entry.value) : entry.value;
            return {
                key: entry.key,
                label: entry.label,
                checked,
                value,
                variable: !!entry.variable,
                display: entry.variable ? entry.variable : signed(entry.value)
            };
        });
        const applied = rows.filter(row => row.checked);
        return {
            itemName: draft.itemName,
            base: draft.base,
            custom: draft.custom,
            rows,
            applied,
            total: calculateAccessLevel(draft.base, applied.map(row => row.value), draft.custom),
            baseOptions: ACCESS_LEVEL_RANKS.map(rank => ({ value: String(rank.value), label: `${game.i18n.localize(rank.label)} (${rank.value})` })),
            variableOptions: { "-1": "−1", "-2": "−2", "-3": "−3" },
            ranks: ACCESS_LEVEL_RANKS,
            average: AVERAGE_GEAR_ACCESS_LEVELS,
            skills: ACCESS_LEVEL_SKILLS
        };
    }

    #preparePower() {
        const slotChoices = settingChoices("itemPowerSlotRule", ITEM_POWER_SLOT_RULES);
        const attunementChoices = settingChoices("itemPowerAttunementRule", ITEM_POWER_ATTUNEMENT_RULES);
        const saved = {
            slotRule: game.settings.get(SYSTEM, "itemPowerSlotRule"),
            attunementRule: game.settings.get(SYSTEM, "itemPowerAttunementRule")
        };
        const current = { ...saved, ...this.#draft.power };
        return {
            ...current,
            slotChoices,
            attunementChoices,
            dirty: current.slotRule !== saved.slotRule || current.attunementRule !== saved.attunementRule,
            alternateSlots: getItemPowerSlotDefinitions("alternate").map(slot => ({
                ...slot,
                newSlot: slot.tableLabel || slot.label,
                maximum: slot.capacity ? game.i18n.format("THEFADE.GMToolkit.power.maximum", { count: slot.capacity }) : ""
            })),
            darkMagicItems: DARK_MAGIC_ITEM_NAMES.join(", "),
            corruptionRows: CORRUPTION_BANDS.map((key, index) => ({ label: `THEFADE.GMToolkit.power.corruption.${key}`, value: index + 1 }))
        };
    }

    /** Total situational modifier for the encounter check. */
    #encounterModifier() {
        const { modifier, custom } = this.#draft.encounter;
        const preset = modifier === "" ? 0 : (ENCOUNTER_MODIFIERS[Number(modifier)]?.value ?? 0);
        return preset + custom;
    }

    /* -------------------------------------------- */
    /*  Form handling                               */
    /* -------------------------------------------- */

    /**
     * Fold submitted form values into the toolkit state. The skill challenge is
     * saved to its world setting; the other tools update their working values.
     * @param {object} data   Expanded form data
     * @returns {Promise<Set<string>>}   Parts whose display changed
     */
    async #processForm(data) {
        const parts = new Set();

        // Skill challenge (persisted). Save before any other await so that
        // requests reach the server in the order the GM made them.
        if (data.challenge) {
            const raw = data.challenge;
            const current = this.challenge;
            const next = sanitizeChallenge({ ...current, ...raw });
            if (next.complexity !== current.complexity) {
                const preset = SKILL_CHALLENGE_COMPLEXITIES[next.complexity];
                const values = { successTarget: preset.successes, failureLimit: preset.failures, timeLimit: preset.time };
                Object.assign(next, values);
                // Keep the visible inputs in step until the re-render lands.
                for (const [key, value] of Object.entries(values)) {
                    const input = this.form?.elements.namedItem(`challenge.${key}`);
                    if (input) input.value = value;
                }
            }
            const changed = !foundry.utils.objectsEqual(next, current);
            const save = changed ? game.settings.set(SYSTEM, "skillChallengeState", next) : null;
            if (CHALLENGE_DISPLAY_KEYS.some(key => (next[key] !== current[key]) || ((key in raw) && (raw[key] !== next[key])))) {
                parts.add("challenge");
            }
            await save;
        }

        if (data.encounter) {
            const raw = data.encounter;
            const prev = this.#draft.encounter;
            const modifier = (raw.modifier === null || raw.modifier === undefined) ? "" : String(raw.modifier);
            const next = {
                danger: raw.danger in ENCOUNTER_DANGER_LEVELS ? raw.danger : prev.danger,
                modifier: modifier === "" || ENCOUNTER_MODIFIERS[Number(modifier)] ? modifier : "",
                custom: toInt(raw.custom, 0)
            };
            this.#draft.encounter = next;
            if (!foundry.utils.objectsEqual(prev, next) || raw.custom !== next.custom) parts.add("encounter");
        }

        if (data.monster) {
            const raw = data.monster;
            const prev = this.#draft.monster;
            const pick = (value, table, fallback) => (value in table ? value : fallback);
            const next = {
                name: String(raw.name ?? ""),
                el: toInt(raw.el, prev.el, 1),
                size: pick(raw.size, CONFIG.THEFADE.sizes, prev.size),
                attackTier: pick(raw.attackTier, QUICK_MONSTER_OPTIONS.attack, prev.attackTier),
                defenseTier: pick(raw.defenseTier, QUICK_MONSTER_OPTIONS.defense, prev.defenseTier),
                role: pick(raw.role, QUICK_MONSTER_OPTIONS.role, prev.role),
                armor: pick(raw.armor, QUICK_MONSTER_OPTIONS.armor, prev.armor),
                damageType: QUICK_DAMAGE_TYPES.includes(raw.damageType) ? raw.damageType : prev.damageType
            };
            this.#draft.monster = next;
            const statsChanged = Object.keys(next).some(key => key !== "name" && next[key] !== prev[key]);
            if (statsChanged || raw.el !== next.el) parts.add("monster");
        }

        if (data.access) {
            const raw = data.access;
            const prev = this.#draft.access;
            const variable = { ...prev.variable };
            for (const [key, value] of Object.entries(raw.variable ?? {})) variable[key] = toInt(value, -1, -3);
            const next = {
                itemName: String(raw.itemName ?? ""),
                base: ACCESS_LEVEL_RANKS.some(rank => rank.value === Number(raw.base)) ? Number(raw.base) : prev.base,
                custom: toInt(raw.custom, 0),
                modifiers: Object.fromEntries(ACCESS_LEVEL_MODIFIERS.map(entry => [entry.key, !!raw.modifiers?.[entry.key]])),
                variable
            };
            this.#draft.access = next;
            const { itemName: _a, ...prevValues } = prev;
            const { itemName: _b, ...nextValues } = next;
            if (!foundry.utils.objectsEqual(prevValues, nextValues) || raw.custom !== next.custom) parts.add("gear");
        }

        if (data.itemPower) {
            const raw = data.itemPower;
            this.#draft.power = {
                slotRule: raw.slotRule in settingChoices("itemPowerSlotRule", ITEM_POWER_SLOT_RULES)
                    ? raw.slotRule : game.settings.get(SYSTEM, "itemPowerSlotRule"),
                attunementRule: raw.attunementRule in settingChoices("itemPowerAttunementRule", ITEM_POWER_ATTUNEMENT_RULES)
                    ? raw.attunementRule : game.settings.get(SYSTEM, "itemPowerAttunementRule")
            };
            parts.add("power");
        }

        return parts;
    }

    /** Read the live form into the toolkit state (used before acting on a button). */
    async #commitForm() {
        if (!this.form) return new Set();
        const formData = new foundry.applications.ux.FormDataExtended(this.form);
        return this.#processForm(foundry.utils.expandObject(formData.object));
    }

    /**
     * Form change/submit handler.
     * @this {GMToolkit}
     */
    static async #onSubmitForm(event, form, formData) {
        if (!game.user.isGM) return;
        const parts = await this.#processForm(foundry.utils.expandObject(formData.object));
        if (parts.size) this.render({ parts: [...parts] });
    }

    /* -------------------------------------------- */
    /*  Encounter Die                               */
    /* -------------------------------------------- */

    /** @this {GMToolkit} */
    static async #onRollEncounter(event, target) {
        if (!game.user.isGM) return;
        target.disabled = true;
        let parts = new Set();
        try {
            parts = await this.#commitForm();
            await this.#rollEncounter();
        } finally {
            this.render({ parts: [...parts, "encounter"] });
        }
    }

    /** Roll the encounter check (1d12 + modifiers vs. the danger threshold), then the type die. */
    async #rollEncounter() {
        const { danger } = this.#draft.encounter;
        const level = ENCOUNTER_DANGER_LEVELS[danger] ?? ENCOUNTER_DANGER_LEVELS.moderate;
        if (level.threshold == null) return; // Safe areas need no roll.
        const dangerLabel = escapeHTML(game.i18n.localize(level.label));
        const title = game.i18n.format("THEFADE.GMToolkit.encounter.chat.title", { danger: dangerLabel });

        const modifier = this.#encounterModifier();
        const check = await new Roll("1d12").evaluate();
        const total = check.total + modifier;
        const rolls = [check];
        const state = this.encounterState;
        const notes = [game.i18n.format("THEFADE.GMToolkit.encounter.chat.check", {
            roll: modifier ? `${check.total} ${signed(modifier)}` : check.total, total, threshold: level.threshold
        })];

        let outcome = { key: "none", label: game.i18n.localize("THEFADE.GMToolkit.encounter.chat.none") };
        if (total >= level.threshold) {
            const escalates = ESCALATING_DANGERS.has(danger);
            const typeRoll = await new Roll("1d12").evaluate();
            const type = encounterTypeFromRoll(typeRoll.total, escalates ? state.escalation : 0);
            rolls.push(typeRoll);
            outcome = { key: type.key, label: escapeHTML(game.i18n.localize(type.label)) };
            notes.push(
                game.i18n.format("THEFADE.GMToolkit.encounter.chat.typeRoll", { roll: typeRoll.total }),
                escapeHTML(game.i18n.localize(type.description))
            );
            if (escalates) {
                state.escalation = type.key === "hostile" ? 0 : state.escalation + 1;
                await game.settings.set(SYSTEM, "encounterState", state);
            }
        }
        notes.push(game.i18n.format("THEFADE.GMToolkit.encounter.chat.escalation", { value: state.escalation }));
        await postCard({ cssClass: "encounter-card", title, body: cardBody(outcome, notes), rolls });
    }

    /** @this {GMToolkit} */
    static async #onResetEscalation() {
        if (!game.user.isGM) return;
        await game.settings.set(SYSTEM, "encounterState", { ...this.encounterState, escalation: 0 });
        this.render({ parts: ["encounter"] });
    }

    /* -------------------------------------------- */
    /*  Skill Challenge                             */
    /* -------------------------------------------- */

    /** @this {GMToolkit} */
    static async #onRecordChallenge(event, target) {
        if (!game.user.isGM) return;
        const result = target.dataset.result;
        const delta = CHALLENGE_RESULTS[result];
        if (!delta) return;
        await this.#commitForm();
        const challenge = this.challenge;
        for (const [key, amount] of Object.entries(delta)) challenge[key] += amount;
        await game.settings.set(SYSTEM, "skillChallengeState", challenge);
        this.render({ parts: ["challenge"] });

        const status = challengeStatus(challenge);
        const outcome = { key: status, label: game.i18n.localize(`THEFADE.GMToolkit.challenge.status.${status}`) };
        const dt = `<span class="tf-vs">${game.i18n.format("THEFADE.GMToolkit.challenge.currentDT", { dt: effectiveDT(challenge) })}</span>`;
        const notes = [
            game.i18n.format("THEFADE.GMToolkit.challenge.successesOf", { value: challenge.successes, target: challenge.successTarget }),
            game.i18n.format("THEFADE.GMToolkit.challenge.failuresOf", { value: challenge.failures, limit: challenge.failureLimit }),
            game.i18n.format("THEFADE.GMToolkit.challenge.timeNote", { time: timeLabel(challenge) })
        ];
        await postCard({
            cssClass: "challenge-card",
            title: escapeHTML(challenge.name),
            subtitle: game.i18n.localize(`THEFADE.GMToolkit.challenge.record.${result}`),
            body: cardBody(outcome, notes, dt)
        });
    }

    /** @this {GMToolkit} */
    static async #onResetChallenge() {
        if (!game.user.isGM) return;
        const confirmed = await DialogV2.confirm({
            window: { title: "THEFADE.GMToolkit.challenge.reset" },
            classes: ["thefade"],
            content: `<p>${game.i18n.localize("THEFADE.GMToolkit.challenge.resetConfirm")}</p>`,
            rejectClose: false
        });
        if (!confirmed) return;
        await game.settings.set(SYSTEM, "skillChallengeState", getDefaultSkillChallengeState());
        this.render({ parts: ["challenge"] });
    }

    /* -------------------------------------------- */
    /*  Quick Monster                               */
    /* -------------------------------------------- */

    /** @this {GMToolkit} */
    static async #onCreateMonster(event, target) {
        if (!game.user.isGM) return ui.notifications.warn("THEFADE.GMToolkit.gmOnly", { localize: true });
        target.disabled = true;
        try {
            const parts = await this.#commitForm();
            if (parts.size) this.render({ parts: [...parts] });
            const actor = await this.#createMonster();
            if (actor) {
                ui.notifications.info("THEFADE.GMToolkit.monster.created", { format: { name: actor.name } });
                actor.sheet?.render({ force: true });
            }
        } finally {
            target.disabled = false;
        }
    }

    /** Create an NPC whose derived statistics match the quick monster profile. */
    async #createMonster() {
        const draft = this.#draft.monster;
        const stats = buildQuickMonsterStats(draft);
        const name = draft.name.trim() || game.i18n.localize("THEFADE.GMToolkit.monster.defaultName");

        // Attributes at 2 × Defense give Resilience, Avoid, and Grit equal to
        // Defense, and an untrained Unarmed pool equal to Defense; the weapon's
        // misc bonus tops the pool up to the profile's attack dice.
        const attribute = Math.max(2, stats.defense * 2);
        const notes = game.i18n.format("THEFADE.GMToolkit.monster.notes", {
            el: stats.el, role: game.i18n.localize(QUICK_MONSTER_OPTIONS.role[stats.role]),
            attack: stats.attackDice, defense: stats.defense, hp: stats.hp, ap: stats.ap, damage: stats.damage
        });

        const items = [{
            name: game.i18n.localize("THEFADE.GMToolkit.monster.attackName"),
            type: "weapon",
            img: "icons/creatures/claws/claw-curved-jagged-gray.webp",
            system: {
                damageComponents: [{ id: foundry.utils.randomID(16), amount: stats.damage, type: draft.damageType }],
                critical: 4, handedness: "Natural Weapon", range: "Melee", integrity: 10,
                skill: "Unarmed", attribute: "physique", miscBonus: stats.attackDice - stats.defense,
                equipped: true, weight: 0, price: 0, quantity: 1
            }
        }];
        if (stats.ap > 0) {
            items.push({
                name: game.i18n.localize("THEFADE.GMToolkit.monster.armorName"),
                type: "armor",
                img: "icons/svg/shield.svg",
                system: { ap: stats.ap, currentAP: stats.ap, location: "Body", equipped: true, weight: 0, price: 0, quantity: 1 }
            });
        }

        return Actor.implementation.create({
            name,
            type: "npc",
            img: "icons/svg/mystery-man.svg",
            system: {
                attributes: Object.fromEntries(ATTRIBUTES.map(key => [key, { value: attribute }])),
                // Max HP is derived (species + paths + Physique + misc); the misc bonus makes it hit the target.
                hp: { value: stats.hp },
                hpMiscBonus: stats.hp - attribute,
                species: { size: stats.size },
                notes: `<p>${escapeHTML(notes)}</p>`
            },
            items,
            flags: { [SYSTEM]: { quickMonster: stats } }
        });
    }

    /* -------------------------------------------- */
    /*  Unique Gear                                 */
    /* -------------------------------------------- */

    /** @this {GMToolkit} */
    static async #onPostAccessLevel() {
        if (!game.user.isGM) return;
        const parts = await this.#commitForm();
        if (parts.size) this.render({ parts: [...parts] });
        const access = this.#prepareAccess();
        const name = access.itemName.trim() || game.i18n.localize("THEFADE.GMToolkit.gear.defaultItem");
        const adjustment = access.applied.reduce((sum, row) => sum + row.value, 0) + access.custom;
        const outcome = { key: "access-level", label: game.i18n.format("THEFADE.GMToolkit.gear.chat.total", { total: access.total }) };
        const notes = [
            game.i18n.format("THEFADE.GMToolkit.gear.chat.breakdown", { base: access.base, modifier: signed(adjustment) }),
            ...access.applied.map(row => `${escapeHTML(game.i18n.localize(row.label))} (${signed(row.value)})`),
            ...(access.custom ? [game.i18n.format("THEFADE.GMToolkit.gear.chat.other", { modifier: signed(access.custom) })] : []),
            ...(access.total >= 12 ? [game.i18n.localize("THEFADE.GMToolkit.gear.chat.unbuyable")] : []),
            game.i18n.localize("THEFADE.GMToolkit.gear.chat.skill")
        ];
        await postCard({
            cssClass: "access-level-card",
            title: escapeHTML(name),
            subtitle: game.i18n.localize("THEFADE.GMToolkit.gear.chat.subtitle"),
            body: cardBody(outcome, notes)
        });
    }

    /* -------------------------------------------- */
    /*  Items of Power                              */
    /* -------------------------------------------- */

    /** @this {GMToolkit} */
    static async #onSaveItemPowerRules() {
        if (!game.user.isGM) return ui.notifications.warn("THEFADE.GMToolkit.gmOnly", { localize: true });
        await this.#commitForm();
        const { slotRule, attunementRule } = this.#preparePower();
        if (slotRule !== game.settings.get(SYSTEM, "itemPowerSlotRule")) await game.settings.set(SYSTEM, "itemPowerSlotRule", slotRule);
        if (attunementRule !== game.settings.get(SYSTEM, "itemPowerAttunementRule")) await game.settings.set(SYSTEM, "itemPowerAttunementRule", attunementRule);
        this.#draft.power = null;
        ui.notifications.info("THEFADE.GMToolkit.power.saved", { localize: true });
        this.render({ parts: ["power"] });
    }
}

/* -------------------------------------------- */
/*  Single instance                             */
/* -------------------------------------------- */

/** @type {GMToolkit|null} */
let instance = null;

/**
 * Open the GM Toolkit, reusing (and focusing) the existing window.
 * @returns {GMToolkit|null}
 */
export function openGMToolkit() {
    if (!game.user.isGM) {
        ui.notifications.warn("THEFADE.GMToolkit.gmOnly", { localize: true });
        return null;
    }
    instance ??= new GMToolkit();
    if (instance.rendered) {
        if (instance.minimized) instance.maximize();
        instance.bringToFront();
    }
    else instance.render({ force: true });
    return instance;
}

/**
 * Re-render toolkit parts after a world setting changed. Intended for a
 * setting's `onChange(value, options, userId)`: changes made by this user are
 * skipped, because the toolkit already re-renders after its own saves.
 * @param {string|string[]} parts   Part ids ("encounter", "challenge", "power", ...)
 * @param {string} [userId]         The user who changed the setting
 */
export function refreshGMToolkit(parts, userId) {
    if (!instance?.rendered || (userId && userId === game.user.id)) return;
    instance.render({ parts: [parts].flat() });
}
