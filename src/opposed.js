// Opposed rolls and Aid Another for The Fade - Abyss.
//
// The Core Rulebook (pp. 55-58) pairs many skills in an opposed-roll
// structure (Stealth vs Awareness, Deception vs Insight, Trickery vs
// Grit, grapple contests, etc.). Both actors roll their pool; the side
// with more successes wins; ties favor the defender.
//
// Aid Another (Core Rulebook p. 60 / AUDIT P2 #26): a helper makes a
// skill check vs DT 3 at rank Practiced or better. On success, the
// helped ally adds +1D to their next roll with that skill.

import {
    getSkillByKey,
    getAllSkills,
    calculateSkillDice
} from './skills.js';

const TRAINED_RANKS = new Set(["practiced", "adept", "experienced", "expert", "mastered"]);

function getAttributeValue(actor, attribute) {
    if (!attribute) return 0;
    if (attribute.includes("_")) {
        const parts = attribute.split("_");
        const a = actor.system.attributes?.[parts[0]]?.value || 0;
        const b = actor.system.attributes?.[parts[1]]?.value || 0;
        return Math.floor((a + b) / 2);
    }
    return actor.system.attributes?.[attribute]?.value || 0;
}

/**
 * Roll a skill or attribute dice pool for the given actor.
 * `skillKey` selects an entry from actor.system.skills (via getSkillByKey).
 */
export async function rollSkillPool(actor, { skillKey = null, attribute = null, extraDice = 0, label = null } = {}) {
    let dicePool = 0;
    let resolvedLabel = label;
    let skill = null;

    if (skillKey) skill = getSkillByKey(actor, skillKey);

    if (skill) {
        dicePool = calculateSkillDice(actor, skill);
        if (!resolvedLabel) resolvedLabel = `${skill.name} (${skill.rank})`;
    } else if (attribute) {
        dicePool = getAttributeValue(actor, attribute);
        if (!resolvedLabel) resolvedLabel = attribute;
    } else {
        throw new Error("rollSkillPool requires skillKey or attribute");
    }

    dicePool += (Number(extraDice) || 0);
    dicePool = Math.max(1, dicePool);

    const roll = new Roll(`${dicePool}d12`);
    await roll.evaluate();

    let successes = 0;
    const dieResultsDetails = roll.terms[0].results.map(die => {
        let cls = "failure";
        if (die.result >= 12) { cls = "critical"; successes += 2; }
        else if (die.result >= 8) { cls = "success"; successes += 1; }
        return { value: die.result, class: cls };
    });

    return { dicePool, successes, dieResultsDetails, roll, label: resolvedLabel, skill };
}

function renderDieStrip(details) {
    return details.map(d => `<span class="die-result ${d.class}">${d.value}</span>`).join(" ");
}

function skillOptionsHtml(actor, selectedKey = "") {
    const skills = getAllSkills(actor).sort((a, b) => a.name.localeCompare(b.name));
    const options = [`<option value="">— Attribute only —</option>`];
    for (const s of skills) {
        const sel = s.key === selectedKey ? " selected" : "";
        options.push(`<option value="${s.key}"${sel}>${s.name} (${s.rank})</option>`);
    }
    return options.join("");
}

const ATTRIBUTE_OPTIONS = [
    ["physique", "Physique"],
    ["finesse", "Finesse"],
    ["mind", "Mind"],
    ["presence", "Presence"],
    ["soul", "Soul"]
];

function attributeOptionsHtml(selected = "physique") {
    return ATTRIBUTE_OPTIONS
        .map(([k, label]) => `<option value="${k}"${k === selected ? " selected" : ""}>${label}</option>`)
        .join("");
}

function eligibleOpposedActors(currentActor) {
    const scene = canvas.tokens?.placeables || [];
    const seen = new Set();
    const list = [];
    for (const t of scene) {
        const a = t.actor;
        if (!a || a.id === currentActor.id || seen.has(a.id)) continue;
        seen.add(a.id);
        list.push(a);
    }
    if (list.length === 0) {
        for (const a of game.actors?.contents || []) {
            if (a.id === currentActor.id) continue;
            list.push(a);
        }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
}

function targetActorOptionsHtml(currentActor, preselectId = "") {
    const actors = eligibleOpposedActors(currentActor);
    let selected = preselectId;
    if (!selected) {
        const targeted = [...(game.user.targets || [])][0]?.actor;
        if (targeted && targeted.id !== currentActor.id) selected = targeted.id;
    }
    if (actors.length === 0) return `<option value="">(no other actors available)</option>`;
    return actors
        .map(a => `<option value="${a.id}"${a.id === selected ? " selected" : ""}>${a.name}</option>`)
        .join("");
}

/**
 * Open the opposed-roll dialog from the given attacker actor.
 */
export async function openOpposedRollDialog(actor) {
    const targets = eligibleOpposedActors(actor);
    if (targets.length === 0) {
        ui.notifications.warn("No other actors available for an opposed roll.");
        return;
    }

    const selfSkillHtml = skillOptionsHtml(actor);
    const attrHtml = attributeOptionsHtml();
    const targetHtml = targetActorOptionsHtml(actor);

    const content = `
        <form class="thefade-opposed-dialog">
            <div class="form-group">
                <label>Your skill:</label>
                <select name="selfSkill">${selfSkillHtml}</select>
            </div>
            <div class="form-group">
                <label>Attribute (if no skill):</label>
                <select name="selfAttr">${attrHtml}</select>
            </div>
            <div class="form-group">
                <label>Extra dice (Aid, gear, etc.):</label>
                <input type="number" name="selfExtra" value="0" />
            </div>
            <hr/>
            <div class="form-group">
                <label>Opponent:</label>
                <select name="targetId">${targetHtml}</select>
            </div>
            <div class="form-group">
                <label>Opponent skill:</label>
                <select name="targetSkill"><option value="">(choose opponent first)</option></select>
            </div>
            <div class="form-group">
                <label>Opponent attribute (if no skill):</label>
                <select name="targetAttr">${attrHtml}</select>
            </div>
            <div class="form-group">
                <label>Opponent extra dice:</label>
                <input type="number" name="targetExtra" value="0" />
            </div>
        </form>
    `;

    const choice = await new Promise(resolve => {
        const dlg = new Dialog({
            title: "Opposed Roll",
            content,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice"></i>', label: "Roll",
                    callback: html => resolve({
                        selfSkillKey: html.find('[name="selfSkill"]').val(),
                        selfAttr: html.find('[name="selfAttr"]').val(),
                        selfExtra: parseInt(html.find('[name="selfExtra"]').val()) || 0,
                        targetId: html.find('[name="targetId"]').val(),
                        targetSkillKey: html.find('[name="targetSkill"]').val(),
                        targetAttr: html.find('[name="targetAttr"]').val(),
                        targetExtra: parseInt(html.find('[name="targetExtra"]').val()) || 0
                    })
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
            },
            default: "roll",
            close: () => resolve(null),
            render: html => {
                const targetSel = html.find('[name="targetId"]');
                const targetSkillSel = html.find('[name="targetSkill"]');
                const refreshTargetSkills = () => {
                    const target = game.actors.get(targetSel.val());
                    if (!target) {
                        targetSkillSel.html('<option value="">(no target)</option>');
                        return;
                    }
                    targetSkillSel.html(skillOptionsHtml(target));
                };
                targetSel.on("change", refreshTargetSkills);
                refreshTargetSkills();
            }
        });
        dlg.render(true);
    });

    if (!choice) return;
    const target = game.actors.get(choice.targetId);
    if (!target) {
        ui.notifications.warn("Opposed roll: target actor not found.");
        return;
    }

    const attackerResult = await rollSkillPool(actor, {
        skillKey: choice.selfSkillKey || null,
        attribute: choice.selfSkillKey ? null : choice.selfAttr,
        extraDice: choice.selfExtra
    });
    const defenderResult = await rollSkillPool(target, {
        skillKey: choice.targetSkillKey || null,
        attribute: choice.targetSkillKey ? null : choice.targetAttr,
        extraDice: choice.targetExtra
    });

    let winner = "tie-defender";
    if (attackerResult.successes > defenderResult.successes) winner = "attacker";
    else if (defenderResult.successes > attackerResult.successes) winner = "defender";

    const outcomeText = winner === "attacker"
        ? `<strong>${actor.name}</strong> wins the contest.`
        : winner === "defender"
            ? `<strong>${target.name}</strong> wins the contest.`
            : `Tie — <strong>${target.name}</strong> (defender) prevails.`;

    const content2 = `
        <div class="thefade chat-card thefade-opposed-card">
            <header class="card-header"><h3>Opposed Roll</h3></header>
            <div class="card-content">
                <div class="opposed-side">
                    <p><strong>${actor.name}</strong> — ${attackerResult.label}</p>
                    <p>Pool: ${attackerResult.dicePool}d12 &nbsp; Successes: <strong>${attackerResult.successes}</strong></p>
                    <p>${renderDieStrip(attackerResult.dieResultsDetails)}</p>
                </div>
                <div class="opposed-side">
                    <p><strong>${target.name}</strong> — ${defenderResult.label}</p>
                    <p>Pool: ${defenderResult.dicePool}d12 &nbsp; Successes: <strong>${defenderResult.successes}</strong></p>
                    <p>${renderDieStrip(defenderResult.dieResultsDetails)}</p>
                </div>
                <hr/>
                <p class="opposed-outcome ${winner}">${outcomeText}</p>
            </div>
        </div>
    `;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `${actor.name} vs ${target.name}`,
        content: content2
    });
}

/**
 * Open the Aid Another dialog. Helper must have the chosen skill at
 * Practiced rank or better; on success vs DT 3 they grant +1D to the
 * ally's next matching roll.
 */
export async function openAidAnotherDialog(actor) {
    const targets = eligibleOpposedActors(actor);
    if (targets.length === 0) {
        ui.notifications.warn("No other actors available to aid.");
        return;
    }

    const content = `
        <form class="thefade-aid-dialog">
            <div class="form-group">
                <label>Ally to aid:</label>
                <select name="targetId">${targetActorOptionsHtml(actor)}</select>
            </div>
            <div class="form-group">
                <label>Skill you are using to help:</label>
                <select name="helperSkill">${skillOptionsHtml(actor)}</select>
            </div>
            <p class="hint">Requires rank Practiced or better. DT 3. On success, ally gets +1D on their next related roll.</p>
        </form>
    `;

    const choice = await new Promise(resolve => {
        const dlg = new Dialog({
            title: "Aid Another",
            content,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-hands-helping"></i>', label: "Roll to Aid",
                    callback: html => resolve({
                        targetId: html.find('[name="targetId"]').val(),
                        helperSkillKey: html.find('[name="helperSkill"]').val()
                    })
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel", callback: () => resolve(null) }
            },
            default: "roll",
            close: () => resolve(null)
        });
        dlg.render(true);
    });

    if (!choice) return;
    const target = game.actors.get(choice.targetId);
    if (!target) { ui.notifications.warn("Aid Another: ally not found."); return; }

    const helperSkill = choice.helperSkillKey ? getSkillByKey(actor, choice.helperSkillKey) : null;
    if (!helperSkill) {
        ui.notifications.warn("Aid Another requires picking a skill.");
        return;
    }
    if (!TRAINED_RANKS.has(helperSkill.rank)) {
        ui.notifications.warn(`Aid Another requires rank Practiced or better (you have ${helperSkill.rank}).`);
        return;
    }

    const result = await rollSkillPool(actor, { skillKey: helperSkill.key });
    const DT = 3;
    const success = result.successes >= DT;

    const content2 = `
        <div class="thefade chat-card thefade-aid-card">
            <header class="card-header"><h3>Aid Another</h3></header>
            <div class="card-content">
                <p><strong>${actor.name}</strong> aids <strong>${target.name}</strong> with ${helperSkill.name} (${helperSkill.rank}).</p>
                <p>Pool: ${result.dicePool}d12 &nbsp; Successes: <strong>${result.successes}</strong> / DT ${DT}</p>
                <p>${renderDieStrip(result.dieResultsDetails)}</p>
                <p class="${success ? "success" : "failure"}">
                    ${success
                        ? `<strong>+1D</strong> to ${target.name}'s next ${helperSkill.name} roll.`
                        : `Aid fails — no bonus dice granted.`}
                </p>
            </div>
        </div>
    `;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `Aid Another — ${helperSkill.name}`,
        content: content2
    });
}
