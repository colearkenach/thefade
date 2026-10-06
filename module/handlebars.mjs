// Handlebars helpers and template preloading.

/** Partials used across sheets, registered by their short name ("thefade.item-row"). */
const PARTIALS = {
    "thefade.item-row": "systems/thefade/templates/shared/item-row.hbs",
    "thefade.ability": "systems/thefade/templates/shared/ability.hbs",
    "thefade.bonuses": "systems/thefade/templates/item/parts/bonuses.hbs",
    "thefade.damage-rows": "systems/thefade/templates/item/parts/damage-rows.hbs",
    "thefade.physical": "systems/thefade/templates/item/parts/physical.hbs",
    "thefade.armor-fields": "systems/thefade/templates/item/parts/armor-fields.hbs"
};

/** Item "Details" layouts, included dynamically by path. */
const DETAILS = ["weapon", "armor", "spell", "magicitem", "path", "species", "feature", "skill", "disease",
    "hazard", "downtime", "fleshcraft", "generated"].map(name => `systems/thefade/templates/item/details/${name}.hbs`);

export function registerHandlebarsHelpers() {
    const H = Handlebars;
    /** Signed number: +2, −1, 0. */
    H.registerHelper("thefade-signed", value => {
        const n = Number(value) || 0;
        return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
    });
    /** Localize a label from a CONFIG.THEFADE table: {{thefade-label "skillRanks" rank}}. */
    H.registerHelper("thefade-label", (table, key) => {
        const entry = foundry.utils.getProperty(CONFIG.THEFADE, table)?.[key];
        const label = typeof entry === "string" ? entry : entry?.label;
        return label ? game.i18n.localize(label) : key;
    });
    H.registerHelper("thefade-includes", (list, value) => Array.isArray(list) && list.includes(value));
    H.registerHelper("thefade-pct", (value, max) => {
        const m = Number(max) || 0;
        return m ? Math.max(0, Math.min(100, Math.round(((Number(value) || 0) / m) * 100))) : 0;
    });
}

export async function preloadTemplates() {
    const { loadTemplates } = foundry.applications.handlebars;
    await loadTemplates(PARTIALS);
    return loadTemplates(DETAILS);
}
