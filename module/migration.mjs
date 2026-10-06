// World data migration. Data models already migrate legacy shapes in memory
// (see each model's `migrateData`); this persists the cleaned data, removes
// keys earlier versions saved by mistake, converts legacy NPC actors, and
// moves old condition toggles onto status effects.

/** Bump when a migration must run again. */
export const MIGRATION_VERSION = "14.0.0";

/** Flags earlier sheets stored on actors that are derived or obsolete. */
const OBSOLETE_ACTOR_FLAGS = [
    "basePassiveDodge", "basePassiveParry", "currentPassiveDodge", "currentPassiveParry", "avoidPenalty", "facing",
    "excessResiliencePenalty", "excessAvoidPenalty", "excessGritPenalty", "addingSkills", "skillsMigratedToData"
];

export function needsMigration() {
    const current = game.settings.get("thefade", "systemMigrationVersion");
    return !current || foundry.utils.isNewerVersion(MIGRATION_VERSION, current);
}

/**
 * Migrate the world. Runs on the active GM only.
 * @param {object} [options]
 * @param {boolean} [options.packs=true]  Also migrate unlocked-able world compendiums.
 */
export async function migrateWorld({ packs = true } = {}) {
    if (!game.user.isActiveGM) return;
    const version = game.system.version;
    ui.notifications.info(game.i18n.format("THEFADE.Migration.begin", { version }), { permanent: true });
    const errors = [];
    const raw = new Map((game.data.actors ?? []).map(data => [data._id, data]));

    for (const actor of game.actors.contents) {
        try {
            await migrateActor(actor, raw.get(actor.id));
        } catch (err) {
            errors.push(`Actor ${actor.name}: ${err.message}`);
            console.error(err);
        }
    }
    for (const actor of game.actors.invalidDocumentIds.map(id => game.actors.getInvalid(id))) {
        errors.push(`Actor ${actor?.name ?? "?"} could not be loaded and was skipped.`);
    }

    for (const item of game.items.contents) {
        try {
            await item.update({ "==system": item.toObject().system }, { diff: false, render: false });
        } catch (err) {
            errors.push(`Item ${item.name}: ${err.message}`);
            console.error(err);
        }
    }

    // Unlinked tokens keep their own copy of actor data.
    for (const scene of game.scenes.contents) {
        for (const token of scene.tokens.contents) {
            if (token.actorLink || !token.actor || !token.delta?._source?.system) continue;
            try {
                const delta = token.delta;
                if (foundry.utils.isEmpty(delta._source.system ?? {})) continue;
                await delta.update({ "==system": foundry.utils.deepClone(delta.toObject().system) }, { diff: false, render: false });
            } catch (err) {
                errors.push(`Token ${token.name} (${scene.name}): ${err.message}`);
                console.error(err);
            }
        }
    }

    if (packs) {
        for (const pack of game.packs.filter(p => p.metadata.packageType === "world" && ["Actor", "Item"].includes(p.documentName))) {
            try {
                await migrateCompendium(pack);
            } catch (err) {
                errors.push(`Compendium ${pack.title}: ${err.message}`);
                console.error(err);
            }
        }
    }

    await game.settings.set("thefade", "systemMigrationVersion", MIGRATION_VERSION);
    if (errors.length) {
        ui.notifications.warn(game.i18n.format("THEFADE.Migration.errors", { count: errors.length }), { permanent: true });
        console.warn("thefade | Migration issues:\n" + errors.join("\n"));
    } else {
        ui.notifications.info(game.i18n.format("THEFADE.Migration.complete", { version }), { permanent: true });
    }
}

/**
 * Persist one actor's migrated data.
 * @param {Actor} actor
 * @param {object} [rawData]  The actor's data as stored before models cleaned it.
 */
export async function migrateActor(actor, rawData) {
    const update = {};
    const flagScope = actor._source.flags?.thefade ?? {};
    for (const key of OBSOLETE_ACTOR_FLAGS) {
        if (key in flagScope) update[`flags.thefade.-=${key}`] = null;
    }

    if (actor.type === "npc") {
        // Legacy NPCs become characters; NpcData.migrateData already folded their stored maximum HP in.
        await actor.update({ type: "character", "==system": actor.toObject().system, ...update }, { diff: false, render: false });
    } else if (["character", "party", "shop"].includes(actor.type)) {
        await actor.update({ "==system": actor.toObject().system, ...update }, { diff: false, render: false });
    }

    // Persist embedded items.
    const items = actor.items.map(item => ({ _id: item.id, "==system": item.toObject().system }));
    if (items.length) await actor.updateEmbeddedDocuments("Item", items, { diff: false, render: false });

    // Conditions used to be toggles in system data; they are status effects now.
    const legacy = rawData?.system?.conditions;
    if (legacy && actor.type !== "party" && actor.type !== "shop") {
        for (const [key, state] of Object.entries(legacy)) {
            if (state?.active) await actor.setCondition(key, { active: true, intensity: state.intensity });
        }
    }
}

/**
 * Migrate every document in a compendium (world or system), rewriting each
 * item's stored system data in the current format. Items are saved in
 * batches; actors go through migrateActor for their embedded items.
 * @returns {Promise<number>} Documents migrated.
 */
export async function migrateCompendium(pack) {
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    try {
        const documents = await pack.getDocuments();
        if (pack.documentName === "Actor") {
            for (const actor of documents) await migrateActor(actor, null);
        } else if (pack.documentName === "Item") {
            const updates = documents.map(item => ({ _id: item.id, "==system": item.toObject().system }));
            for (let i = 0; i < updates.length; i += 100) {
                await Item.implementation.updateDocuments(updates.slice(i, i + 100), { pack: pack.collection, diff: false, render: false });
            }
        }
        return documents.length;
    } finally {
        if (wasLocked) await pack.configure({ locked: true });
    }
}
