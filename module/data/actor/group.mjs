// Legacy NPC, party, and shop actor data.
import CharacterData, { migrateCharacterSource } from "./character.mjs";
import { html, number, toNumber } from "../fields.mjs";

const { fields } = foundry.data;

/**
 * Legacy NPC actors predate the shared character model. They load with the
 * character schema and the world migration converts them to characters; this
 * migration preserves their stored maximum HP as a misc HP bonus.
 */
export class NpcData extends CharacterData {
    static migrateData(source) {
        if (source.hp && typeof source.hp === "object" && "max" in source.hp) {
            const storedMax = Math.trunc(toNumber(source.hp.max, 10));
            const physique = source.attributes?.physique ?? {};
            const physiqueValue = toNumber(physique.value, 1) + toNumber(physique.bonus, 0) + toNumber(physique.speciesBonus, 0);
            const baseHP = toNumber(source.species?.baseHP, 0);
            source.hpMiscBonus = toNumber(source.hpMiscBonus, 0) + storedMax - physiqueValue - baseHP;
            delete source.hp.max;
        }
        migrateCharacterSource(source);
        return super.migrateData(source);
    }
}

/** A party: shared purse and a roster of member characters. */
export class PartyData extends foundry.abstract.TypeDataModel {
    static LOCALIZATION_PREFIXES = ["THEFADE.ACTOR.party"];

    static defineSchema() {
        return {
            currency: new fields.SchemaField({ serpents: number(0) }),
            members: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            notes: html()
        };
    }

    static migrateData(source) {
        if (source.currency && typeof source.currency.serpents !== "number" && "serpents" in source.currency) {
            source.currency.serpents = toNumber(source.currency.serpents, 0);
        }
        // Members may have been stored as UUIDs or objects; keep actor ids.
        if (Array.isArray(source.members)) {
            source.members = source.members
                .map(entry => typeof entry === "string" ? entry.split(".").pop() : entry?.id ?? entry?._id)
                .filter(Boolean);
        }
        return super.migrateData(source);
    }

    /** Member actors that still exist. */
    get memberActors() {
        return this.members.map(id => game.actors.get(id)).filter(actor => actor?.type === "character");
    }
}

/** A shop: inventory items owned by the actor, with a purse. */
export class ShopData extends foundry.abstract.TypeDataModel {
    static LOCALIZATION_PREFIXES = ["THEFADE.ACTOR.shop"];

    static defineSchema() {
        return {
            currency: new fields.SchemaField({ serpents: number(0) }),
            description: html(),
            notes: html()
        };
    }

    static migrateData(source) {
        if (source.currency && typeof source.currency.serpents !== "number" && "serpents" in source.currency) {
            source.currency.serpents = toNumber(source.currency.serpents, 0);
        }
        return super.migrateData(source);
    }
}
