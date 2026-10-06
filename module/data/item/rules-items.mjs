// Rules items: diseases, mutations, heritage, traps, hazards, downtime activities.
import TheFadeItemModel from "./base.mjs";
import { boolean, count, number, string, toNumber } from "../fields.mjs";

const { fields } = foundry.data;

export class DiseaseData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.disease"];

    static defineSchema() {
        const flag = () => boolean(false);
        return {
            ...super.defineSchema(),
            transmission: new fields.SchemaField({ airborne: flag(), contact: flag(), fluid: flag(), ingested: flag(), injury: flag() }),
            incubation: string(),
            duration: string(),
            durationType: string("temporary"),
            virality: count(0),
            treatmentDT: count(0),
            requiresVector: boolean(false),
            requiresCure: boolean(false),
            effect: string(),
            // Cultured diseases can be bought and carried as samples (Core, Diseases).
            price: number(0, { min: 0 }),
            weight: number(0, { min: 0 })
        };
    }

    static migrateData(source) {
        // Diseases keep a price and weight but none of the other carried-goods fields.
        for (const key of ["quantity", "equipped", "technological", "technologyAttunement"]) delete source[key];
        for (const key of ["price", "weight"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, toNumber(source[key], 0));
        }
        const keys = ["airborne", "contact", "fluid", "ingested", "injury"];
        const prior = source.transmission;
        if (typeof prior === "string" || Array.isArray(prior)) {
            const chosen = new Set(Array.isArray(prior) ? prior : [prior]);
            source.transmission = Object.fromEntries(keys.map(key => [key, chosen.has(key)]));
        }
        for (const key of ["virality", "treatmentDT"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], 0)));
        }
        return super.migrateData(source);
    }

    prepareDerivedData() {
        // Virality bands: Low 4–7D, Moderate 8–11D, High 12D+.
        const v = this.virality;
        this.viralityBand = v >= 12 ? "High" : v >= 8 ? "Moderate" : v >= 4 ? "Low" : null;
        this.transmissionLabel = Object.entries(this.transmission)
            .filter(([, on]) => on).map(([key]) => CONFIG.THEFADE.disease.transmission[key]).join(", ");
    }

    get chips() {
        return [this.transmissionLabel, this.virality ? `${this.virality}D virality` : "", this.viralityBand].filter(Boolean);
    }
}

export class MutationData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.mutation"];

    static defineSchema() {
        return { ...super.defineSchema(), severity: string("minor"), rollRange: string(), effect: string() };
    }

    get chips() {
        return [CONFIG.THEFADE.mutationSeverities[this.severity] ?? this.severity, this.rollRange].filter(Boolean);
    }
}

export class HeritageData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.heritage"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            heritageType: string("hybrid"),
            motherSpecies: string(),
            fatherSpecies: string(),
            characteristicChanges: count(0),
            mutationRolls: string(),
            effect: string()
        };
    }

    get chips() {
        return [CONFIG.THEFADE.heritageTypes[this.heritageType] ?? this.heritageType,
            [this.motherSpecies, this.fatherSpecies].filter(Boolean).join(" × ")].filter(Boolean);
    }
}

/** Attack/damage fields shared by traps and hazards. */
function attackSchema() {
    return {
        attackDice: count(0),
        defense: string("none"),
        damage: string("0"),
        damageType: string("Ut"),
        damageTrack: string("hp"),
        critical: count(4),
        bypassArmor: boolean(false),
        effect: string()
    };
}

function migrateAttack(source) {
    for (const key of ["attackDice", "critical", "escalationDice", "level", "detectionDT", "disarmDT"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.max(0, Math.trunc(toNumber(source[key], key === "critical" ? 4 : 0)));
    }
    if ("damage" in source && typeof source.damage === "number") source.damage = String(source.damage);
    if (source.damageTrack && !["hp", "sanity"].includes(source.damageTrack)) source.damageTrack = "hp";
}

export class TrapData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.hazard", "THEFADE.ITEM.trap"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            level: count(1),
            category: string("mechanical"),
            trigger: string(),
            reset: string(),
            detectionSkill: string("Sight"),
            detectionDT: count(4),
            disarmSkill: string("Lockpicking"),
            disarmDT: count(4),
            ...attackSchema()
        };
    }

    static migrateData(source) {
        migrateAttack(source);
        return super.migrateData(source);
    }

    get chips() {
        return [CONFIG.THEFADE.trapCategories[this.category] ?? this.category, `Level ${this.level}`,
            this.attackDice ? `${this.attackDice}D vs ${this.defense}` : ""].filter(Boolean);
    }
}

export class HazardData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.hazard"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            category: string("hazard"),
            interval: string(),
            escalationDice: count(0),
            ...attackSchema()
        };
    }

    static migrateData(source) {
        if (source.critical === null) source.critical = 4;
        migrateAttack(source);
        return super.migrateData(source);
    }

    get chips() {
        return [CONFIG.THEFADE.hazardCategories[this.category] ?? this.category, this.interval,
            this.attackDice ? `${this.attackDice}D vs ${this.defense}` : ""].filter(Boolean);
    }
}

export class DowntimeData extends TheFadeItemModel {
    static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "THEFADE.ITEM.downtime"];

    static defineSchema() {
        return {
            ...super.defineSchema(),
            activityType: string("other"),
            skill: string(),
            dt: count(0),
            duration: string(),
            cost: string(),
            progress: count(0),
            target: count(1, { min: 1 }),
            status: string("planned"),
            benefit: string()
        };
    }

    static migrateData(source) {
        for (const key of ["dt", "progress", "target"]) {
            if (key in source && typeof source[key] !== "number") source[key] = Math.max(key === "target" ? 1 : 0, Math.trunc(toNumber(source[key], 0)));
        }
        return super.migrateData(source);
    }

    prepareDerivedData() {
        this.percentComplete = Math.min(100, Math.max(0, Math.round((this.progress / Math.max(1, this.target)) * 100)));
        /** Status follows progress unless the activity was abandoned. */
        this.displayStatus = this.status === "abandoned" ? "abandoned"
            : this.progress >= this.target ? "completed"
                : this.progress > 0 ? "active" : this.status;
    }

    get chips() {
        return [CONFIG.THEFADE.downtimeTypes[this.activityType] ?? this.activityType,
            `${this.progress} / ${this.target}`,
            CONFIG.THEFADE.downtimeStatuses[this.displayStatus] ?? this.displayStatus];
    }
}
