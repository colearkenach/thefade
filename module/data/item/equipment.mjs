// Weapons and armor.
import TheFadeItemModel, { physicalSchema, migratePhysical, stackWeight } from "./base.mjs";
import { boolean, count, integer, number, string, toNumber, damageComponentsField, ensureRowIds } from "../fields.mjs";
import {
    isNaturalWeapon, getEffectiveWeaponQualityIds, weaponQualityDisplay,
    formatWeaponDamageComponents, normalizeDamageAttribute
} from "../../rules/weapon-rules.js";
import { DAMAGE_TYPE_LABELS } from "../../rules/constants.js";

const { fields } = foundry.data;

/** A named enchantment power or modification row. */
function namedRows(extra = {}) {
    return new fields.ArrayField(new fields.SchemaField({
        id: string(),
        name: string(),
        description: string(),
        ...extra
    }));
}

/** Enchantment and strengthening fields shared by weapons and armor. */
function magicSchema(increaseKey) {
    return {
        material: string("iron"),
        isEnchanted: boolean(false),
        enchantmentPrice: number(0, { min: 0 }),
        [increaseKey]: count(0),
        strengtheningPrice: number(0, { min: 0 }),
        enchantmentPowers: namedRows({ isDarkMagic: boolean(false) }),
        modifications: namedRows({ price: number(0, { min: 0 }) })
    };
}

function migrateMagic(source) {
    for (const key of ["enchantmentPrice", "strengtheningPrice", "damageIncrease", "apIncrease"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, toNumber(source[key], 0));
    }
    ensureRowIds(source.enchantmentPowers);
    ensureRowIds(source.modifications);
}

/* -------------------------------------------- */

export class WeaponData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.physical", "THEFADE.ITEM.weapon"];
    static get isPhysical() { return true; }

    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...physicalSchema(),
            damageComponents: damageComponentsField("S"),
            critical: count(4),
            handedness: string("One-Handed"),
            range: string("Melee"),
            integrity: count(10),
            qualities: string(),
            qualityIds: new fields.ArrayField(string()),
            skill: string("Sword"),
            attribute: string("physique"),
            miscBonus: integer(0),
            ...magicSchema("damageIncrease")
        };
    }

    static migrateData(source) {
        migratePhysical(source);
        migrateMagic(source);
        for (const key of ["critical", "integrity", "miscBonus"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.trunc(toNumber(source[key], 0));
        }
        // Weapons from before typed damage only stored a single damage + type.
        const legacyDamage = toNumber(source.damage, 0);
        if ((!Array.isArray(source.damageComponents) || !source.damageComponents.length) && legacyDamage > 0) {
            source.damageComponents = [{ id: foundry.utils.randomID(16), amount: legacyDamage, type: source.damageType || "S" }];
        }
        ensureRowIds(source.damageComponents);
        delete source.damage;
        delete source.damageType;
        if ("attribute" in source) source.attribute = normalizeDamageAttribute(source.attribute);
        if (typeof source.handedness === "string" && ["natural", "natural weapon"].includes(source.handedness.toLowerCase())) {
            source.handedness = "Natural Weapon";
        }
        return super.migrateData(source);
    }

    prepareDerivedData() {
        const components = this.damageComponents.filter(c => c.amount);
        /** Total listed damage before attribute bonuses. */
        this.damage = components.reduce((sum, c) => sum + c.amount, 0);
        /** Primary damage type code. */
        this.damageType = components[0]?.type || this.damageComponents[0]?.type || "Ut";
        this.isNatural = isNaturalWeapon(this);
        /** Listed damage plus magical strengthening. */
        this.effectiveDamage = this.damage + (this.isNatural ? 0 : this.damageIncrease);
        this.isRanged = !/^\s*melee\s*$/i.test(this.range || "");
        this.rangeHexes = this.isRanged ? (Number(String(this.range).match(/\d+/)?.[0]) || null) : 1;
        this.effectiveQualityIds = getEffectiveWeaponQualityIds(this);
        this.qualityLabel = weaponQualityDisplay(this);
        this.damageLabel = formatWeaponDamageComponents(this);
        this.modSlots = this.isNatural ? 0 : (CONFIG.THEFADE.weaponModSlots[this.handedness] ?? 0);
    }

    get chips() {
        const chips = [];
        if (this.damageLabel && this.damageLabel !== "—") chips.push(this.damageLabel);
        chips.push(game.i18n.format("THEFADE.Chip.critical", { value: this.critical }));
        chips.push(game.i18n.localize(CONFIG.THEFADE.weaponHandedness[this.handedness] ?? this.handedness));
        chips.push(this.range || "Melee");
        return chips;
    }

    get carriedWeight() {
        return stackWeight(this);
    }
}

/* -------------------------------------------- */

/** Normalize an armor location string to a protection pool key. */
export function armorPoolKey(location) {
    const value = String(location || "").toLowerCase();
    if (value.includes("head")) return "head";
    if (value.includes("body") || value.includes("torso")) return "body";
    if (value.includes("arm")) return "arms";
    if (value.includes("leg")) return "legs";
    if (value.includes("shield")) return "shield";
    return value;
}

export class ArmorData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.physical", "THEFADE.ITEM.armor"];
    static get isPhysical() { return true; }

    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...physicalSchema(),
            ...armorSchema()
        };
    }

    static migrateData(source) {
        migratePhysical(source);
        migrateMagic(source);
        migrateArmor(source);
        return super.migrateData(source);
    }

    prepareDerivedData() {
        prepareArmor(this);
    }

    get chips() {
        return armorChips(this);
    }

    get carriedWeight() {
        return stackWeight(this);
    }
}

/**
 * Armor protection fields, shared with armor-like Items of Power. Limb armor
 * (Arms/Legs) keeps independent left and right pools; `null` means "full".
 */
export function armorSchema() {
    return {
        ap: count(0),
        currentAP: count(0),
        derivedLeftAP: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
        derivedRightAP: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
        isHeavy: boolean(false),
        location: string("Body"),
        autoBlock: string(),
        ...magicSchema("apIncrease")
    };
}

export function migrateArmor(source) {
    for (const key of ["ap", "currentAP"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
    }
    // otherLimbAP predates the left/right limb pools and is no longer read.
    delete source.otherLimbAP;
}

export function prepareArmor(system) {
    system.maxAP = (Number(system.ap) || 0) + (Number(system.apIncrease) || 0);
    system.effectiveAP = system.maxAP;
    system.pool = armorPoolKey(system.location);
    system.isLimb = system.pool === "arms" || system.pool === "legs";
    system.leftAP = system.derivedLeftAP ?? system.maxAP;
    system.rightAP = system.derivedRightAP ?? system.maxAP;
    system.modSlots = CONFIG.THEFADE.armorModSlots[system.location] ?? 0;
}

export function armorChips(system) {
    const chips = [system.location];
    chips.push(system.isLimb
        ? `${system.leftAP} / ${system.rightAP} AP`
        : `${system.currentAP} / ${system.maxAP} AP`);
    if (system.isHeavy) chips.push(game.i18n.localize("THEFADE.Chip.heavy"));
    return chips;
}

export { DAMAGE_TYPE_LABELS };
