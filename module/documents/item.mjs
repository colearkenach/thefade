// The Fade Item document: creation defaults, chat cards, and resource use.
import { getItemResetUpdate } from "../rules/item-actions.mjs";

export default class TheFadeItem extends Item {

    /* -------------------------------------------- */
    /*  Creation                                    */
    /* -------------------------------------------- */

    /** Group the many item types by family in the Create Item dialog. */
    static async createDialog(data = {}, createOptions = {}, dialogOptions = {}) {
        const allowed = dialogOptions.types ?? this.TYPES.filter(type => type !== CONST.BASE_DOCUMENT_TYPE);
        const families = Object.values(CONFIG.THEFADE.itemFamilies).map(family => ({
            label: game.i18n.localize(family.label),
            options: family.types.filter(type => allowed.includes(type)).map(value => ({
                value, label: game.i18n.localize(CONFIG.Item.typeLabels[value] ?? value)
            })).sort((a, b) => a.label.localeCompare(b.label))
        })).filter(family => family.options.length);
        return super.createDialog(data, createOptions, {
            ...dialogOptions,
            template: "systems/thefade/templates/dialogs/item-create.hbs",
            context: { ...dialogOptions.context, families }
        });
    }

    /** @override */
    static getDefaultArtwork(itemData) {
        const img = CONFIG.THEFADE.defaultItemIcons[itemData?.type];
        return img ? { img } : super.getDefaultArtwork(itemData);
    }

    /** @override */
    async _preCreate(data, options, user) {
        if ((await super._preCreate(data, options, user)) === false) return false;
        // New armor (and armor-like Items of Power) starts at full AP.
        const armorLike = this.type === "armor" || (this.type === "magicitem" && this.system.conflictsArmor);
        if (armorLike && !data.system?.currentAP) {
            this.updateSource({ "system.currentAP": (this.system.ap || 0) + (this.system.apIncrease || 0) });
        }
        // Items gained by a character are carried; natural weapons are always ready.
        if (this.type === "weapon" && this.system.isNatural && this.parent) this.updateSource({ "system.equipped": true });
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Localized type label. */
    get typeLabel() {
        return game.i18n.localize(CONFIG.Item.typeLabels[this.type] ?? this.type);
    }

    /** Short stat chips for sheets and lists. */
    get chips() {
        return this.system.chips?.filter(Boolean) ?? [];
    }

    /** A spendable resource (quantity, charges, daily uses), if any. */
    get resource() {
        return this.system.resource ?? null;
    }

    /* -------------------------------------------- */
    /*  Chat & use                                  */
    /* -------------------------------------------- */

    /**
     * Post this item's card to chat (its description and key details).
     * @param {object} [options]
     * @param {string} [options.note]  An extra line, e.g. resource remaining.
     */
    async toChat({ note = "" } = {}) {
        const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description ?? "", {
            relativeTo: this, secrets: this.isOwner
        });
        const effect = this.system.effect || this.system.specialEffect || this.system.spellDescription || "";
        const content = await foundry.applications.handlebars.renderTemplate("systems/thefade/templates/chat/item-card.hbs", {
            item: this, typeLabel: this.typeLabel, chips: this.chips, description: enriched, effect, note
        });
        return ChatMessage.implementation.create({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
            content,
            flags: { thefade: { itemUuid: this.uuid } }
        });
    }

    /**
     * Use the item: spend one from its resource (if it has one) and post it to chat.
     * Items without a resource are simply shown in chat.
     */
    async use() {
        const resource = this.resource;
        if (!resource) return this.toChat();
        if (resource.kind === "daily") {
            if (!resource.unlimited && resource.value <= 0) {
                return ui.notifications.warn(game.i18n.format("THEFADE.Resource.none", { name: this.name }));
            }
            await this.update({ [resource.path]: resource.used + 1 });
        } else {
            if (resource.value <= 0) return ui.notifications.warn(game.i18n.format("THEFADE.Resource.none", { name: this.name }));
            await this.update({ [resource.path]: resource.value - 1 });
        }
        const after = this.resource;
        const note = after.unlimited
            ? game.i18n.localize("THEFADE.Resource.unlimited")
            : `${game.i18n.localize(after.label)}: ${after.value}${after.max ? ` / ${after.max}` : ""}`;
        return this.toChat({ note });
    }

    /** Reset a daily-use item's counter. */
    async resetUses() {
        const update = getItemResetUpdate(this);
        if (update) await this.update(update);
    }
}
