// TheFadeNPCSheet — simplified actor sheet for monsters and named NPCs.
import { SIZE_OPTIONS } from './constants.js';
import { ANATOMY_OPTIONS } from './rules.js';
import { rollHitLocation, locationLabel } from './hit-location.js';
import { buildProtectionView } from './protection.js';
import { activateAbility, getActiveTemporaryBonusEntries } from './abilities.js';
import {
    CREATURE_TYPE_OPTIONS,
    buildCreatureSubtypeSelector,
    getCreatureRuleSources,
    normalizeCreatureType
} from './creature-rules.js';

export class TheFadeNPCSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "actor", "npc"],
            template: "systems/thefade/templates/actor/npc-sheet.html",
            width: 680,
            height: 680,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            scrollY: [".sheet-body"]
        });
    }

    getData() {
        const data = super.getData();
        data.system = data.actor.system;
        data.sizeOptions = SIZE_OPTIONS;
        data.creatureTypeOptions = CREATURE_TYPE_OPTIONS;
        data.selectedCreatureType = normalizeCreatureType(data.system.creatureType);
        data.creatureSubtypeSelector = buildCreatureSubtypeSelector(data.system, "npc");
        data.creatureRuleAbilityView = {
            sources: getCreatureRuleSources(data.system, "npc"),
            canActivate: true
        };
        data.temporaryAbilityBonuses = getActiveTemporaryBonusEntries(this.actor).map(entry => ({
            ...entry,
            remainingRounds: entry.combatId
                ? Math.max(0, Number(entry.expiresRound) - (Number(game.combat?.round) || 0))
                : Math.max(1, Number(entry.durationRounds) || 1)
        }));
        data.anatomyOptions = ANATOMY_OPTIONS;
        data.anatomyRulesEnabled = game.settings?.get("thefade", "alternateAnatomyEnabled") ?? false;
        data.protectionRows = buildProtectionView(
            this.actor,
            data.anatomyRulesEnabled ? (data.system.anatomy?.preset || "humanoid") : "humanoid"
        );

        // Categorize embedded items
        const items = data.items || [];
        data.weapons = items.filter(i => i.type === "weapon");
        data.armor   = items.filter(i => i.type === "armor");
        data.gear    = items.filter(i => !["weapon","armor","skill","path","spell","talent","species","trait","precept"].includes(i.type));

        // Calculate attack dice for each weapon (attribute / 2, untrained)
        const attrs = data.system.attributes || {};
        for (const w of data.weapons) {
            const attr = w.system?.attribute || "physique";
            const attrVal = attrs[attr]?.value || 1;
            w.calculatedDice = Math.max(1, Math.floor(attrVal / 2) + (w.system?.miscBonus || 0));
            const abbr = { physique:"PHY", finesse:"FIN", mind:"MND", presence:"PRS", soul:"SOL" };
            w.attributeAbbr = abbr[attr] || "PHY";
        }

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.creature-subtype-add').on('click', async ev => {
            ev.preventDefault();
            const selector = $(ev.currentTarget).closest('.creature-subtype-selector');
            const id = selector.find('.creature-subtype-choice').val();
            if (!id) return;
            await this.actor.update({ "system.creatureSubtypes": [...new Set([...(this.actor.system.creatureSubtypes || []), id])] });
        });

        html.find('.creature-subtype-remove').on('click', async ev => {
            ev.preventDefault();
            const id = ev.currentTarget.dataset.subtypeId;
            await this.actor.update({ "system.creatureSubtypes": (this.actor.system.creatureSubtypes || []).filter(value => value !== id) });
        });

        html.find('.creature-rule-ability-use').on('click', async ev => {
            ev.preventDefault();
            const sourceId = ev.currentTarget.closest('[data-creature-rule-source]')?.dataset.creatureRuleSource;
            const abilityId = ev.currentTarget.closest('[data-creature-rule-ability]')?.dataset.creatureRuleAbility;
            const source = getCreatureRuleSources(this.actor.system, "npc").find(entry => entry.id === sourceId);
            const ability = source?.abilities.find(entry => entry.id === abilityId);
            if (source && ability) await activateAbility(this.actor, ability, source);
        });

        html.find('.temporary-ability-bonus-remove').on('click', async ev => {
            ev.preventDefault();
            const id = ev.currentTarget.dataset.temporaryBonusId;
            await this.actor.update({ "system.temporaryBonuses": (this.actor.system.temporaryBonuses || []).filter(entry => entry.id !== id) });
        });

        html.find('.roll-anatomy-location').on('click', async ev => {
            ev.preventDefault();
            const controls = $(ev.currentTarget).closest('.anatomy-controls');
            const facing = controls.find('.anatomy-roll-facing').val() || "front";
            const preset = game.settings?.get("thefade", "alternateAnatomyEnabled")
                ? (this.actor.system?.anatomy?.preset || "humanoid")
                : "humanoid";
            const result = await rollHitLocation(facing, preset);
            const detail = result.sideRoll
                ? `1d12=${result.roll}, 1d2=${result.sideRoll}`
                : `1d12=${result.roll}`;
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${this.actor.name}: Hit Location`,
                content: `<div class="thefade-hit-location-roll"><strong>${result.label || locationLabel(result.location)}</strong><br><span>${detail} — ${result.column}</span></div>`
            });
        });

        if (!this.options.editable) return;

        // Initiative roll
        html.find(".initiative-roll").click(async () => {
            const fin = this.actor.system.attributes?.finesse?.value || 0;
            const mnd = this.actor.system.attributes?.mind?.value || 0;
            const bonus = Math.floor((fin + mnd) / 2)
                + (this.actor.system.initiativeBonus || 0)
                + Number(this.actor.system.itemBonuses?.initiative || 0);
            const roll = await new Roll(`1d12 + ${bonus}`).evaluate();
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${this.actor.name} rolls Initiative!`
            });
        });

        // Attack roll from weapon row
        html.find(".attack-roll").click(async ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            if (!item) return;
            const dice = item.calculatedDice ?? 1;
            const roll = await new Roll(`${dice}d12`).evaluate();
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${this.actor.name} attacks with ${item.name} (${dice}d12)`
            });
        });

        // Clear all conditions + stance
        html.find(".combat-state-clear").click(async () => {
            const conditions = this.actor.system?.conditions || {};
            const update = { "system.activeStance": "none" };
            for (const key of Object.keys(conditions)) {
                update[`system.conditions.${key}.active`] = false;
            }
            await this.actor.update(update);
        });

        // Item create
        html.find(".item-create").click(ev => {
            ev.preventDefault();
            const type = ev.currentTarget.dataset.type || "item";
            this.actor.createEmbeddedDocuments("Item", [{
                name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                type
            }]);
        });

        // Item edit
        html.find(".item-edit").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            item?.sheet.render(true);
        });

        // Item delete
        html.find(".item-delete").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            if (!item) return;
            new Dialog({
                title: `Delete ${item.name}`,
                content: `<p>Delete <strong>${item.name}</strong>?</p>`,
                buttons: {
                    yes: { label: "Delete", icon: '<i class="fas fa-trash"></i>', callback: () => item.delete() },
                    no:  { label: "Cancel" }
                },
                default: "no"
            }).render(true);
        });

        // Armor reset (current AP back to max, including strengthening bonus)
        html.find(".armor-reset").click(async ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            if (!item) return;
            const maxAP = (Number(item.system.ap) || 0) + (Number(item.system.apIncrease) || 0);
            await item.update({ "system.currentAP": maxAP });
        });
    }
}
