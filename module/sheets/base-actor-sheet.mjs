// Shared behaviour for The Fade actor sheets: play/edit mode, item rows,
// context menus, drag and drop, and confirmation of destructive actions.
const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

export default class TheFadeActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["thefade", "actor"],
        form: { submitOnChange: true },
        window: { resizable: true },
        actions: {
            toggleMode: TheFadeActorSheet.#onToggleMode,
            itemOpen: TheFadeActorSheet.#onItemOpen,
            itemCreate: TheFadeActorSheet.#onItemCreate,
            itemDelete: TheFadeActorSheet.#onItemDelete,
            itemUse: TheFadeActorSheet.#onItemUse,
            itemReset: TheFadeActorSheet.#onItemReset,
            itemChat: TheFadeActorSheet.#onItemChat,
            itemEquip: TheFadeActorSheet.#onItemEquip,
            itemExpand: TheFadeActorSheet.#onItemExpand,
            itemQuantity: TheFadeActorSheet.#onItemQuantity,
            browse: TheFadeActorSheet.#onBrowse
        }
    };

    /** Does this sheet have separate play and edit modes? */
    static HAS_MODES = true;

    /** "play" shows values and roll controls; "edit" shows inputs for every stored value. */
    _mode = null;

    /** Item ids whose summaries are expanded. */
    _expanded = new Set();

    get isEditMode() {
        return this.isEditable && this._mode === "edit";
    }

    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        // New, empty characters open in edit mode; everyone else starts in play mode.
        if (this._mode === null) {
            this._mode = (this.isEditable && this.document.type === "character" && !this.document.items.size) ? "edit" : "play";
        }
    }

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.document;
        return Object.assign(context, {
            actor,
            system: actor.system,
            source: actor._source.system,
            systemFields: actor.system.schema.fields,
            config: CONFIG.THEFADE,
            editMode: this.isEditMode,
            playMode: !this.isEditMode,
            isGM: game.user.isGM,
            owner: actor.isOwner,
            limited: !actor.isOwner && actor.limited
        });
    }

    /** @override */
    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this._createItemContextMenu();
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.element.classList.toggle("mode-edit", this.isEditMode);
        this.element.classList.toggle("mode-play", !this.isEditMode);
        this.#renderModeToggle();
    }

    /** Edit/Play toggle in the window header. */
    #renderModeToggle() {
        if (!this.constructor.HAS_MODES || !this.isEditable || !this.hasFrame) return;
        const header = this.window.header;
        let toggle = header.querySelector(".thefade-mode-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "thefade-mode-toggle header-control";
            toggle.dataset.action = "toggleMode";
            header.querySelector(".window-title")?.after(toggle);
        }
        const edit = this.isEditMode;
        toggle.innerHTML = `<i class="fa-solid ${edit ? "fa-lock-open" : "fa-lock"}"></i><span>${game.i18n.localize(edit ? "THEFADE.Sheet.editMode" : "THEFADE.Sheet.playMode")}</span>`;
        toggle.dataset.tooltip = game.i18n.localize(edit ? "THEFADE.Sheet.toPlay" : "THEFADE.Sheet.toEdit");
        toggle.setAttribute("aria-pressed", String(edit));
    }

    /* -------------------------------------------- */
    /*  Helpers for subclasses                      */
    /* -------------------------------------------- */

    /** Enrich HTML for display. */
    async _enrich(html) {
        return TextEditor.enrichHTML(html ?? "", { relativeTo: this.document, secrets: this.document.isOwner, rollData: this.document.getRollData() });
    }

    /** Display data for an owned item row. */
    async _prepareItem(item, { enrich = false } = {}) {
        const expanded = this._expanded.has(item.id);
        return {
            item,
            id: item.id,
            name: item.name,
            img: item.img,
            type: item.type,
            typeLabel: item.typeLabel,
            system: item.system,
            chips: item.chips,
            resource: item.resource,
            expanded,
            description: (enrich || expanded) ? await this._enrich(item.system.description) : ""
        };
    }

    /** The item a clicked control belongs to. */
    _getItem(target) {
        const id = target.closest("[data-item-id]")?.dataset.itemId;
        return id ? this.document.items.get(id) : null;
    }

    /** Right-click menu for every item row. */
    _createItemContextMenu() {
        const ContextMenu = foundry.applications.ux.ContextMenu.implementation;
        new ContextMenu(this.element, "[data-item-id]", [
            { name: "THEFADE.Item.edit", icon: '<i class="fa-solid fa-pen-to-square"></i>', callback: li => this._getItem(li)?.sheet.render(true) },
            { name: "THEFADE.Item.toChat", icon: '<i class="fa-solid fa-comment"></i>', callback: li => this._getItem(li)?.toChat() },
            {
                name: "THEFADE.Item.duplicate", icon: '<i class="fa-solid fa-copy"></i>',
                condition: () => this.isEditable,
                callback: li => { const item = this._getItem(li); if (item) item.clone({ name: `${item.name} (Copy)` }, { save: true, addSource: true }); }
            },
            {
                name: "THEFADE.Item.delete", icon: '<i class="fa-solid fa-trash"></i>',
                condition: () => this.isEditable,
                callback: li => this._deleteItem(this._getItem(li))
            }
        ], { jQuery: false, fixed: true });
    }

    /** Delete an item after confirmation. */
    async _deleteItem(item, { skipConfirm = false } = {}) {
        if (!item) return;
        if (!skipConfirm) {
            const confirmed = await DialogV2.confirm({
                window: { title: game.i18n.format("THEFADE.Item.deleteTitle", { name: item.name }) },
                content: `<p>${game.i18n.format("THEFADE.Item.deleteConfirm", { name: foundry.utils.escapeHTML(item.name), actor: foundry.utils.escapeHTML(this.document.name) })}</p>`,
                classes: ["thefade"],
                rejectClose: false
            });
            if (!confirmed) return;
        }
        return item.delete();
    }

    /* -------------------------------------------- */
    /*  Drag and drop                               */
    /* -------------------------------------------- */

    /** @override */
    async _onDropItem(event, item) {
        if (!this.document.isOwner) return null;
        // Skill entries from the compendium become custom skills (core skills already exist).
        if (item.type === "skill" && this.document.type === "character") {
            const { createCustomSkill } = await import("../rules/path-skills.mjs");
            const core = CONFIG.THEFADE.coreSkills.find(s => s.name.toLowerCase() === item.name.toLowerCase());
            if (core) return ui.notifications.info(game.i18n.format("THEFADE.Skill.isCore", { name: item.name }));
            const match = item.name.match(/^(Lore|Perform)\s*\((.+)\)$/i);
            const type = match ? match[1].toLowerCase() : "craft";
            await createCustomSkill(this.document, type, match ? match[2] : item.name, item.system.rank || "untrained");
            return null;
        }
        return super._onDropItem(event, item);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async #onToggleMode(event) {
        event.preventDefault();
        if (!this.isEditable) return;
        this._mode = this.isEditMode ? "play" : "edit";
        await this.submit();
        this.render();
    }

    static #onItemOpen(event, target) {
        this._getItem(target)?.sheet.render(true);
    }

    static async #onItemCreate(event, target) {
        const type = target.dataset.type;
        const types = type ? type.split(",") : undefined;
        if (types?.length === 1) {
            const name = game.i18n.format("THEFADE.Item.newName", { type: game.i18n.localize(CONFIG.Item.typeLabels[types[0]]) });
            const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type: types[0] }]);
            return item?.sheet.render(true);
        }
        return Item.implementation.createDialog({}, { parent: this.document }, { types });
    }

    static #onItemDelete(event, target) {
        return this._deleteItem(this._getItem(target), { skipConfirm: event.shiftKey });
    }

    static #onItemUse(event, target) {
        return this._getItem(target)?.use();
    }

    static #onItemReset(event, target) {
        return this._getItem(target)?.resetUses();
    }

    static #onItemChat(event, target) {
        return this._getItem(target)?.toChat();
    }

    static #onItemEquip(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        return this._toggleEquipped(item);
    }

    /** Equip/unequip. Subclasses refine (Item of Power slots). */
    async _toggleEquipped(item) {
        return item.update({ "system.equipped": !item.system.equipped });
    }

    static #onItemExpand(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        if (this._expanded.has(item.id)) this._expanded.delete(item.id);
        else this._expanded.add(item.id);
        this.render();
    }

    static #onItemQuantity(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        const delta = Number(target.dataset.delta) || 0;
        return item.update({ "system.quantity": Math.max(0, (item.system.quantity || 0) + delta) });
    }

    /** Open the compendium for an item type. */
    static #onBrowse(event, target) {
        const type = target.dataset.type;
        const packName = CONFIG.THEFADE.itemPacks[type];
        const pack = packName ? game.packs.get(`thefade.${packName}`) : null;
        if (!pack) return ui.notifications.warn(game.i18n.localize("THEFADE.Item.noPack"));
        pack.render(true);
    }
}
