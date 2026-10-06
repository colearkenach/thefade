// Trap and hazard attacks (Core pp. 405–412): roll the item's attack dice
// against the targeted token's defense and post a standard attack card.
import FadeRoll from "../dice/fade-roll.mjs";
import { createAttackMessage } from "../chat/attack-card.mjs";
import { locationLabel } from "../rules/hit-location.js";

const DEFENSE_TOTALS = { avoid: "totalAvoid", resilience: "totalResilience", grit: "totalGrit" };

/**
 * Trigger a trap or hazard against the user's target (or controlled token).
 * @param {Item} item  A trap or hazard item.
 */
export async function rollHazard(item) {
    const token = game.user.targets.first() ?? canvas.tokens?.controlled[0];
    const target = token?.actor;
    if (!target) return ui.notifications.warn("THEFADE.Hazard.needTarget", { localize: true });

    const system = item.system;
    const defenseKey = system.defense || "none";
    const automatic = defenseKey === "none" || system.attackDice <= 0;
    const dt = automatic ? 0 : Number(target.system[DEFENSE_TOTALS[defenseKey]] ?? 0);

    const rolls = [];
    let successes = 0;
    let hit = true;
    if (!automatic) {
        const roll = FadeRoll.pool(system.attackDice, { dt, label: item.name });
        await roll.evaluate();
        rolls.push(roll);
        successes = roll.successes;
        hit = roll.isSuccess;
    }

    // Damage may be a flat number or a formula ("3d6").
    let amount = 0;
    const notes = [];
    if (hit && String(system.damage ?? "0").trim() !== "0") {
        try {
            const damageRoll = await new Roll(String(system.damage)).evaluate();
            amount = Math.max(0, Math.trunc(damageRoll.total));
            if (!damageRoll.isDeterministic) notes.push(`${system.damage} → ${amount}`);
        } catch (err) {
            console.error("The Fade | Invalid trap/hazard damage formula", err);
            return ui.notifications.error(game.i18n.format("THEFADE.Hazard.badFormula", { formula: system.damage }));
        }
    }
    if (system.effect) notes.push(system.effect);
    if (automatic) notes.unshift(game.i18n.localize("THEFADE.Hazard.automatic"));

    const label = CONFIG.THEFADE.damageTypes[system.damageType] ?? system.damageType;
    return createAttackMessage({
        actor: target,
        rolls,
        state: {
            kind: item.type,
            attackerUuid: item.uuid,
            itemUuid: item.uuid,
            itemName: item.name,
            itemImg: item.img,
            targetUuid: token.document?.uuid ?? target.uuid,
            targetName: token.name ?? target.name,
            facing: null,
            dt,
            dtParts: automatic ? [] : [game.i18n.localize(CONFIG.THEFADE.spellDefenses[defenseKey.charAt(0).toUpperCase() + defenseKey.slice(1)] ?? defenseKey)],
            successes,
            hit,
            autoFail: false,
            remaining: automatic ? 0 : Math.max(0, successes - dt),
            location: hit && system.damageTrack !== "sanity" ? { key: "body", label: locationLabel("body") } : null,
            damage: {
                components: amount ? [{ amount, type: system.damageType || "Ut", label }] : [],
                total: amount,
                critValue: amount,
                critBonus: 0,
                crits: 0,
                minimumHp: 0,
                track: system.damageTrack === "sanity" ? "sanity" : "hp",
                bypassArmor: system.bypassArmor === true
            },
            critThreshold: !automatic && amount && system.critical > 0 ? system.critical : null,
            spent: [],
            notes,
            qualities: "",
            qualityRules: [],
            applied: false
        }
    });
}
