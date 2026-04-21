// TheFadeNPCSheet — simplified actor sheet for monsters and named NPCs.
import { SIZE_OPTIONS } from './constants.js';

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
        if (!this.options.editable) return;

        // Initiative roll
        html.find(".initiative-roll").click(async () => {
            const fin = this.actor.system.attributes?.finesse?.value || 0;
            const mnd = this.actor.system.attributes?.mind?.value || 0;
            const bonus = Math.floor((fin + mnd) / 2) + (this.actor.system.initiativeBonus || 0);
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
