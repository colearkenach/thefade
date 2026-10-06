// Spellcasting (Core pp. 304–316): Rune spells first draw the rune with
// Symbology; the Spellcasting roll must meet the spell's successes. Spare
// successes are spent on crits, damage/range/duration, the spell's Bonus,
// and damage-type effects. Failure risks a Mishap; Dark Magic adds Sin.
import FadeRoll from "../dice/fade-roll.mjs";
import { isFastForward } from "../dice/checks.mjs";
import { calculateSkillDice, getSkill } from "../rules/skills.js";
import { buildSpellDamageProfile, buildSpellEffectsProfile } from "../rules/spell-rules.js";
import { handleDarkCast } from "../rules/dark-magic.js";
import { createSpellMessage } from "../chat/spell-card.mjs";
import { primaryToken } from "./attack.mjs";

const { DialogV2 } = foundry.applications.api;
const DEFENSE_TOTALS = { Avoid: "totalAvoid", Resilience: "totalResilience", Grit: "totalGrit" };
const NO_CRIT_TYPES = new Set(["So", "Ex", "Psi"]);

/** Mishap severity by how many successes the casting fell short (Core pp. 308–312). */
export function mishapSeverity(successes, required) {
    const missing = required - successes;
    if (missing <= 0) return null;
    if (successes === 0 && missing >= 4) return "critical";
    if (missing >= 4) return "severe";
    if (missing >= 2) return "moderate";
    return "minor";
}

/**
 * Cast a spell.
 * @param {Actor} actor
 * @param {Item} spell
 * @param {object} [options]
 * @param {Event} [options.event]
 */
export async function castSpell(actor, spell, { event } = {}) {
    const system = spell.system;
    const spellcasting = getSkill(actor, "Spellcasting");
    const casterToken = primaryToken(actor);
    const userTarget = [...game.user.targets].find(t => t !== casterToken) ?? null;
    const mods = actor.getConditionRollModifiers({ kind: "spell", skillName: "Spellcasting", skillCategory: "Magical", attributeName: spellcasting?.attribute });
    const baseDice = calculateSkillDice(actor, spellcasting);

    let config = { targetId: userTarget?.id ?? "", extraDice: 0, rollMode: game.settings.get("core", "rollMode") };
    const tokens = (canvas?.ready ? canvas.tokens.placeables : []).filter(t => t.actor && t !== casterToken && (t.visible || game.user.isGM));
    if (!isFastForward(event)) {
        const result = await configureCast({ spell, baseDice, mods, tokens, config });
        if (!result) return null;
        config = result;
    }
    const target = tokens.find(t => t.id === config.targetId) ?? (userTarget?.id === config.targetId ? userTarget : null);
    const notes = [...mods.notes];
    const rolls = [];

    // Rune spells: draw the rune with Symbology first.
    let rune = null;
    if (system.requirements.isRune) {
        const symbology = getSkill(actor, "Symbology");
        const runeMods = actor.getConditionRollModifiers({ kind: "skill", skillName: "Symbology", skillCategory: "Knowledge", attributeName: symbology?.attribute });
        const runeDice = runeMods.autoFail ? 0 : Math.max(1, calculateSkillDice(actor, symbology) + runeMods.bonusDice - runeMods.penaltyDice);
        const runeRoll = FadeRoll.pool(runeDice, { dt: system.requirements.symbology, label: game.i18n.localize("THEFADE.Spell.runeDrawing"), autoFail: runeMods.autoFail });
        await runeRoll.evaluate();
        rolls.push(runeRoll);
        rune = { dice: runeDice, successes: runeRoll.successes, required: system.requirements.symbology, success: !!runeRoll.isSuccess, faces: runeRoll.faces };
        notes.push(...runeMods.notes);
    }

    const required = system.requirements.spellcasting;
    const dice = mods.autoFail ? 0 : Math.max(1, baseDice + mods.bonusDice - mods.penaltyDice + config.extraDice);
    const castRoll = FadeRoll.pool(dice, { dt: required, label: spell.name, autoFail: mods.autoFail });
    await castRoll.evaluate();
    rolls.unshift(castRoll);
    const activated = !!castRoll.isSuccess;
    const success = activated && (!rune || rune.success);

    // Spell attacks: one roll per listed defense, against the target's defense.
    const attacks = [];
    if (success) {
        for (const defense of system.attackTargets) {
            const total = target?.actor?.system?.[DEFENSE_TOTALS[defense]];
            const excess = target?.actor?.system?.defenseExcess?.[defense.toLowerCase()] ?? 0;
            const dt = Number.isFinite(total) ? total : 3;
            const attackRoll = FadeRoll.pool(dice + excess, { dt, label: `${spell.name} vs ${defense}` });
            await attackRoll.evaluate();
            rolls.push(attackRoll);
            attacks.push({
                defense, dt, successes: attackRoll.successes, hit: !!attackRoll.isSuccess, faces: attackRoll.faces,
                effect: system.attackEffects?.[defense] ?? "", estimated: !Number.isFinite(total)
            });
        }
    }

    const damage = buildSpellDamageProfile(system);
    const effects = buildSpellEffectsProfile(system);
    const longDuration = /hour|day|week|month|year/i.test(system.time ?? "");
    const restricted = damage.components.some(c => NO_CRIT_TYPES.has(c.type));
    const message = await createSpellMessage({
        actor, rolls, rollMode: config.rollMode,
        state: {
            kind: "spell",
            casterUuid: actor.uuid,
            itemUuid: spell.uuid,
            itemName: spell.name,
            itemImg: spell.img,
            school: system.schoolLabel,
            isDark: system.isDark,
            targetUuid: target?.document?.uuid ?? "",
            targetName: target?.name ?? "",
            rune,
            cast: { dice, successes: castRoll.successes, required, success: activated, autoFail: mods.autoFail },
            success,
            mishap: activated ? null : mishapSeverity(castRoll.successes, required),
            // Spare casting successes buy enhancements; spare attack successes buy crits (designer ruling, 2026-10-06).
            remaining: success ? castRoll.excess : 0,
            attackRemaining: Math.max(0, ...attacks.filter(a => a.hit).map(a => a.successes - a.dt)),
            damage: {
                components: damage.components.map(c => ({ amount: c.amount, type: c.type, label: c.label })),
                total: damage.total, increase: 0, crits: 0, critValue: damage.total,
                canCrit: damage.components.length > 0 && !restricted,
                increaseCost: restricted ? 2 : 1
            },
            sanityDamage: effects.sanityDamage,
            statusEffects: effects.statusEffects.map(e => e.display),
            buffEffects: effects.buffEffects.map(b => b.display),
            attacks,
            hit: success && (!attacks.length || attacks.some(a => a.hit)),
            range: system.range,
            time: system.time,
            durationCost: longDuration ? 2 : 1,
            bonusEffect: system.bonusEffect,
            spent: [],
            notes,
            applied: false
        }
    });

    // Dark Magic: every cast accrues Sin, and may trigger an addiction attack.
    if (system.isDark) await handleDarkCast(actor, spell);
    return message;
}

async function configureCast({ spell, baseDice, mods, tokens, config }) {
    const needsTarget = spell.system.attackTargets.length > 0 || spell.system.damage > 0;
    const content = await foundry.applications.handlebars.renderTemplate("systems/thefade/templates/dialogs/cast-config.hbs", {
        spell, baseDice, mods, needsTarget,
        required: spell.system.requirementsLabel,
        tokens: tokens.map(t => ({ id: t.id, name: t.name, selected: t.id === config.targetId })).sort((a, b) => a.name.localeCompare(b.name)),
        rollModes: Object.entries(CONFIG.Dice.rollModes).map(([value, mode]) => ({ value, label: game.i18n.localize(mode.label ?? mode), selected: value === config.rollMode }))
    });
    return DialogV2.wait({
        window: { title: game.i18n.format("THEFADE.Spell.castTitle", { spell: spell.name }), icon: "fa-solid fa-wand-sparkles" },
        classes: ["thefade", "thefade-roll-dialog"],
        position: { width: 400 },
        content,
        buttons: [{
            action: "cast", label: "THEFADE.Magic.cast", icon: "fa-solid fa-wand-sparkles", default: true,
            callback: (event, button) => {
                const f = button.form.elements;
                return {
                    targetId: f.targetId?.value ?? "",
                    extraDice: Math.trunc(Number(f.extraDice.value) || 0),
                    rollMode: f.rollMode.value
                };
            }
        }]
    });
}
