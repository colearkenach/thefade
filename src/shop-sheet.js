// TheFadeShopSheet — shop actor sheet for selling items to and buying from the party.

export class TheFadeShopSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["thefade", "sheet", "actor", "shop"],
            template: "systems/thefade/templates/actor/shop-sheet.html",
            width: 640,
            height: 660,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stock" }],
            scrollY: [".sheet-body"]
        });
    }

    getData() {
        const data = super.getData();
        data.system = data.actor.system;

        data.stock = (data.items || []).filter(i =>
            !["skill", "path", "talent", "species", "trait", "precept"].includes(i.type)
        );

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Buy is available to all users with at least observer permission
        html.find(".item-buy").click(ev => this._onBuyItem(ev));

        if (!this.options.editable) return;

        html.find(".item-create").click(ev => {
            ev.preventDefault();
            const type = ev.currentTarget.dataset.type || "item";
            this.actor.createEmbeddedDocuments("Item", [{
                name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                type
            }]);
        });

        html.find(".item-edit").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            this.actor.items.get(li.data("item-id"))?.sheet.render(true);
        });

        html.find(".item-delete").click(ev => {
            const li = $(ev.currentTarget).closest("[data-item-id]");
            const item = this.actor.items.get(li.data("item-id"));
            if (!item) return;
            new Dialog({
                title: `Remove ${item.name}`,
                content: `<p>Remove <strong>${item.name}</strong> from the shop inventory?</p>`,
                buttons: {
                    yes: { label: "Remove", icon: '<i class="fas fa-trash"></i>', callback: () => item.delete() },
                    no:  { label: "Cancel" }
                },
                default: "no"
            }).render(true);
        });

        html.find(".sell-to-shop").click(() => this._onSellToShop());
    }

    /** Returns buyer/recipient options sourced from all party actors in the world. */
    _getPartyOptions() {
        const partyActors = (game.actors?.contents || []).filter(a => a.type === "party");
        const seen = new Set();
        const options = [];

        for (const party of partyActors) {
            const memberIds = Array.isArray(party.system.members) ? party.system.members : [];
            for (const id of memberIds) {
                if (seen.has(id)) continue;
                seen.add(id);
                const actor = game.actors?.get(id);
                if (actor) {
                    options.push({
                        key: `char_${id}`,
                        label: `${actor.name} (${actor.system.currency?.serpents ?? 0} sp)`,
                        serpents: actor.system.currency?.serpents ?? 0,
                        actorId: id,
                        isParty: false
                    });
                }
            }
            if (!seen.has(`party_${party.id}`)) {
                seen.add(`party_${party.id}`);
                options.push({
                    key: `party_${party.id}`,
                    label: `${party.name} – Party Stash (${party.system.currency?.serpents ?? 0} sp)`,
                    serpents: party.system.currency?.serpents ?? 0,
                    actorId: party.id,
                    isParty: true
                });
            }
        }

        return options;
    }

    async _onBuyItem(ev) {
        const li = $(ev.currentTarget).closest("[data-item-id]");
        const item = this.actor.items.get(li.data("item-id"));
        if (!item) return;

        const price = Number(item.system?.price) || 0;
        const availableQty = Number(item.system?.quantity) || 1;
        const buyers = this._getPartyOptions();

        if (!buyers.length) {
            ui.notifications.warn("No party members found. Make sure a Party actor exists with linked members.");
            return;
        }

        const buyerOptions = buyers.map(b => `<option value="${b.key}">${b.label}</option>`).join("");

        new Dialog({
            title: `Buy: ${item.name}`,
            content: `
                <div style="padding:8px 0">
                    <p>Purchasing: <strong>${item.name}</strong> — ${price} sp each</p>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Quantity:</label>
                        <input id="buy-qty" type="number" value="1" min="1" max="${availableQty}"
                               style="width:80px;margin-left:8px" />
                        <span style="margin-left:4px;color:#888">of ${availableQty} available</span>
                    </div>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Who pays?</label>
                        <select id="buyer-select" style="width:100%;margin-top:4px">${buyerOptions}</select>
                    </div>
                    <p id="buy-total" style="font-weight:bold;margin-top:8px">Total: ${price} sp</p>
                </div>`,
            render: html => {
                html.find("#buy-qty").on("input", () => {
                    const qty = Math.max(1, Number(html.find("#buy-qty").val()) || 1);
                    html.find("#buy-total").text(`Total: ${qty * price} sp`);
                });
            },
            buttons: {
                buy: {
                    label: "Confirm Purchase",
                    icon: '<i class="fas fa-shopping-cart"></i>',
                    callback: async html => {
                        const qty = Math.max(1, Math.min(availableQty, Number(html.find("#buy-qty").val()) || 1));
                        const buyerKey = html.find("#buyer-select").val();
                        const buyer = buyers.find(b => b.key === buyerKey);
                        if (!buyer) return;

                        const total = qty * price;
                        if (buyer.serpents < total) {
                            ui.notifications.error(
                                `Not enough serpents — needs ${total} sp but only has ${buyer.serpents} sp.`
                            );
                            return;
                        }

                        const buyerActor = game.actors?.get(buyer.actorId);
                        if (!buyerActor) return;

                        await buyerActor.update({ "system.currency.serpents": buyer.serpents - total });

                        const shopTreasury = this.actor.system.currency?.serpents ?? 0;
                        await this.actor.update({ "system.currency.serpents": shopTreasury + total });

                        const itemData = item.toObject();
                        itemData.system.quantity = qty;
                        delete itemData._id;
                        await buyerActor.createEmbeddedDocuments("Item", [itemData]);

                        const newQty = availableQty - qty;
                        if (newQty <= 0) {
                            await item.delete();
                        } else {
                            await item.update({ "system.quantity": newQty });
                        }

                        ui.notifications.info(
                            `${buyerActor.name} purchased ${qty}× ${item.name} for ${total} sp.`
                        );
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "buy"
        }).render(true);
    }

    async _onSellToShop() {
        const partyActors = (game.actors?.contents || []).filter(a => a.type === "party");
        const sellers = [];
        const seen = new Set();

        for (const party of partyActors) {
            const memberIds = Array.isArray(party.system.members) ? party.system.members : [];
            for (const id of memberIds) {
                if (seen.has(id)) continue;
                seen.add(id);
                const actor = game.actors?.get(id);
                if (actor) sellers.push({ id, name: actor.name, actor });
            }
        }

        if (!sellers.length) {
            ui.notifications.warn("No party members found. Make sure a Party actor exists with linked members.");
            return;
        }

        const sellerOptions = sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

        new Dialog({
            title: "Sell to Shop — Choose Seller",
            content: `
                <div style="padding:8px 0">
                    <label>Which party member is selling?</label>
                    <select id="seller-select" style="width:100%;margin-top:4px">${sellerOptions}</select>
                </div>`,
            buttons: {
                next: {
                    label: "Next →",
                    icon: '<i class="fas fa-arrow-right"></i>',
                    callback: html => {
                        const sellerId = html.find("#seller-select").val();
                        const seller = sellers.find(s => s.id === sellerId);
                        if (seller) this._onSellToShopStep2(seller.actor, partyActors);
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "next"
        }).render(true);
    }

    async _onSellToShopStep2(sellerActor, partyActors) {
        const sellableItems = (sellerActor.items?.contents || []).filter(i =>
            !["skill", "path", "talent", "species", "trait", "precept"].includes(i.type)
        );

        if (!sellableItems.length) {
            ui.notifications.warn(`${sellerActor.name} has no items to sell.`);
            return;
        }

        // Build recipient options from party members + party stashes
        const recipients = [];
        const seen = new Set();
        for (const party of partyActors) {
            const memberIds = Array.isArray(party.system.members) ? party.system.members : [];
            for (const id of memberIds) {
                if (seen.has(id)) continue;
                seen.add(id);
                const actor = game.actors?.get(id);
                if (actor) {
                    recipients.push({
                        key: `char_${id}`,
                        label: actor.name,
                        actorId: id,
                        isParty: false
                    });
                }
            }
            if (!seen.has(`party_${party.id}`)) {
                seen.add(`party_${party.id}`);
                recipients.push({
                    key: `party_${party.id}`,
                    label: `${party.name} – Party Stash`,
                    actorId: party.id,
                    isParty: true
                });
            }
        }

        const itemOptions = sellableItems
            .map(i => {
                const qty = Number(i.system?.quantity) || 1;
                const price = Number(i.system?.price) || 0;
                return `<option value="${i.id}" data-price="${price}" data-qty="${qty}">${i.name} (×${qty})</option>`;
            })
            .join("");

        const recipientOptions = recipients.map(r => `<option value="${r.key}">${r.label}</option>`).join("");
        const shopTreasury = this.actor.system.currency?.serpents ?? 0;

        new Dialog({
            title: `Sell to Shop — ${sellerActor.name}`,
            content: `
                <div style="padding:8px 0">
                    <p>Selling from: <strong>${sellerActor.name}</strong></p>
                    <p style="color:#888;margin-top:0">Shop treasury: <strong>${shopTreasury} sp</strong></p>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Item to sell:</label>
                        <select id="sell-item-select" style="width:100%;margin-top:4px">${itemOptions}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Quantity:</label>
                        <input id="sell-qty" type="number" value="1" min="1"
                               style="width:80px;margin-left:8px" />
                    </div>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Sale price (sp each):</label>
                        <input id="sell-price" type="number" value="0" min="0"
                               style="width:100px;margin-left:8px" />
                    </div>
                    <div class="form-group" style="margin-bottom:8px">
                        <label>Payment goes to:</label>
                        <select id="recipient-select" style="width:100%;margin-top:4px">${recipientOptions}</select>
                    </div>
                    <p id="sell-total" style="font-weight:bold;margin-top:8px">Total: 0 sp</p>
                </div>`,
            render: html => {
                const updateFields = () => {
                    const selected = html.find("#sell-item-select option:selected");
                    html.find("#sell-price").val(selected.data("price") || 0);
                    html.find("#sell-qty").attr("max", selected.data("qty") || 1);
                    const qty = Number(html.find("#sell-qty").val()) || 1;
                    const price = Number(html.find("#sell-price").val()) || 0;
                    html.find("#sell-total").text(`Total: ${qty * price} sp`);
                };
                const updateTotal = () => {
                    const qty = Number(html.find("#sell-qty").val()) || 1;
                    const price = Number(html.find("#sell-price").val()) || 0;
                    html.find("#sell-total").text(`Total: ${qty * price} sp`);
                };
                html.find("#sell-item-select").on("change", updateFields);
                html.find("#sell-qty, #sell-price").on("input", updateTotal);
                updateFields();
            },
            buttons: {
                sell: {
                    label: "Confirm Sale",
                    icon: '<i class="fas fa-hand-holding-usd"></i>',
                    callback: async html => {
                        const itemId = html.find("#sell-item-select").val();
                        const qty = Math.max(1, Number(html.find("#sell-qty").val()) || 1);
                        const unitPrice = Math.max(0, Number(html.find("#sell-price").val()) || 0);
                        const totalPayment = qty * unitPrice;
                        const recipientKey = html.find("#recipient-select").val();
                        const recipient = recipients.find(r => r.key === recipientKey);
                        if (!recipient) return;

                        const itemToSell = sellerActor.items.get(itemId);
                        if (!itemToSell) return;

                        const currentShopTreasury = this.actor.system.currency?.serpents ?? 0;
                        if (currentShopTreasury < totalPayment) {
                            ui.notifications.error(
                                `The shop only has ${currentShopTreasury} sp but owes ${totalPayment} sp.`
                            );
                            return;
                        }

                        const recipientActor = game.actors?.get(recipient.actorId);
                        if (!recipientActor) return;

                        const recipientSerpents = recipientActor.system.currency?.serpents ?? 0;
                        await recipientActor.update({ "system.currency.serpents": recipientSerpents + totalPayment });
                        await this.actor.update({ "system.currency.serpents": currentShopTreasury - totalPayment });

                        const itemData = itemToSell.toObject();
                        itemData.system.quantity = qty;
                        delete itemData._id;
                        await this.actor.createEmbeddedDocuments("Item", [itemData]);

                        const currentQty = Number(itemToSell.system?.quantity) || 1;
                        if (qty >= currentQty) {
                            await itemToSell.delete();
                        } else {
                            await itemToSell.update({ "system.quantity": currentQty - qty });
                        }

                        ui.notifications.info(
                            `${sellerActor.name} sold ${qty}× ${itemToSell.name} for ${totalPayment} sp → ${recipientActor.name}.`
                        );
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "sell"
        }).render(true);
    }
}
