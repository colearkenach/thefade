// Shop actors: stock for sale, a purse, and buy/sell transactions that any
// observer can make (the active GM completes them, see apps/shop-trade.mjs).
import TheFadeActorSheet from "./base-actor-sheet.mjs";
import { NON_TRADE_TYPES, buyFromShop, salePrice, sellToShop, tradeAccounts } from "../apps/shop-trade.mjs";

const { DialogV2 } = foundry.applications.api;
const escape = foundry.utils.escapeHTML;

export default class TheFadeShopSheet extends TheFadeActorSheet {
    static HAS_MODES = false;

    static DEFAULT_OPTIONS = {
        classes: ["shop"],
        position: { width: 660, height: 680 },
        actions: {
            buy: TheFadeShopSheet.#onBuy,
            sell: TheFadeShopSheet.#onSell
        }
    };

    static PARTS = {
        header: { template: "systems/thefade/templates/actor/shop/header.hbs" },
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        stock: { template: "systems/thefade/templates/actor/shop/stock.hbs", scrollable: [""] },
        description: { template: "systems/thefade/templates/actor/shop/description.hbs", scrollable: [""] }
    };

    static TABS = {
        primary: {
            tabs: [{ id: "stock", icon: "fa-solid fa-store" }, { id: "description", icon: "fa-solid fa-feather-pointed" }],
            initial: "stock",
            labelPrefix: "THEFADE.Shop.Tab"
        }
    };

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (context.tabs?.[partId]) context.tab = context.tabs[partId];
        switch (partId) {
            case "stock":
                context.stock = await Promise.all(this.document.items.filter(i => !NON_TRADE_TYPES.has(i.type))
                    .sort((a, b) => a.name.localeCompare(b.name)).map(async i => ({
                        ...(await this._prepareItem(i)),
                        price: Number(i.system.price) || 0,
                        quantity: Number(i.system.quantity) || 1
                    })));
                context.canTrade = !!tradeAccounts().length;
                context.physicalTypes = CONFIG.THEFADE.physicalItemTypes.join(",");
                break;
            case "description":
                context.enrichedDescription = await this._enrich(this.document.system.description);
                context.enrichedNotes = game.user.isGM ? await this._enrich(this.document.system.notes) : "";
                break;
        }
        return context;
    }

    /** Observers may drop their own items here to sell them. @override */
    _canDragDrop() {
        return true;
    }

    /** A player dropping their own item on the shop offers to sell it. @override */
    async _onDropItem(event, item) {
        if (!this.document.isOwner && item.actor?.isOwner) return this.#sellDialog(item);
        return super._onDropItem(event, item);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async #onBuy(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        const accounts = tradeAccounts();
        if (!accounts.length) return ui.notifications.warn("THEFADE.Shop.noAccounts", { localize: true });
        const price = Number(item.system.price) || 0;
        const stock = Number(item.system.quantity) || 1;
        const options = accounts.map(a => `<option value="${a.uuid}">${escape(a.name)} (${a.serpents} sp)</option>`).join("");
        const result = await DialogV2.input({
            window: { title: game.i18n.format("THEFADE.Shop.buyTitle", { name: item.name }) },
            classes: ["thefade"],
            content: `
                <p>${game.i18n.format("THEFADE.Shop.buyLead", { name: escape(item.name), price, stock })}</p>
                <div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.quantity")}</label>
                    <div class="form-fields"><input type="number" name="quantity" value="1" min="1" max="${stock}" step="1"></div></div>
                <div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.payer")}</label>
                    <div class="form-fields"><select name="buyer">${options}</select></div></div>
                <p class="tf-total">${game.i18n.format("THEFADE.Shop.total", { total: price })}</p>`,
            render: (event, dialog) => {
                const form = dialog.element.querySelector("form");
                form.addEventListener("input", () => {
                    const quantity = Math.max(1, Number(form.elements.quantity.value) || 1);
                    form.querySelector(".tf-total").textContent = game.i18n.format("THEFADE.Shop.total", { total: quantity * price });
                });
            },
            ok: { label: "THEFADE.Shop.buy", icon: "fa-solid fa-cart-shopping" },
            rejectClose: false
        });
        if (result) return buyFromShop(this.document, item, result.buyer, result.quantity);
    }

    static async #onSell() {
        const items = game.actors.filter(a => a.type === "character" && a.isOwner)
            .flatMap(actor => actor.items.filter(i => !NON_TRADE_TYPES.has(i.type) && i.system.isPhysical));
        if (!items.length) return ui.notifications.warn("THEFADE.Shop.nothingToSell", { localize: true });
        const groups = Object.groupBy(items, i => i.actor.id);
        const options = Object.values(groups).map(list => `<optgroup label="${escape(list[0].actor.name)}">${list.map(i =>
            `<option value="${i.uuid}">${escape(i.name)} ×${Number(i.system.quantity) || 1}</option>`).join("")}</optgroup>`).join("");
        const result = await DialogV2.input({
            window: { title: "THEFADE.Shop.sellTitle" },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.item")}</label><div class="form-fields"><select name="uuid">${options}</select></div></div>`,
            ok: { label: "THEFADE.Shop.next", icon: "fa-solid fa-arrow-right" },
            rejectClose: false
        });
        const item = result?.uuid ? await fromUuid(result.uuid) : null;
        if (item) return this.#sellDialog(item);
    }

    /** Confirm quantity, price (GM only) and who receives payment for an item being sold. */
    async #sellDialog(item) {
        const held = Number(item.system.quantity) || 1;
        const unit = salePrice(item);
        const accounts = tradeAccounts().filter(a => a.uuid === item.actor.uuid || a.isParty);
        const options = accounts.map(a => `<option value="${a.uuid}" ${a.uuid === item.actor.uuid ? "selected" : ""}>${escape(a.name)}</option>`).join("");
        const isGM = game.user.isGM;
        const result = await DialogV2.input({
            window: { title: game.i18n.format("THEFADE.Shop.sellItemTitle", { name: item.name }) },
            classes: ["thefade"],
            content: `
                <p>${game.i18n.format("THEFADE.Shop.sellLead", { name: escape(item.name), price: unit, shop: escape(this.document.name), purse: this.document.system.currency.serpents })}</p>
                <div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.quantity")}</label>
                    <div class="form-fields"><input type="number" name="quantity" value="1" min="1" max="${held}" step="1"></div></div>
                ${isGM ? `<div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.unitPrice")}</label>
                    <div class="form-fields"><input type="number" name="unitPrice" value="${unit}" min="0" step="0.01"></div></div>` : ""}
                <div class="form-group"><label>${game.i18n.localize("THEFADE.Shop.payTo")}</label>
                    <div class="form-fields"><select name="recipient">${options}</select></div></div>`,
            ok: { label: "THEFADE.Shop.sell", icon: "fa-solid fa-hand-holding-dollar" },
            rejectClose: false
        });
        if (!result) return;
        return sellToShop(this.document, item, { quantity: result.quantity, unitPrice: result.unitPrice, recipientUuid: result.recipient });
    }
}
