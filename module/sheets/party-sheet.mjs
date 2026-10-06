// Party actors: a roster of characters, a shared purse, and a stash.
import TheFadeActorSheet from "./base-actor-sheet.mjs";
import { NON_TRADE_TYPES } from "../apps/shop-trade.mjs";

const { DialogV2 } = foundry.applications.api;

export default class TheFadePartySheet extends TheFadeActorSheet {
    static HAS_MODES = false;

    static DEFAULT_OPTIONS = {
        classes: ["party"],
        position: { width: 640, height: 640 },
        actions: {
            addMember: TheFadePartySheet.#onAddMember,
            removeMember: TheFadePartySheet.#onRemoveMember,
            openMember: TheFadePartySheet.#onOpenMember,
            giveXP: TheFadePartySheet.#onGiveXP,
            giveCurrency: TheFadePartySheet.#onGiveCurrency,
            dividePool: TheFadePartySheet.#onDividePool
        }
    };

    static PARTS = {
        header: { template: "systems/thefade/templates/actor/party/header.hbs" },
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        members: { template: "systems/thefade/templates/actor/party/members.hbs", scrollable: [""] },
        stash: { template: "systems/thefade/templates/actor/party/stash.hbs", scrollable: [""] },
        notes: { template: "systems/thefade/templates/actor/party/notes.hbs", scrollable: [""] }
    };

    static TABS = {
        primary: {
            tabs: [{ id: "members", icon: "fa-solid fa-users" }, { id: "stash", icon: "fa-solid fa-sack" }, { id: "notes", icon: "fa-solid fa-feather-pointed" }],
            initial: "members",
            labelPrefix: "THEFADE.Party.Tab"
        }
    };

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.memberCount = this.document.system.memberActors.length;
        return context;
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (context.tabs?.[partId]) context.tab = context.tabs[partId];
        switch (partId) {
            case "members":
                context.members = this.document.system.memberActors.map(actor => ({
                    id: actor.id, name: actor.name, img: actor.img,
                    level: actor.system.level, xp: actor.system.experience,
                    hp: actor.system.hp, sanity: actor.system.sanity,
                    serpents: actor.system.currency?.serpents ?? 0,
                    canView: actor.testUserPermission(game.user, "LIMITED")
                }));
                break;
            case "stash":
                context.items = await Promise.all(this.document.items.filter(i => !NON_TRADE_TYPES.has(i.type))
                    .sort((a, b) => a.sort - b.sort).map(i => this._prepareItem(i)));
                context.physicalTypes = CONFIG.THEFADE.physicalItemTypes.join(",");
                break;
            case "notes":
                context.enrichedNotes = await this._enrich(this.document.system.notes);
                break;
        }
        return context;
    }

    /** Dropping a character on the sheet adds it to the party. @override */
    async _onDropActor(event, actor) {
        if (!this.isEditable || actor.type !== "character") return null;
        return this.#addMember(actor.id);
    }

    #addMember(id) {
        const members = this.document.system.members;
        if (members.includes(id)) return null;
        return this.document.update({ "system.members": [...members, id] });
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async #onAddMember() {
        const current = new Set(this.document.system.members);
        const candidates = game.actors.filter(a => a.type === "character" && !current.has(a.id)).sort((a, b) => a.name.localeCompare(b.name));
        if (!candidates.length) return ui.notifications.warn("THEFADE.Party.noCandidates", { localize: true });
        const options = candidates.map(a => `<option value="${a.id}">${foundry.utils.escapeHTML(a.name)}</option>`).join("");
        const result = await DialogV2.input({
            window: { title: "THEFADE.Party.addMember" },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Party.character")}</label><div class="form-fields"><select name="id">${options}</select></div></div>`,
            ok: { label: "THEFADE.Party.add", icon: "fa-solid fa-user-plus" },
            rejectClose: false
        });
        if (result?.id) return this.#addMember(result.id);
    }

    static #onRemoveMember(event, target) {
        const id = target.closest("[data-member-id]")?.dataset.memberId;
        return this.document.update({ "system.members": this.document.system.members.filter(m => m !== id) });
    }

    static #onOpenMember(event, target) {
        const id = target.closest("[data-member-id]")?.dataset.memberId;
        game.actors.get(id)?.sheet.render(true);
    }

    /** Ask for a whole number. */
    async #askAmount(title, label, initial) {
        const result = await DialogV2.input({
            window: { title },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize(label)}</label><div class="form-fields"><input type="number" name="amount" value="${initial}" min="0" step="1" autofocus></div></div>`,
            rejectClose: false
        });
        const amount = Math.trunc(Number(result?.amount) || 0);
        return amount > 0 ? amount : null;
    }

    static async #onGiveXP() {
        const members = this.document.system.memberActors;
        if (!members.length) return ui.notifications.warn("THEFADE.Party.noMembers", { localize: true });
        const amount = await this.#askAmount("THEFADE.Party.giveXP", "THEFADE.Party.xpEach", 100);
        if (!amount) return;
        await Promise.all(members.map(actor => actor.update({ "system.experience": (actor.system.experience ?? 0) + amount })));
        ui.notifications.info(game.i18n.format("THEFADE.Party.gaveXP", { amount, count: members.length }));
    }

    static async #onGiveCurrency() {
        const members = this.document.system.memberActors;
        if (!members.length) return ui.notifications.warn("THEFADE.Party.noMembers", { localize: true });
        const amount = await this.#askAmount("THEFADE.Party.giveCurrency", "THEFADE.Party.serpentsEach", 0);
        if (!amount) return;
        await Promise.all(members.map(actor => actor.update({ "system.currency.serpents": (actor.system.currency?.serpents ?? 0) + amount })));
        ui.notifications.info(game.i18n.format("THEFADE.Party.gaveCurrency", { amount, count: members.length }));
    }

    /** Split the party purse evenly; the remainder stays in the purse. */
    static async #onDividePool() {
        const members = this.document.system.memberActors;
        if (!members.length) return ui.notifications.warn("THEFADE.Party.noMembers", { localize: true });
        const pool = Math.floor(this.document.system.currency.serpents);
        const share = Math.floor(pool / members.length);
        if (share <= 0) return ui.notifications.warn("THEFADE.Party.poolTooSmall", { localize: true });
        const remainder = pool - share * members.length;
        const confirmed = await DialogV2.confirm({
            window: { title: "THEFADE.Party.dividePool" },
            classes: ["thefade"],
            content: `<p>${game.i18n.format("THEFADE.Party.divideConfirm", { pool, count: members.length, share, remainder })}</p>`,
            rejectClose: false
        });
        if (!confirmed) return;
        await Promise.all(members.map(actor => actor.update({ "system.currency.serpents": (actor.system.currency?.serpents ?? 0) + share })));
        await this.document.update({ "system.currency.serpents": this.document.system.currency.serpents - share * members.length });
    }
}
