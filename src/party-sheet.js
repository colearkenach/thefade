// TheFadePartySheet — party management sheet for XP, currency, and shared items.

export class TheFadePartySheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "actor", "party"],
            template: "systems/thefade/templates/actor/party-sheet.html",
            width: 620,
            height: 600,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "members" }],
            scrollY: [".sheet-body"]
        });
    }

    getData() {
        const data = super.getData();
        data.system = data.actor.system;

        // Resolve member actor references from stored IDs
        const memberIds = Array.isArray(data.system.members) ? data.system.members : [];
        data.resolvedMembers = memberIds
            .map(id => game.actors?.get(id))
            .filter(a => a != null)
            .map(a => ({
                id: a.id,
                name: a.name,
                img: a.img,
                hpValue: a.system.hp?.value ?? 0,
                hpMax: a.system.hp?.max ?? 0,
                level: a.system.level ?? 1,
                xp: a.system.experience ?? 0
            }));

        // Shared items on the party actor
        data.sharedItems = (data.items || []).filter(i =>
            !["skill","path","talent","species","trait","precept"].includes(i.type)
        );

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.options.editable) return;

        // Add member
        html.find(".add-member").click(() => this._onAddMember());

        // Remove member
        html.find(".member-remove").click(async ev => {
            const actorId = ev.currentTarget.dataset.actorId;
            const current = Array.isArray(this.actor.system.members) ? [...this.actor.system.members] : [];
            await this.actor.update({ "system.members": current.filter(id => id !== actorId) });
        });

        // Give XP to all members
        html.find(".give-xp").click(() => this._onGiveXP());

        // Give serpents to each member
        html.find(".give-currency").click(() => this._onGiveCurrency());

        // Divide party pool evenly among members
        html.find(".divide-pool").click(() => this._onDividePool());

        // Shared item create
        html.find(".item-create").click(ev => {
            ev.preventDefault();
            const type = ev.currentTarget.dataset.type || "item";
            this.actor.createEmbeddedDocuments("Item", [{
                name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                type
            }]);
        });

        // Shared item edit
        html.find(".item-edit").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            this.actor.items.get(li.data("item-id"))?.sheet.render(true);
        });

        // Shared item delete
        html.find(".item-delete").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            if (!item) return;
            new Dialog({
                title: `Delete ${item.name}`,
                content: `<p>Delete <strong>${item.name}</strong> from the party stash?</p>`,
                buttons: {
                    yes: { label: "Delete", icon: '<i class="fas fa-trash"></i>', callback: () => item.delete() },
                    no:  { label: "Cancel" }
                },
                default: "no"
            }).render(true);
        });
    }

    async _onAddMember() {
        const characters = (game.actors?.contents || []).filter(a => a.type === "character");
        if (!characters.length) {
            ui.notifications.warn("No character actors found in the world.");
            return;
        }

        const current = Array.isArray(this.actor.system.members) ? this.actor.system.members : [];
        const options = characters
            .map(a => `<option value="${a.id}" ${current.includes(a.id) ? "disabled" : ""}>${a.name}${current.includes(a.id) ? " (already added)" : ""}</option>`)
            .join("");

        new Dialog({
            title: "Add Party Member",
            content: `<div style="padding:8px 0"><label>Choose a character:</label><select id="member-select" style="width:100%;margin-top:4px">${options}</select></div>`,
            buttons: {
                add: {
                    label: "Add",
                    icon: '<i class="fas fa-user-plus"></i>',
                    callback: async html => {
                        const id = html.find("#member-select").val();
                        if (!id || current.includes(id)) return;
                        await this.actor.update({ "system.members": [...current, id] });
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "add"
        }).render(true);
    }

    async _onGiveXP() {
        const memberIds = Array.isArray(this.actor.system.members) ? this.actor.system.members : [];
        const members = memberIds.map(id => game.actors?.get(id)).filter(a => a?.type === "character");
        if (!members.length) {
            ui.notifications.warn("No party members to give XP to.");
            return;
        }

        new Dialog({
            title: "Give XP to Party",
            content: `
                <div style="padding:8px 0">
                    <p>Give XP to all <strong>${members.length}</strong> party member(s).</p>
                    <label>XP amount:</label>
                    <input id="xp-amount" type="number" value="100" min="0" style="width:100%;margin-top:4px" />
                </div>`,
            buttons: {
                give: {
                    label: "Give XP",
                    icon: '<i class="fas fa-star"></i>',
                    callback: async html => {
                        const amount = Number(html.find("#xp-amount").val()) || 0;
                        if (amount <= 0) return;
                        for (const actor of members) {
                            const currentXP = actor.system.experience ?? 0;
                            await actor.update({ "system.experience": currentXP + amount });
                        }
                        ui.notifications.info(`Gave ${amount} XP to ${members.length} party member(s).`);
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "give"
        }).render(true);
    }

    async _onGiveCurrency() {
        const memberIds = Array.isArray(this.actor.system.members) ? this.actor.system.members : [];
        const members = memberIds.map(id => game.actors?.get(id)).filter(a => a?.type === "character");
        if (!members.length) {
            ui.notifications.warn("No party members to give currency to.");
            return;
        }

        new Dialog({
            title: "Give Serpents to Each Member",
            content: `
                <div style="padding:8px 0">
                    <p>Give <em>each</em> of the <strong>${members.length}</strong> party member(s) this many serpents.</p>
                    <label>Serpents per member:</label>
                    <input id="currency-amount" type="number" value="0" min="0" style="width:100%;margin-top:4px" />
                </div>`,
            buttons: {
                give: {
                    label: "Give",
                    icon: '<i class="fas fa-coins"></i>',
                    callback: async html => {
                        const amount = Number(html.find("#currency-amount").val()) || 0;
                        if (amount <= 0) return;
                        for (const actor of members) {
                            const current = actor.system.currency?.serpents ?? 0;
                            await actor.update({ "system.currency.serpents": current + amount });
                        }
                        ui.notifications.info(`Gave ${amount} serpents to each of ${members.length} member(s).`);
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "give"
        }).render(true);
    }

    async _onDividePool() {
        const memberIds = Array.isArray(this.actor.system.members) ? this.actor.system.members : [];
        const members = memberIds.map(id => game.actors?.get(id)).filter(a => a?.type === "character");
        if (!members.length) {
            ui.notifications.warn("No party members to distribute currency to.");
            return;
        }

        const partyPool = this.actor.system.currency?.serpents ?? 0;
        const share = Math.floor(partyPool / members.length);
        const remainder = partyPool % members.length;

        new Dialog({
            title: "Divide Party Pool",
            content: `
                <div style="padding:8px 0">
                    <p>Divide <strong>${partyPool} serpents</strong> among <strong>${members.length}</strong> members.</p>
                    <p>Each member gets <strong>${share}</strong> serpents. Remainder: ${remainder}.</p>
                    <p><em>The remainder stays in the party pool.</em></p>
                </div>`,
            buttons: {
                divide: {
                    label: "Distribute",
                    icon: '<i class="fas fa-divide"></i>',
                    callback: async () => {
                        if (share <= 0) {
                            ui.notifications.warn("Not enough serpents to distribute.");
                            return;
                        }
                        for (const actor of members) {
                            const current = actor.system.currency?.serpents ?? 0;
                            await actor.update({ "system.currency.serpents": current + share });
                        }
                        await this.actor.update({ "system.currency.serpents": remainder });
                        ui.notifications.info(`Distributed ${share} serpents to each of ${members.length} member(s). ${remainder} remain in the party pool.`);
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "divide"
        }).render(true);
    }
}
