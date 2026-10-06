// The Fade Actor document: roll API, conditions (as status effects), and
// species/path application. Derived stats live in the system data models.
import { rollCheck } from "../dice/checks.mjs";
import FadeRoll from "../dice/fade-roll.mjs";
import { computeRollModifiers, CONDITION_EFFECTS, CONDITION_INTENSITIES, getConditionStatusId, getConditionKeyFromStatusId } from "../rules/conditions.js";
import { calculateSkillDice, getSkill, getSkillByKey } from "../rules/skills.js";
import { getWeaponAttackAttributeOverride } from "../rules/weapon-rules.js";
import { performAddictionAttack, resetDailySin } from "../rules/dark-magic.js";
import { rollAttack } from "../rolls/attack.mjs";
import { castSpell } from "../rolls/spell.mjs";
import { getItemResetUpdate } from "../rules/item-actions.mjs";
import { applySpeciesToActor } from "../rules/species.mjs";
import { applyPathSkillModifications } from "../rules/path-skills.mjs";

export default class TheFadeActor extends Actor {

    /* -------------------------------------------- */
    /*  Creation                                    */
    /* -------------------------------------------- */

    /** Hide the legacy "npc" type: NPCs are characters. */
    static async createDialog(data = {}, createOptions = {}, dialogOptions = {}) {
        const types = (dialogOptions.types ?? this.TYPES).filter(type => type !== "npc" && type !== CONST.BASE_DOCUMENT_TYPE);
        return super.createDialog(data, createOptions, { ...dialogOptions, types });
    }

    /** @override */
    async _preCreate(data, options, user) {
        if ((await super._preCreate(data, options, user)) === false) return false;
        if (this.type !== "character") return;
        // Characters get linked tokens with HP and Sanity bars, sized by species.
        const prototypeToken = {
            actorLink: data.prototypeToken?.actorLink ?? true,
            disposition: data.prototypeToken?.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY,
            bar1: { attribute: "hp" },
            bar2: { attribute: "sanity" },
            displayBars: data.prototypeToken?.displayBars ?? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        };
        // New characters start unhurt: current HP and Sanity at their (derived) maximums.
        const vitals = {};
        if (data.system?.hp?.value === undefined) vitals["system.hp.value"] = this.system.hp.max;
        if (data.system?.sanity?.value === undefined) vitals["system.sanity.value"] = this.system.sanity.max;
        this.updateSource({ prototypeToken, ...vitals });
    }

    /* -------------------------------------------- */
    /*  Embedded item reactions                     */
    /* -------------------------------------------- */

    /** @override */
    async _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
        super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
        if (userId !== game.user.id || collection !== "items" || this.type !== "character") return;
        if (options.thefadeSkipApply) return;
        for (const item of documents) {
            if (["species", "monsterspecies"].includes(item.type)) await applySpeciesToActor(this, item, { interactive: true });
            else if (["path", "monsterpath"].includes(item.type)) await applyPathSkillModifications(this, item);
        }
    }

    /** @override */
    _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
        super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
        if (userId !== game.user.id || collection !== "items" || this.type !== "character") return;
        // Edits to an embedded species re-apply it when it is set to sync.
        documents.forEach((item, index) => {
            if (!["species", "monsterspecies"].includes(item.type)) return;
            const change = changes[index] ?? {};
            const touched = ("name" in change) || ("system" in change);
            if (touched && item.system.syncToActor) applySpeciesToActor(this, item, { interactive: false, resetSkills: false });
        });
    }

    /* -------------------------------------------- */
    /*  Conditions                                  */
    /* -------------------------------------------- */

    /** The active status effect for a condition, if any. */
    getConditionEffect(key) {
        const statusId = getConditionStatusId(key);
        return this.effects.find(effect => effect.statuses.has(statusId)) ?? null;
    }

    /**
     * Turn a condition on or off, or change its intensity. Conditions are
     * Foundry status effects, so they appear on tokens and in the Token HUD.
     * @param {string} key                     Condition key, e.g. "bleed".
     * @param {object} [options]
     * @param {boolean} [options.active]       Force on/off (default: toggle).
     * @param {string} [options.intensity]     trivial | moderate | severe
     */
    /**
     * Turn a condition on or off. `keepHigher` follows the rule that same-name
     * effects don't stack (Core pp. 33–34): an existing effect keeps the higher
     * severity and the longer duration.
     * @param {string} key
     * @param {{active?: boolean, intensity?: string, rounds?: number, keepHigher?: boolean}} [options]
     */
    async setCondition(key, { active, intensity, rounds, keepHigher = false } = {}) {
        const definition = CONDITION_EFFECTS[key];
        if (!definition) return null;
        const existing = this.getConditionEffect(key);
        const turnOn = active ?? (intensity ? true : !existing);
        if (!turnOn) {
            if (existing) await existing.delete();
            return null;
        }
        if (this.system.statusImmunityLocks?.[key]) {
            ui.notifications.warn(game.i18n.format("THEFADE.Condition.immune", { actor: this.name, condition: definition.label }));
            return null;
        }
        let level = definition.tiered ? (CONDITION_INTENSITIES.includes(intensity) ? intensity : existing?.getFlag("thefade", "intensity") ?? "trivial") : null;
        if (keepHigher && existing && definition.tiered) {
            const current = existing.getFlag("thefade", "intensity") ?? "trivial";
            if (CONDITION_INTENSITIES.indexOf(current) > CONDITION_INTENSITIES.indexOf(level)) level = current;
        }
        // An untimed effect already outlasts any duration; a timed one is only extended.
        if (keepHigher && existing && rounds > 0) {
            const timed = existing.duration.type === "turns" && existing.duration.rounds > 0;
            if (!timed || existing.duration.remaining >= rounds) rounds = 0;
        }
        const name = conditionName(key, level);
        // A timed condition counts its rounds from now; it ends at the start of the creature's turn once they run out.
        const duration = rounds > 0 ? {
            "duration.rounds": rounds, "duration.turns": null, "duration.startTime": game.time.worldTime,
            "duration.startRound": game.combat?.round ?? 0, "duration.startTurn": game.combat?.turn ?? 0
        } : {};
        if (existing) {
            const changes = { ...duration };
            if (definition.tiered && existing.getFlag("thefade", "intensity") !== level) Object.assign(changes, { name, "flags.thefade.intensity": level });
            if (!foundry.utils.isEmpty(changes)) await existing.update(changes);
            return existing;
        }
        const effect = await ActiveEffect.implementation.fromStatusEffect(getConditionStatusId(key));
        effect.updateSource({ name, ...(level ? { "flags.thefade.intensity": level } : {}), ...duration });
        return ActiveEffect.implementation.create(effect, { parent: this, keepId: true });
    }

    /**
     * Token HUD integration: left-click toggles a condition; right-click on a
     * tiered condition applies it or advances Trivial → Moderate → Severe.
     * @override
     */
    async toggleStatusEffect(statusId, { active, overlay = false } = {}) {
        const key = getConditionKeyFromStatusId(statusId);
        if (!key) return super.toggleStatusEffect(statusId, { active, overlay });
        const definition = CONDITION_EFFECTS[key];
        const existing = this.getConditionEffect(key);
        if (overlay && definition.tiered) {
            const current = existing?.getFlag("thefade", "intensity") ?? null;
            const next = current ? CONDITION_INTENSITIES[(CONDITION_INTENSITIES.indexOf(current) + 1) % CONDITION_INTENSITIES.length] : "trivial";
            return !!(await this.setCondition(key, { active: true, intensity: next }));
        }
        return !!(await this.setCondition(key, { active: active ?? !existing }));
    }

    /** Remove every condition and reset the stance. */
    async clearCombatState() {
        const ids = this.effects.filter(effect => [...effect.statuses].some(id => getConditionKeyFromStatusId(id))).map(e => e.id);
        if (ids.length) await this.deleteEmbeddedDocuments("ActiveEffect", ids);
        if (this.system.activeStance !== "none") await this.update({ "system.activeStance": "none" });
    }

    /**
     * Per-roll dice modifiers from active conditions (immune conditions excluded).
     * @param {object} context  {kind, skillName, skillCategory, attributeName, isRanged}
     */
    getConditionRollModifiers(context = { kind: "generic" }) {
        const conditions = this.system.conditions ?? {};
        const locks = this.system.statusImmunityLocks ?? {};
        const effective = Object.fromEntries(Object.entries(conditions).filter(([key]) => !locks[key]));
        return computeRollModifiers(effective, context);
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /** @override */
    getRollData() {
        return { ...super.getRollData(), ...(this.system.getRollData?.() ?? {}) };
    }

    /**
     * Roll a skill check.
     * @param {string} key       Skill slug ("sword", "lore_history") or name.
     * @param {object} [options] {event, dt, extraDice}
     */
    async rollSkill(key, options = {}) {
        const skill = getSkillByKey(this, key) ?? getSkill(this, key);
        if (!skill) return ui.notifications.warn(game.i18n.format("THEFADE.Roll.noSkill", { skill: key }));
        const dice = calculateSkillDice(this, skill);
        const rank = game.i18n.localize(CONFIG.THEFADE.skillRanks[skill.rank]?.label ?? skill.rank);
        return rollCheck(this, {
            dice,
            label: skill.name,
            flavor: game.i18n.format("THEFADE.Roll.skillFlavor", { skill: skill.name, rank }),
            context: { kind: "skill", skillName: skill.name, skillCategory: skill.category, attributeName: skill.attribute },
            infirm: dice === 0,
            flags: { skill: skill.key },
            ...options
        });
    }

    /**
     * Roll a bare attribute check (pool = attribute total).
     * @param {string} key       physique | finesse | mind | presence | soul
     */
    async rollAttribute(key, options = {}) {
        const attribute = this.system.attributes?.[key];
        if (!attribute) return null;
        const label = game.i18n.localize(CONFIG.THEFADE.attributes[key].label);
        return rollCheck(this, {
            dice: attribute.total,
            label,
            flavor: game.i18n.format("THEFADE.Roll.attributeFlavor", { attribute: label }),
            context: { kind: "attribute", attributeName: key },
            infirm: attribute.infirm,
            flags: { attribute: key },
            ...options
        });
    }

    /** Roll an arbitrary pool of d12s from the sheet's dice tool. */
    async rollPool(dice, options = {}) {
        return rollCheck(this, {
            dice,
            label: game.i18n.format("THEFADE.Roll.poolLabel", { dice }),
            context: { kind: "generic" },
            dt: null,
            ...options
        });
    }

    /**
     * Attack pool for a weapon: weapon skill dice (using the weapon's attack
     * attribute override, e.g. Agile light weapons use Finesse) + weapon misc
     * bonus + item attack bonuses. Condition modifiers are added at roll time.
     * @param {Item} weapon
     */
    getWeaponAttackDice(weapon) {
        const system = weapon.system;
        const skill = getSkill(this, system.skill) ?? { name: system.skill, rank: "untrained", attribute: "physique", category: "Combat" };
        const override = getWeaponAttackAttributeOverride(system);
        const effective = override ? { ...skill, attribute: override.key } : skill;
        const skillKey = String(system.skill || "").toLowerCase();
        const bonuses = this.system.equippedBonuses ?? {};
        const attackBonus = (Number(bonuses.attack) || 0) + (Number(bonuses[`attack_${skillKey}`]) || 0);
        const dice = Math.max(0, calculateSkillDice(this, effective) + (system.miscBonus || 0) + attackBonus);
        return { dice, skill: effective, attributeSource: override?.source ?? "", untrained: skill.rank === "untrained" };
    }

    /** Attack with a weapon (see rolls/attack.mjs). */
    async rollAttack(weapon, options = {}) {
        return rollAttack(this, weapon, options);
    }

    /** Cast a spell (see rolls/spell.mjs). */
    async castSpell(spell, options = {}) {
        return castSpell(this, spell, options);
    }

    /**
     * Dark Magic's attack on the caster's Grit, made manually (e.g. for
     * Sin gained outside a cast). Asks for the casting DT that drives the pool.
     */
    async rollAddictionCheck() {
        const dt = await foundry.applications.api.DialogV2.prompt({
            window: { title: game.i18n.localize("THEFADE.Magic.rollAddiction") },
            classes: ["thefade"],
            content: `<p>${game.i18n.localize("THEFADE.Magic.addictionHint")}</p><div class="form-group"><label>${game.i18n.localize("THEFADE.Magic.castingDT")}</label><div class="form-fields"><input type="number" name="dt" value="3" min="1" autofocus></div></div>`,
            ok: { label: "THEFADE.Roll.roll", callback: (event, button) => Math.max(1, Number(button.form.elements.dt.value) || 1) },
            rejectClose: false
        });
        if (!dt) return null;
        const attack = await performAddictionAttack(this, dt);
        const outcome = attack.attackHits
            ? game.i18n.format("THEFADE.Magic.addictionHit", { damage: attack.sanityDamage, before: attack.sanityBefore, after: attack.sanityAfter, stage: attack.stageAdvanced ?? attack.priorStage })
            : game.i18n.localize("THEFADE.Magic.addictionMiss");
        return attack.attackRoll.toMessage({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
            flavor: game.i18n.format("THEFADE.Magic.addictionFlavor", { dice: attack.dicePool, grit: attack.gritTarget }),
            content: `<div class="thefade chat-note"><p>${outcome}</p></div>`
        });
    }

    /* -------------------------------------------- */
    /*  Rest & recovery                             */
    /* -------------------------------------------- */

    /** Daily rest: clear the day's Sin and reset daily item uses. */
    async restDaily() {
        await resetDailySin(this);
        // Ignition recovery (at most a few hours) is always over by a new day, even if world time never advanced.
        const ignition = this.getFlag("thefade", "ignition");
        if (ignition && !ignition.active && ignition.recoveryUntil) await this.setFlag("thefade", "ignition.recoveryUntil", 0);
        const updates = this.items.map(item => {
            const update = getItemResetUpdate(item);
            return update ? { _id: item.id, ...update } : null;
        }).filter(Boolean);
        if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
        await ChatMessage.implementation.create({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
            content: `<div class="thefade chat-note"><p>${game.i18n.format("THEFADE.Rest.dailyDone", { name: foundry.utils.escapeHTML(this.name) })}</p></div>`
        });
    }

    /** A short rest: recover 1d12 + Physique HP (up to maximum). */
    async takeRest() {
        const physique = this.system.attributes.physique.total;
        const roll = await new Roll(`1d12 + ${physique}`).evaluate();
        const before = this.system.hp.value;
        const after = Math.min(this.system.hp.max, before + roll.total);
        await this.update({ "system.hp.value": after });
        await roll.toMessage({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
            flavor: game.i18n.format("THEFADE.Rest.restFlavor", { before, after, max: this.system.hp.max })
        });
        return roll;
    }
}

/** Display name for a condition effect, including its intensity. */
export function conditionName(key, intensity) {
    const label = game.i18n.localize(CONDITION_EFFECTS[key]?.label ?? key);
    return intensity ? `${label} (${game.i18n.localize(`THEFADE.Intensity.${intensity}`)})` : label;
}

export { FadeRoll };
