// Spells and Items of Power.
import TheFadeItemModel, { physicalSchema, migratePhysical, stackWeight } from "./base.mjs";
import { armorSchema, migrateArmor, prepareArmor, armorChips } from "./equipment.mjs";
import { boolean, bonusesField, count, damageComponentsField, ensureRowIds, integer, string, toNumber } from "../fields.mjs";
import {
    buildSpellDamageProfile, getSpellSuccessRequirements, formatSpellSuccessRequirements,
    getSpellAttackTargets, formatSpellDamageTracks
} from "../../rules/spell-rules.js";
import { getDarkMagicItemCorruptionValue, isDarkMagicItem, normalizeItemPowerSlot } from "../../rules/item-power-rules.js";
import { DARK_SCHOOL_NAMES } from "../../rules/dark-magic.js";

const { fields } = foundry.data;

/* -------------------------------------------- */
/*  Spells                                      */
/* -------------------------------------------- */

export class SpellData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.spell"];

    static defineSchema() {
        const optionalCount = () => new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, initial: null });
        return {
            ...super.defineSchema(),
            school: string("General"),
            isDarkMagic: boolean(false),
            time: string("Instantaneous"),
            range: string(),
            successes: count(3, { min: 1 }),
            // Rune spells: separate Symbology (drawing) and Spellcasting (activation) thresholds.
            symbologySuccesses: optionalCount(),
            spellcastingSuccesses: optionalCount(),
            damageComponents: damageComponentsField("Ut"),
            sanityDamage: string(),
            statusEffects: new fields.ArrayField(new fields.SchemaField({
                id: string(), status: string("pain"), intensity: string("trivial"), duration: string(), notes: string()
            })),
            buffEffects: new fields.ArrayField(new fields.SchemaField({
                id: string(), name: string(), target: string(), duration: string(), description: string()
            })),
            // Defenses the spell attacks, pipe-delimited ("Avoid", "Resilience|Grit").
            attack: string(),
            attackEffects: new fields.SchemaField({ Avoid: string(), Resilience: string(), Grit: string() }),
            bonusEffect: string(),
            weapons: string(),
            recipeCost: string(),
            mishapModifier: string("none")
        };
    }

    static migrateData(source) {
        for (const key of ["successes"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(1, Math.trunc(toNumber(source[key], 3)));
        }
        for (const key of ["symbologySuccesses", "spellcastingSuccesses"]) {
            if (key in source && source[key] !== null && typeof source[key] !== "number") {
                const value = Math.trunc(toNumber(source[key], 0));
                source[key] = value > 0 ? value : null;
            }
        }
        // Legacy spells stored a single damage amount + type.
        const legacyDamage = Math.max(0, Math.trunc(toNumber(source.damage, 0)));
        if ((!Array.isArray(source.damageComponents) || !source.damageComponents.length) && legacyDamage > 0) {
            source.damageComponents = [{ id: foundry.utils.randomID(16), amount: legacyDamage, type: source.damageType || "Ut" }];
        }
        delete source.damage;
        delete source.damageType;
        ensureRowIds(source.damageComponents);
        ensureRowIds(source.statusEffects);
        ensureRowIds(source.buffEffects);
        // Attack targets were briefly stored as an array.
        if (Array.isArray(source.attackTargets)) {
            if (!source.attack) source.attack = source.attackTargets.join("|");
        }
        delete source.attackTargets;
        if ("sanityDamage" in source && typeof source.sanityDamage === "number") source.sanityDamage = String(source.sanityDamage || "");
        return super.migrateData(source);
    }

    prepareDerivedData() {
        const damage = buildSpellDamageProfile(this);
        this.damage = damage.total;
        this.damageType = damage.primaryType;
        this.damageLabel = formatSpellDamageTracks(this);
        this.requirements = getSpellSuccessRequirements(this);
        this.requirementsLabel = formatSpellSuccessRequirements(this, { compact: true });
        this.attackTargets = getSpellAttackTargets(this);
        this.isDark = this.isDarkMagic === true || this.school === "Malevolent";
        this.schoolLabel = this.isDark ? (DARK_SCHOOL_NAMES[this.school] || this.school) : this.school;
    }

    get chips() {
        const chips = [this.schoolLabel, game.i18n.format("THEFADE.Chip.successes", { value: this.requirementsLabel })];
        if (this.damage) chips.push(this.damageLabel);
        if (this.attackTargets.length) chips.push(this.attackTargets.map(t => `vs ${t}`).join(" & "));
        return chips;
    }
}

/* -------------------------------------------- */
/*  Items of Power                              */
/* -------------------------------------------- */

function traitGrantsField() {
    const flags = () => new fields.TypedObjectField(new fields.BooleanField());
    return new fields.SchemaField({
        abilities: new fields.TypedObjectField(flags()),
        spellResistancePercent: integer(50, { min: 1, max: 100 }),
        resistances: flags(),
        immunities: new fields.SchemaField({ damageTypes: flags(), statuses: flags(), effects: flags() }),
        customImmunities: string(),
        notes: string()
    });
}

export class ItemOfPowerData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.physical", "THEFADE.ITEM.armor", "THEFADE.ITEM.magicitem"];
    static get isPhysical() { return true; }

    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...physicalSchema(),
            slot: string("head"),
            overlapMode: string("overlaps"),
            effect: string(),
            catalyst: string(),
            attunement: boolean(false),
            darkMagic: boolean(false),
            corruptionValueOverride: count(0, { max: 4 }),
            hasAura: boolean(true),
            auraColor: string("dull gray"),
            radiationEffect: string(),
            creationRequirements: string(),
            bonuses: bonusesField(),
            traitGrants: traitGrantsField(),
            // Armor-like Items of Power occupy an armor location and supply AP.
            conflictsArmor: boolean(false),
            ...armorSchema()
        };
    }

    static migrateData(source) {
        migratePhysical(source);
        migrateArmor(source);
        // A bulk import copied every item type's fields onto Items of Power.
        for (const key of ["isMagical", "duration", "addiction", "overdose", "toxicity", "poisonType", "hp", "energy",
            "avoid", "size", "movement", "carryCapacity", "drivers", "passengers", "overland", "cargo", "vehicleType",
            "strength", "charges", "usesPerDay", "spellName", "spellDescription", "school", "range", "distance",
            "complexity", "relayCode", "el", "creatureType", "specialAbilities", "naturalWeapons", "itemType"]) {
            delete source[key];
        }
        ensureRowIds(source.bonuses);
        if ("corruptionValueOverride" in source && typeof source.corruptionValueOverride !== "number") {
            source.corruptionValueOverride = Math.min(4, Math.max(0, Math.trunc(toNumber(source.corruptionValueOverride, 0))));
        }
        if (source.traitGrants?.spellResistancePercent !== undefined) {
            source.traitGrants.spellResistancePercent = Math.min(100, Math.max(1, Math.trunc(toNumber(source.traitGrants.spellResistancePercent, 50))));
        }
        return super.migrateData(source);
    }

    prepareDerivedData() {
        const slotRule = game.settings.get("thefade", "itemPowerSlotRule") ?? "standard";
        this.slotKey = normalizeItemPowerSlot(this.slot, slotRule);
        this.isDarkMagicItem = isDarkMagicItem(this.parent);
        this.corruptionValue = getDarkMagicItemCorruptionValue(this.parent);
        /** Dark Magic items always radiate a light-absorbing aura. */
        this.displayAuraColor = this.isDarkMagicItem && (!this.auraColor || this.auraColor === "dull gray")
            ? game.i18n.localize("THEFADE.ItemOfPower.darkAura")
            : this.auraColor;
        if (this.conflictsArmor) prepareArmor(this);
    }

    /** Is the item currently granting its powers (equipped and, if required, attuned)? */
    get isActive() {
        if (!this.equipped) return false;
        const rule = game.settings.get("thefade", "itemPowerAttunementRule") ?? "standard";
        return rule === "removed" || this.attunement === true;
    }

    get chips() {
        const chips = [game.i18n.localize(`THEFADE.ItemOfPower.slot.${this.slotKey}`)];
        if (this.attunement) chips.push(game.i18n.localize("THEFADE.ItemOfPower.attuned"));
        if (this.isDarkMagicItem) chips.push(game.i18n.format("THEFADE.Chip.corruption", { value: this.corruptionValue }));
        if (this.conflictsArmor) chips.push(...armorChips(this));
        return chips;
    }

    get carriedWeight() {
        return stackWeight(this);
    }
}
