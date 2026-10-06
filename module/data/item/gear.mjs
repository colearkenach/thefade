// Physical gear: general items, travel gear, instruments, clothing,
// consumables, magical devices, and creatures/transport.
import TheFadeItemModel, {
    physicalSchema, migratePhysical, stackWeight, dailyUsesSchema, migrateDailyUses, dailyResource
} from "./base.mjs";
import { attributeMap, boolean, count, integer, number, string, toNumber } from "../fields.mjs";

const { fields } = foundry.data;

/** Fields copied onto many item types by an old bulk import; never meaningful. */
const IMPORT_JUNK = ["isMagical", "addiction", "overdose", "toxicity", "poisonType", "hp", "energy", "avoid", "size",
    "movement", "carryCapacity", "drivers", "passengers", "overland", "cargo", "vehicleType", "strength", "charges",
    "usesPerDay", "spellName", "spellDescription", "school", "range", "distance", "complexity", "relayCode", "el",
    "creatureType", "specialAbilities", "naturalWeapons", "itemType"];

/** Shared base for physical items. */
class PhysicalItemData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.physical"];
    static get isPhysical() { return true; }

    static defineSchema() {
        return { ...super.defineSchema(), ...physicalSchema() };
    }

    static migrateData(source) {
        migratePhysical(source);
        return super.migrateData(source);
    }

    get carriedWeight() {
        return stackWeight(this);
    }
}

/** Items whose single use consumes one from the stack. */
class ConsumableData extends PhysicalItemData {
    get resource() {
        return { kind: "quantity", label: "THEFADE.Resource.quantity", value: this.quantity, max: null, path: "system.quantity" };
    }

    get chips() {
        return [game.i18n.format("THEFADE.Chip.quantity", { value: this.quantity })];
    }
}

/* -------------------------------------------- */
/*  General gear                                */
/* -------------------------------------------- */

export class GenericItemData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.item"];

    static defineSchema() {
        return { ...super.defineSchema(), itemCategory: string("general"), effect: string(), duration: string() };
    }

    static migrateData(source) {
        for (const key of IMPORT_JUNK) delete source[key];
        return super.migrateData(source);
    }
}

export class TravelData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.travel"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), travelType: string(), speedBonus: string(), capacity: string(), specialFeatures: string()
        };
    }
}

export class MusicalData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.musical"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), instrumentType: string(), performanceBonus: string(), magicalProperties: string()
        };
    }
}

export class ClothingData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.clothing"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            clothingType: string("normal"),
            wornLocation: string("body"),
            material: string(),
            quality: string("common"),
            coldBonus: integer(0), hotBonus: integer(0), coldPenalty: integer(0), hotPenalty: integer(0),
            skillBonus: string(), skillBonusDice: string(), skillConditions: string(),
            specialEffect: string(),
            protectionType: string(),
            protectionLevel: string("none")
        };
    }

    static migrateData(source) {
        for (const key of ["coldBonus", "hotBonus", "coldPenalty", "hotPenalty"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.trunc(toNumber(source[key], 0));
        }
        return super.migrateData(source);
    }

    get chips() {
        return [CONFIG.THEFADE.clothing.types[this.clothingType] ?? this.clothingType,
            CONFIG.THEFADE.clothing.locations[this.wornLocation] ?? this.wornLocation];
    }
}

/* -------------------------------------------- */
/*  Consumables                                 */
/* -------------------------------------------- */

export class PotionData extends ConsumableData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.potion"];

    static defineSchema() {
        return { ...super.defineSchema(), effect: string(), duration: string() };
    }
}

export class DrugData extends ConsumableData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.drug"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), duration: string(), sideEffects: string(),
            addiction: string(), addictionRating: count(0), overdose: string()
        };
    }

    static migrateData(source) {
        if ("addictionRating" in source && typeof source.addictionRating !== "number") {
            source.addictionRating = Math.max(0, Math.trunc(toNumber(source.addictionRating, 0)));
        }
        return super.migrateData(source);
    }
}

export class PoisonData extends ConsumableData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.poison"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            toxicity: count(0),
            poisonType: string("injury"),
            onset: string("immediate"),
            category: string("neurotoxin"),
            saveDifficulty: count(0),
            damage: string(),
            duration: string(),
            effect: string()
        };
    }

    static migrateData(source) {
        for (const key of ["toxicity", "saveDifficulty"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
        }
        if ("damage" in source && typeof source.damage === "number") source.damage = String(source.damage);
        return super.migrateData(source);
    }

    get chips() {
        return [game.i18n.format("THEFADE.Chip.toxicity", { value: this.toxicity }),
            CONFIG.THEFADE.poison.administration[this.poisonType] ?? this.poisonType,
            ...super.chips];
    }
}

export class MedicalData extends ConsumableData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.medical"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            medicalType: string(),
            effect: string(),
            duration: string(),
            healingAmount: string(),
            applicationTime: string(),
            bonus: integer(0),
            // Remaining uses per item; -1 means reusable (a tool).
            uses: integer(-1, { min: -1 })
        };
    }

    static migrateData(source) {
        // The medical type was once stored under `type`, which clashed with the document type.
        if (source.type && !source.medicalType) source.medicalType = source.type;
        delete source.type;
        if ("uses" in source && typeof source.uses !== "number") source.uses = Math.trunc(toNumber(source.uses, -1));
        if ("bonus" in source && typeof source.bonus !== "number") source.bonus = Math.trunc(toNumber(source.bonus, 0));
        return super.migrateData(source);
    }

    get resource() {
        return this.uses < 0 ? null : super.resource;
    }
}

export class AlchemicalData extends ConsumableData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.alchemical"];

    static defineSchema() {
        return { ...super.defineSchema(), skill: string("Chemistry"), dt: count(1, { min: 1 }), darkMagic: boolean(false) };
    }

    static migrateData(source) {
        if ("dt" in source && typeof source.dt !== "number") source.dt = Math.max(1, Math.trunc(toNumber(source.dt, 1)));
        return super.migrateData(source);
    }

    prepareDerivedData() {
        this.discipline = this.darkMagic ? "Blightcraft" : "Alchemy";
        this.craftCost = (Number(this.price) || 0) / 2;
    }

    get chips() {
        return [this.discipline, `${this.skill} DT ${this.dt}`, ...super.chips];
    }
}

/* -------------------------------------------- */
/*  Magical devices                             */
/* -------------------------------------------- */

/** A stored spell (staves and wands). */
function storedSpellSchema() {
    return {
        spellName: string(),
        spellDescription: string(),
        school: string("General"),
        activation: string(),
        spellLevel: count(0),
        strength: count(1)
    };
}

function migrateStoredSpell(source) {
    // spellEffect was an alias of spellDescription.
    if (source.spellEffect && !source.spellDescription) source.spellDescription = source.spellEffect;
    delete source.spellEffect;
    for (const key of ["spellLevel", "strength"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
    }
}

export class StaffData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.device", "THEFADE.ITEM.staff"];

    static defineSchema() {
        return { ...super.defineSchema(), ...storedSpellSchema(), ...dailyUsesSchema(3) };
    }

    static migrateData(source) {
        migrateStoredSpell(source);
        migrateDailyUses(source);
        delete source.charges; // Staves recharge daily; charges belonged to wands.
        return super.migrateData(source);
    }

    get resource() {
        return dailyResource(this);
    }

    get chips() {
        return [this.spellName || this.school, game.i18n.format("THEFADE.Chip.perDay", { value: this.usesPerDay || "∞" })].filter(Boolean);
    }
}

export class WandData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.device", "THEFADE.ITEM.wand"];

    static defineSchema() {
        return { ...super.defineSchema(), ...storedSpellSchema(), charges: count(20), maxCharges: count(20) };
    }

    static migrateData(source) {
        migrateStoredSpell(source);
        delete source.usesPerDay; // Wands use charges, not daily uses.
        for (const key of ["charges", "maxCharges"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 20)));
        }
        return super.migrateData(source);
    }

    get resource() {
        return { kind: "charges", label: "THEFADE.Resource.charges", value: this.charges, max: this.maxCharges, path: "system.charges" };
    }

    get chips() {
        return [this.spellName || this.school, `${this.charges} / ${this.maxCharges}`].filter(Boolean);
    }
}

export class GateData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.gate"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), range: string(), distance: string(), duration: string(), activation: string(),
            ...dailyUsesSchema(0)
        };
    }

    static migrateData(source) {
        if (source.usesPerDay === null || source.usesPerDay === "") source.usesPerDay = 0;
        migrateDailyUses(source);
        return super.migrateData(source);
    }

    get resource() {
        return this.usesPerDay ? dailyResource(this) : null;
    }

    get chips() {
        return [this.range, this.usesPerDay ? game.i18n.format("THEFADE.Chip.perDay", { value: this.usesPerDay }) : ""].filter(Boolean);
    }
}

export class CommunicationData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.communication"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), range: string(), complexity: string("audio"), relayCode: string(),
            ...dailyUsesSchema(0)
        };
    }

    static migrateData(source) {
        migrateDailyUses(source);
        return super.migrateData(source);
    }

    get resource() {
        return this.usesPerDay ? dailyResource(this) : null;
    }
}

export class ContainmentData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.containment"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            effect: string(), creaturesAffected: string(), capacity: string(), containmentType: string(),
            securityLevel: string(), specialProperties: string()
        };
    }
}

export class DreamData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.dream"];

    static defineSchema() {
        return { ...super.defineSchema(), el: count(1), effect: string(), dreamType: string(), duration: string() };
    }
}

/* -------------------------------------------- */
/*  Creatures and transport                     */
/* -------------------------------------------- */

/** Mount and vehicle speed was free text ("6 hexes (36 miles)"); keep the hex count. */
function migrateSpeed(source) {
    if ("speed" in source) {
        const hexes = Math.trunc(toNumber(source.speed, 0));
        if (!Number(source.movement) && hexes) source.movement = hexes;
        delete source.speed;
    }
    if ("movement" in source && typeof source.movement !== "number") source.movement = Math.max(0, Math.trunc(toNumber(source.movement, 0)));
}

export class MountData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.mount"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            mountType: string(), size: string("medium"), hp: count(0), movement: count(4),
            carryCapacity: string(), loyalty: integer(0), specialAbilities: string()
        };
    }

    static migrateData(source) {
        migrateSpeed(source);
        if (source.carryingCapacity && !source.carryCapacity) source.carryCapacity = source.carryingCapacity;
        delete source.carryingCapacity;
        if (typeof source.carryCapacity === "number") source.carryCapacity = source.carryCapacity ? String(source.carryCapacity) : "";
        if (source.type && !source.mountType) source.mountType = source.type;
        delete source.type;
        delete source.avoid;
        if ("hp" in source && typeof source.hp !== "number") source.hp = Math.max(0, Math.trunc(toNumber(source.hp, 0)));
        return super.migrateData(source);
    }

    get chips() {
        return [this.mountType, `${this.movement} hexes`, `${this.hp} HP`].filter(Boolean);
    }
}

export class VehicleData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.vehicle"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            vehicleType: string("land"), size: string("medium"), hp: count(0), movement: count(0), overland: count(0),
            drivers: count(1), passengers: count(0), cargo: string(), condition: string(), specialFeatures: string()
        };
    }

    static migrateData(source) {
        migrateSpeed(source);
        if (source.cargoCapacity && !source.cargo) source.cargo = source.cargoCapacity;
        delete source.cargoCapacity;
        if (source.type && !source.vehicleType) source.vehicleType = source.type;
        delete source.type;
        for (const key of ["hp", "overland", "drivers", "passengers"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
        }
        return super.migrateData(source);
    }

    get chips() {
        return [this.vehicleType, `${this.movement} hexes`, `${this.hp} HP`].filter(Boolean);
    }
}

export class BiologicalData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.biological"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            creatureType: string(), effect: string(), specialAbilities: string(),
            hp: count(0), maxHp: count(0), energy: count(0), maxEnergy: count(0)
        };
    }

    static migrateData(source) {
        for (const key of ["hp", "maxHp", "energy", "maxEnergy"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
        }
        return super.migrateData(source);
    }

    get resource() {
        return { kind: "energy", label: "THEFADE.Resource.energy", value: this.energy, max: this.maxEnergy || null, path: "system.energy" };
    }
}

export class FleshcraftData extends PhysicalItemData {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.fleshcraft"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            creatureType: string(), el: count(1), size: string("medium"), movement: string(), hp: count(0),
            sanityCost: count(0), active: boolean(false),
            naturalWeapons: string(), specialAbilities: string(), skills: string(),
            attributes: attributeMap(() => integer(0)),
            defenses: new fields.SchemaField({ avoid: integer(0), resilience: integer(0), grit: integer(0) }),
            nd: new fields.SchemaField({ head: integer(0), body: integer(0), arms: integer(0), legs: integer(0) })
        };
    }

    static migrateData(source) {
        delete source.type;
        if (source.sanityCost === null || source.sanityCost === "") source.sanityCost = 0;
        if (typeof source.movement === "number") source.movement = source.movement ? `${source.movement} hexes` : "";
        for (const key of ["hp", "el", "sanityCost"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
        }
        return super.migrateData(source);
    }

    get chips() {
        return [`EL ${this.el}`, this.creatureType, `${this.hp} HP`].filter(Boolean);
    }
}
