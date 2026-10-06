// Base data model and reusable schema templates for every Item type.
import { boolean, count, html, integer, number, string, toNumber, renameField } from "../fields.mjs";

const { fields } = foundry.data;

/**
 * Root class for Item system data. Every item has a rich-text description and
 * an optional source/citation string.
 */
export default class TheFadeItemModel extends foundry.abstract.TypeDataModel {
    /** @override */
    static LOCALIZATION_PREFIXES = ["THEFADE.ITEM.base"];

    /** Schema fragments mixed into subclasses. Override in subclasses and call super. */
    static defineSchema() {
        return {
            description: html(),
            source: string()
        };
    }

    /** @override */
    static migrateData(source) {
        // Old sheets wrote null/undefined descriptions.
        if (source.description === null) source.description = "";
        return super.migrateData(source);
    }

    /** Whether this item is a carried, physical object. */
    static get isPhysical() {
        return false;
    }

    get isPhysical() {
        return this.constructor.isPhysical;
    }

    /** The owning actor, if any. */
    get actor() {
        return this.parent?.actor ?? null;
    }

    /**
     * Short stat chips shown under the item name on sheets and in inventory rows,
     * e.g. ["6 S/P", "Crit 2", "Melee"]. Subclasses override.
     * @type {string[]}
     */
    get chips() {
        return [];
    }

    /**
     * A resource that can be spent from the item (quantity, charges, daily uses).
     * @returns {{kind: string, label: string, value: number, max: number|null, path: string, unlimited?: boolean}|null}
     */
    get resource() {
        return null;
    }
}

/* -------------------------------------------- */
/*  Schema templates                            */
/* -------------------------------------------- */

/** Weight, price, quantity, equip state and technology flags for carried items. */
export function physicalSchema() {
    return {
        weight: number(0, { min: 0 }),
        price: number(0, { min: 0 }),
        quantity: count(1),
        equipped: boolean(false),
        technological: boolean(false),
        technologyAttunement: boolean(false)
    };
}

export function migratePhysical(source) {
    for (const key of ["weight", "price"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, toNumber(source[key], 0));
    }
    if ("quantity" in source && typeof source.quantity !== "number") source.quantity = Math.max(0, Math.trunc(toNumber(source.quantity, 1)));
}

/** Total carried weight of a physical item stack. */
export function stackWeight(system) {
    return (Number(system.weight) || 0) * Math.max(0, Number(system.quantity) || 0);
}

/**
 * Daily-use counter shared by talents, precepts, staves, gates and
 * communication devices. `usesPerDay` 0 means unlimited.
 */
export function dailyUsesSchema(initialPerDay = 0) {
    return {
        usesPerDay: count(initialPerDay),
        usesToday: count(0)
    };
}

/**
 * Older sheets tracked "uses today" under several names (currentUses, uses,
 * usesToday) and gates tracked usesRemaining instead. Fold them into usesToday.
 */
export function migrateDailyUses(source) {
    if ("usesPerDay" in source && typeof source.usesPerDay !== "number") {
        source.usesPerDay = Math.max(0, Math.trunc(toNumber(source.usesPerDay, 0)));
    }
    const candidates = [source.usesToday, source.currentUses, source.uses]
        .map(value => Math.max(0, Math.trunc(toNumber(value, 0))));
    if ((source.usesRemaining !== undefined) && (source.usesRemaining !== null) && source.usesPerDay) {
        candidates.push(Math.max(0, source.usesPerDay - Math.trunc(toNumber(source.usesRemaining, source.usesPerDay))));
    }
    const hasLegacy = ["currentUses", "uses", "usesRemaining"].some(key => key in source);
    if (hasLegacy || ("usesToday" in source && typeof source.usesToday !== "number")) {
        source.usesToday = Math.max(...candidates);
    }
    delete source.currentUses;
    delete source.uses;
    delete source.usesRemaining;
}

/** Resource descriptor for daily-use items. */
export function dailyResource(system) {
    const max = Math.max(0, Number(system.usesPerDay) || 0);
    const used = Math.max(0, Number(system.usesToday) || 0);
    return {
        kind: "daily",
        label: "THEFADE.Resource.usesToday",
        value: max ? Math.max(0, max - used) : null,
        max: max || null,
        used,
        unlimited: max === 0,
        path: "system.usesToday",
        resettable: true
    };
}

export { boolean, count, html, integer, number, string, renameField, fields };
