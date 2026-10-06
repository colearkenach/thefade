// Weapon attacks (Core pp. 20–26): pick a target, compute the DT from its
// Avoid and passive defenses for the side you attack from, roll the pool,
// resolve hit location, and post an interactive attack card.
import FadeRoll from "../dice/fade-roll.mjs";
import { isFastForward } from "../dice/checks.mjs";
import { classifyTokenFacing } from "../canvas/token-facing.mjs";
import {
    buildWeaponDamageProfile, getWeaponCriticalDamageBonus, getWeaponMinimumHpDamage,
    getWeaponQualityRules, hasWeaponQuality, weaponQualityDisplay
} from "../rules/weapon-rules.js";
import { rollHitLocation, locationLabel } from "../rules/hit-location.js";
import { createAttackMessage } from "../chat/attack-card.mjs";

/** Rounds of Trivial Bleed a Ripping weapon inflicts before extensions. */
const RIPPING_BASE_ROUNDS = 3;

const { DialogV2 } = foundry.applications.api;

/** The token representing an actor on the current scene (controlled first). */
export function primaryToken(actor) {
    if (!actor || !canvas?.ready) return null;
    return canvas.tokens.controlled.find(t => t.actor === actor) ?? actor.getActiveTokens(true)[0] ?? null;
}

/**
 * Attack DT against a target: Avoid + Passive Dodge + (melee only) Passive
 * Parry, adjusted for the side attacked from and weapon qualities.
 * @returns {{dt: number, parts: string[], bonusDice: number}}
 */
export function computeAttackDT(target, facing, weaponSystem) {
    const system = target?.system;
    if (!system?.defenses) return { dt: 3, parts: [], bonusDice: 0 };
    const melee = !weaponSystem?.isRanged;
    let dodge = system.defenses.passiveDodge ?? 0;
    let parry = system.defenses.passiveParry ?? 0;
    const notes = [];
    if (facing === "backflank") {
        dodge = Math.floor(dodge / 2);
        if (system.activeStance !== "parryingStance") parry = 0;
    } else if (facing === "back") {
        dodge = Math.floor(dodge / 4);
        parry = 0;
    }
    if (hasWeaponQuality(weaponSystem, "accurate")) { dodge = 0; notes.push(game.i18n.localize("THEFADE.Attack.accurate")); }
    if (hasWeaponQuality(weaponSystem, "powerful")) { parry = 0; notes.push(game.i18n.localize("THEFADE.Attack.powerful")); }
    else if (hasWeaponQuality(weaponSystem, "fencing") && !target.items.some(i => i.type === "weapon" && hasWeaponQuality(i.system, "fencing"))) {
        parry = Math.max(0, parry - 1);
    }
    const avoid = system.totalAvoid ?? 1;
    const dt = Math.max(1, avoid + dodge + (melee ? parry : 0));
    const parts = [`${game.i18n.localize("THEFADE.Defense.avoid")} ${avoid}`, `${game.i18n.localize("THEFADE.Defense.passiveDodge")} ${dodge}`];
    if (melee) parts.push(`${game.i18n.localize("THEFADE.Defense.passiveParry")} ${parry}`);
    return { dt, parts: [...parts, ...notes], bonusDice: system.defenseExcess?.avoid ?? 0 };
}

/**
 * Roll an attack with a weapon.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {object} [options]
 * @param {Event} [options.event]
 */
export async function rollAttack(actor, weapon, { event } = {}) {
    const system = weapon.system;
    const attack = actor.getWeaponAttackDice(weapon);
    const attackerToken = primaryToken(actor);
    const tokens = (canvas?.ready ? canvas.tokens.placeables : [])
        .filter(t => t.actor && t !== attackerToken && (t.visible || game.user.isGM));
    const userTarget = [...game.user.targets].find(t => t !== attackerToken) ?? null;
    const context = {
        kind: "attack", skillName: system.skill, skillCategory: "Combat",
        attributeName: attack.skill.attribute, isRanged: system.isRanged, weaponSkill: system.skill
    };
    const mods = actor.getConditionRollModifiers(context);

    // Defaults: the user's target, facing from token positions, random location.
    let config = {
        targetId: userTarget?.id ?? "",
        facing: userTarget ? classifyTokenFacing(attackerToken, userTarget) : "front",
        locationMode: "random",
        calledLocation: "body",
        mounted: false,
        dualTrigger: false,
        extraDice: 0,
        rollMode: game.settings.get("core", "rollMode")
    };
    const targetToken = id => tokens.find(t => t.id === id) ?? (userTarget?.id === id ? userTarget : null);
    config.dt = computeAttackDT(targetToken(config.targetId)?.actor, config.facing, system).dt;

    if (!isFastForward(event)) {
        const result = await configureAttack({ actor, weapon, attack, tokens, attackerToken, config, mods });
        if (!result) return null;
        config = result;
    }

    const target = targetToken(config.targetId);
    const targetActor = target?.actor ?? null;
    const calledShot = config.locationMode === "called";
    const defense = targetActor ? computeAttackDT(targetActor, config.facing, system) : { bonusDice: 0, parts: [] };
    const notes = [...mods.notes];
    if (mods.bonusDice) notes.unshift(game.i18n.format("THEFADE.Roll.conditionBonus", { dice: mods.bonusDice }));
    if (mods.penaltyDice) notes.unshift(game.i18n.format("THEFADE.Roll.conditionPenalty", { dice: mods.penaltyDice }));
    if (calledShot) notes.push(game.i18n.localize("THEFADE.Attack.calledShotPenalty"));
    if (defense.bonusDice) notes.push(game.i18n.format("THEFADE.Attack.defenseExcess", { dice: defense.bonusDice }));
    if (config.extraDice) notes.push(game.i18n.format("THEFADE.Roll.extraDice", { dice: `${config.extraDice > 0 ? "+" : ""}${config.extraDice}` }));

    const dice = mods.autoFail ? 0 : Math.max(1, attack.dice + mods.bonusDice - mods.penaltyDice
        + (calledShot ? -2 : 0) + defense.bonusDice + config.extraDice);
    const roll = FadeRoll.pool(dice, { dt: config.dt, label: weapon.name, autoFail: mods.autoFail });
    await roll.evaluate();
    const rolls = [roll];

    // Hit location on a hit: called (chosen, −2D), default (Body), or random (d12, side attacked from).
    let location = null;
    if (roll.isSuccess) {
        if (calledShot) location = { key: config.calledLocation, label: locationLabel(config.calledLocation), called: true };
        else if (config.locationMode === "default") location = { key: "body", label: locationLabel("body") };
        else {
            const anatomy = game.settings.get("thefade", "alternateAnatomyEnabled") ? (targetActor?.system?.anatomy?.preset ?? "humanoid") : "humanoid";
            const result = await rollHitLocation(config.facing, anatomy);
            location = {
                key: result.location, label: result.label ?? locationLabel(result.location),
                detail: result.sideRoll ? `d12 ${result.roll}, d2 ${result.sideRoll}` : `d12 ${result.roll}`
            };
        }
    }

    const damage = buildWeaponDamageProfile(actor, system, { targetActor, targetMounted: config.mounted, dualTrigger: config.dualTrigger });
    const critBonus = getWeaponCriticalDamageBonus(system);
    return createAttackMessage({
        actor, rolls, rollMode: config.rollMode,
        state: {
            kind: "weapon",
            attackerUuid: actor.uuid,
            itemUuid: weapon.uuid,
            itemName: weapon.name,
            itemImg: weapon.img,
            targetUuid: target?.document?.uuid ?? targetActor?.uuid ?? "",
            targetName: target?.name ?? targetActor?.name ?? "",
            facing: targetActor ? config.facing : null,
            dt: config.dt,
            dtParts: defense.parts,
            successes: roll.successes,
            hit: !!roll.isSuccess,
            autoFail: mods.autoFail,
            remaining: roll.excess,
            location,
            damage: {
                components: damage.components.map(c => ({ amount: c.amount, type: c.type, label: c.label })),
                total: damage.total,
                critValue: damage.total + critBonus,
                critBonus,
                crits: 0,
                minimumHp: getWeaponMinimumHpDamage(system)
            },
            critThreshold: Number(system.critical) > 0 ? Number(system.critical) : null,
            // Ripping: Trivial Bleed for 3 rounds when the hit deals HP damage; 2 successes add a round (Core pp. 179–180; 3-round base is a designer ruling).
            ripping: hasWeaponQuality(system, "ripping") ? { rounds: RIPPING_BASE_ROUNDS, extra: 0 } : null,
            spent: [],
            notes: [...notes, ...damage.conditionalNotes],
            qualities: weaponQualityDisplay(system),
            qualityRules: getWeaponQualityRules(system).map(q => ({ label: q.label, description: q.description })),
            applied: false
        }
    });
}

/** The attack configuration dialog. Returns the chosen config or null. */
async function configureAttack({ actor, weapon, attack, tokens, attackerToken, config, mods }) {
    const system = weapon.system;
    const content = await foundry.applications.handlebars.renderTemplate("systems/thefade/templates/dialogs/attack-config.hbs", {
        weapon, attack, config, mods,
        tokens: tokens.map(t => ({ id: t.id, name: t.name, selected: t.id === config.targetId })).sort((a, b) => a.name.localeCompare(b.name)),
        facings: ["front", "flank", "backflank", "back"].map(key => ({ key, label: game.i18n.localize(`THEFADE.Facing.${key}`), selected: key === config.facing })),
        locations: Object.entries(CONFIG.THEFADE.bodyParts).map(([key, label]) => ({ key, label: game.i18n.localize(label) })),
        antiCavalry: hasWeaponQuality(system, "antiCavalry"),
        dualTrigger: hasWeaponQuality(system, "dualTrigger"),
        difficulties: Object.entries(CONFIG.THEFADE.difficulties).map(([value, label]) => ({ value, label: game.i18n.localize(label) })),
        rollModes: Object.entries(CONFIG.Dice.rollModes).map(([value, mode]) => ({ value, label: game.i18n.localize(mode.label ?? mode), selected: value === config.rollMode }))
    });
    return DialogV2.wait({
        window: { title: game.i18n.format("THEFADE.Attack.title", { weapon: weapon.name }), icon: "fa-solid fa-swords" },
        classes: ["thefade", "thefade-roll-dialog"],
        position: { width: 420 },
        content,
        buttons: [{
            action: "roll", label: "THEFADE.Attack.roll", icon: "fa-solid fa-dice-d20", default: true,
            callback: (event, button) => {
                const f = button.form.elements;
                return {
                    targetId: f.targetId.value,
                    facing: f.facing.value,
                    locationMode: f.locationMode.value,
                    calledLocation: f.calledLocation.value,
                    mounted: f.mounted?.checked ?? false,
                    dualTrigger: f.dualTrigger?.checked ?? false,
                    dt: Math.max(1, Number(f.dt.value) || 1),
                    extraDice: Math.trunc(Number(f.extraDice.value) || 0),
                    rollMode: f.rollMode.value
                };
            }
        }],
        render: (event, dialog) => {
            const element = dialog.element;
            const form = element.querySelector("form") ?? element;
            const refresh = ({ autoFacing = false } = {}) => {
                const target = tokens.find(t => t.id === form.querySelector("[name=targetId]").value);
                if (autoFacing) form.querySelector("[name=facing]").value = target ? classifyTokenFacing(attackerToken, target) : "front";
                const facing = form.querySelector("[name=facing]").value;
                const { dt, parts } = computeAttackDT(target?.actor, facing, system);
                form.querySelector("[name=dt]").value = target ? dt : (form.querySelector("[name=dt]").value || 3);
                form.querySelector("[data-dt-parts]").textContent = target ? parts.join(" + ") : game.i18n.localize("THEFADE.Attack.manualDT");
                form.querySelector("[data-called]").hidden = form.querySelector("[name=locationMode]").value !== "called";
            };
            form.querySelector("[name=targetId]").addEventListener("change", () => refresh({ autoFacing: true }));
            form.querySelector("[name=facing]").addEventListener("change", () => refresh());
            form.querySelector("[name=locationMode]").addEventListener("change", () => refresh());
            form.querySelector("[name=difficulty]")?.addEventListener("change", ev => { form.querySelector("[name=dt]").value = ev.currentTarget.value; });
            refresh();
        }
    });
}
