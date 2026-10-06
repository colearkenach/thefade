// Shared field factories and migration helpers for The Fade data models.
const { fields } = foundry.data;

/** Integer field with a default, never null. */
export function integer(initial = 0, options = {}) {
    return new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...options });
}

/** Non-negative integer field. */
export function count(initial = 0, options = {}) {
    return integer(initial, { min: 0, ...options });
}

/** Number that may be blank (null), used for manual overrides. */
export function override() {
    return new fields.NumberField({ required: true, nullable: true, integer: true, initial: null });
}

/** Plain decimal number, never null. */
export function number(initial = 0, options = {}) {
    return new fields.NumberField({ required: true, nullable: false, initial, ...options });
}

export function string(initial = "", options = {}) {
    return new fields.StringField({ required: true, blank: true, initial, ...options });
}

export function boolean(initial = false) {
    return new fields.BooleanField({ required: true, initial });
}

export function html() {
    return new fields.HTMLField({ required: true, blank: true, initial: "" });
}

/** Five attribute values keyed by attribute name. */
export function attributeMap(factory = () => integer(0)) {
    return new fields.SchemaField({
        physique: factory(), finesse: factory(), mind: factory(), presence: factory(), soul: factory()
    });
}

/** A mechanical bonus row ({ type, target, value, severity }). See rules/mechanical-bonuses.js. */
export function bonusesField() {
    return new fields.ArrayField(new fields.SchemaField({
        id: string(),
        type: string("skill"),
        target: string(),
        value: number(1),
        severity: string("minor")
    }));
}

/** A typed damage row ({ id, amount, type }). */
export function damageComponentsField(defaultType = "S") {
    return new fields.ArrayField(new fields.SchemaField({
        id: string(),
        amount: integer(0),
        type: string(defaultType)
    }));
}

/** A path or species ability (keyed by id in an object). */
export function abilityField() {
    return new fields.SchemaField({
        name: string(),
        description: string(),
        activation: string("passive"),
        actionCost: string(),
        durationRounds: count(1),
        bonuses: bonusesField()
    });
}

/* -------------------------------------------- */
/*  Migration helpers                           */
/* -------------------------------------------- */

/**
 * Coerce legacy sheet values to a finite number. Old forms occasionally
 * stored comma lists ("2, 3") or blank strings in numeric fields.
 */
export function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;
    if (typeof value === "string") {
        const match = value.match(/-?\d+(\.\d+)?/);
        if (match) return Number(match[0]);
    }
    return fallback;
}

/** Move `from` to `to` in a source object when `to` is unset (or set to its default). */
export function renameField(source, from, to, { emptyValues = [undefined, null, ""] } = {}) {
    if (!(from in source)) return;
    if (emptyValues.includes(source[to])) source[to] = source[from];
    delete source[from];
}

/** Coerce a numeric source field in place. */
export function coerceNumber(source, key, fallback = 0) {
    if (key in source && typeof source[key] !== "number") source[key] = toNumber(source[key], fallback);
}

/** Generate a stable id for legacy array rows that lack one. */
export function ensureRowIds(rows) {
    if (!Array.isArray(rows)) return rows;
    for (const row of rows) {
        if (row && typeof row === "object" && !row.id) row.id = foundry.utils.randomID(16);
    }
    return rows;
}
