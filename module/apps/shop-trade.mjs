// Buying from and selling to shop actors. Transactions run on the active GM
// (see socket.mjs) so players can trade with GM-owned shops.
import { registerGMHandler, requestGM } from "../socket.mjs";

/** Item types that are character features, never shop stock. */
export const NON_TRADE_TYPES = new Set(["skill", "path", "monsterpath", "talent", "species", "monsterspecies", "trait", "precept", "heritage", "mutation", "disease", "downtime", "trap", "hazard"]);

const serpents = actor => Number(actor.system.currency?.serpents) || 0;

/** Items sell for half their listed value (Core, "Bartering"). */
export function salePrice(item) {
    return Math.floor((Number(item.system.price) || 0) / 2);
}

/** Characters and party stashes a user may pay from or be paid into. */
export function tradeAccounts(user = game.user) {
    return game.actors.filter(actor => ["character", "party"].includes(actor.type) && actor.testUserPermission(user, "OWNER"))
        .map(actor => ({ uuid: actor.uuid, name: actor.name, serpents: serpents(actor), isParty: actor.type === "party" }))
        .sort((a, b) => (a.isParty - b.isParty) || a.name.localeCompare(b.name));
}

/** Copy an item onto an actor, stacking with an identical item it already has. */
async function giveItem(actor, item, quantity) {
    const existing = actor.items.find(i => i.name === item.name && i.type === item.type && (i.system.price ?? 0) === (item.system.price ?? 0));
    if (existing && "quantity" in existing.system) return existing.update({ "system.quantity": existing.system.quantity + quantity });
    const data = item.toObject();
    delete data._id;
    if ("quantity" in data.system) data.system.quantity = quantity;
    data.system.equipped = false;
    return actor.createEmbeddedDocuments("Item", [data]);
}

/** Remove a quantity of an item, deleting it when none remain. */
async function takeItem(item, quantity) {
    const remaining = (Number(item.system.quantity) || 1) - quantity;
    return remaining > 0 ? item.update({ "system.quantity": remaining }) : item.delete();
}

async function resolve(uuid) {
    const doc = await fromUuid(uuid);
    return doc?.actor ?? doc;
}

registerGMHandler("shopBuy", async ({ shopUuid, itemId, buyerUuid, quantity }, userId) => {
    const user = game.users.get(userId);
    const shop = await resolve(shopUuid);
    const buyer = await resolve(buyerUuid);
    const item = shop?.items.get(itemId);
    if (!shop || !buyer || !item) throw new Error(game.i18n.localize("THEFADE.Shop.missing"));
    if (!shop.testUserPermission(user, "OBSERVER") || !buyer.testUserPermission(user, "OWNER")) throw new Error(game.i18n.localize("THEFADE.Shop.notAllowed"));
    const stock = Number(item.system.quantity) || 1;
    const count = Math.max(1, Math.min(stock, Math.trunc(quantity) || 1));
    const total = count * (Number(item.system.price) || 0);
    if (serpents(buyer) < total) throw new Error(game.i18n.format("THEFADE.Shop.cannotAfford", { name: buyer.name, total, has: serpents(buyer) }));
    await buyer.update({ "system.currency.serpents": serpents(buyer) - total });
    await shop.update({ "system.currency.serpents": serpents(shop) + total });
    await giveItem(buyer, item, count);
    const name = item.name;
    await takeItem(item, count);
    return { count, total, name, buyer: buyer.name };
});

registerGMHandler("shopSell", async ({ shopUuid, sellerUuid, itemId, quantity, unitPrice, recipientUuid }, userId) => {
    const user = game.users.get(userId);
    const shop = await resolve(shopUuid);
    const seller = await resolve(sellerUuid);
    const recipient = await resolve(recipientUuid || sellerUuid);
    const item = seller?.items.get(itemId);
    if (!shop || !seller || !recipient || !item) throw new Error(game.i18n.localize("THEFADE.Shop.missing"));
    if (!shop.testUserPermission(user, "OBSERVER") || !seller.testUserPermission(user, "OWNER") || !recipient.testUserPermission(user, "OWNER")) {
        throw new Error(game.i18n.localize("THEFADE.Shop.notAllowed"));
    }
    const held = Number(item.system.quantity) || 1;
    const count = Math.max(1, Math.min(held, Math.trunc(quantity) || 1));
    // Only a GM can set a price other than half value.
    const price = user.isGM && Number.isFinite(Number(unitPrice)) ? Math.max(0, Number(unitPrice)) : salePrice(item);
    const total = count * price;
    if (serpents(shop) < total) throw new Error(game.i18n.format("THEFADE.Shop.shopCannotAfford", { total, has: serpents(shop) }));
    await shop.update({ "system.currency.serpents": serpents(shop) - total });
    await recipient.update({ "system.currency.serpents": serpents(recipient) + total });
    await giveItem(shop, item, count);
    const name = item.name;
    await takeItem(item, count);
    return { count, total, name, seller: seller.name, recipient: recipient.name };
});

/** Buy `quantity` of a shop item. */
export async function buyFromShop(shop, item, buyerUuid, quantity) {
    try {
        const result = await requestGM("shopBuy", { shopUuid: shop.uuid, itemId: item.id, buyerUuid, quantity });
        ui.notifications.info(game.i18n.format("THEFADE.Shop.bought", result));
    } catch (err) {
        ui.notifications.error(err.message);
    }
}

/** Sell `quantity` of an owned item to a shop. */
export async function sellToShop(shop, item, { quantity, unitPrice, recipientUuid }) {
    try {
        const result = await requestGM("shopSell", { shopUuid: shop.uuid, sellerUuid: item.actor.uuid, itemId: item.id, quantity, unitPrice, recipientUuid });
        ui.notifications.info(game.i18n.format("THEFADE.Shop.sold", result));
    } catch (err) {
        ui.notifications.error(err.message);
    }
}
