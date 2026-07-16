import { anatomyLocationsForPreset } from "./rules.js";

const CANONICAL_LABELS = Object.freeze({
    head: "Head",
    body: "Body",
    leftarm: "Left Arm",
    rightarm: "Right Arm",
    leftleg: "Left Leg",
    rightleg: "Right Leg"
});

function normalizeArmorLocation(value) {
    const location = String(value || "").toLowerCase();
    if (location.includes("head")) return "head";
    if (location.includes("body") || location.includes("torso")) return "body";
    if (location.includes("arm")) return "arms";
    if (location.includes("leg")) return "legs";
    if (location.includes("shield")) return "shield";
    return location;
}

function actorItems(actor) {
    const items = actor?.items?.contents || actor?.items || [];
    return Array.from(items).filter(item => {
        const suppliesArmor = item?.type === "armor"
            || (item?.type === "magicitem" && item.system?.conflictsArmor === true);
        return suppliesArmor && item.system?.equipped === true;
    });
}

/**
 * Return the individual equipped armor pools protecting a canonical body
 * location. Limb armor keeps an independent current pool for each side.
 */
export function armorProtectionPools(actor, location) {
    const pools = [];
    for (const item of actorItems(actor)) {
        const itemLocation = normalizeArmorLocation(item.system?.location);
        const itemMax = (Number(item.system?.ap) || 0) + (Number(item.system?.apIncrease) || 0);
        const itemId = item.id || item._id;

        if (itemLocation === location && ["head", "body"].includes(location)) {
            pools.push({
                key: `${itemId}:currentAP`,
                item,
                itemId,
                label: item.name || "Armor",
                property: "system.currentAP",
                current: Math.max(0, Number(item.system?.currentAP) || 0),
                max: Math.max(0, itemMax)
            });
            continue;
        }

        const isArm = location === "leftarm" || location === "rightarm";
        const isLeg = location === "leftleg" || location === "rightleg";
        if ((isArm && itemLocation === "arms") || (isLeg && itemLocation === "legs")) {
            const derivedProperty = location.startsWith("left") ? "derivedLeftAP" : "derivedRightAP";
            const rawCurrent = item.system?.[derivedProperty];
            pools.push({
                key: `${itemId}:${derivedProperty}`,
                item,
                itemId,
                label: `${item.name || "Armor"} (${location.startsWith("left") ? "Left" : "Right"})`,
                property: `system.${derivedProperty}`,
                current: Math.max(0, (typeof rawCurrent === "number") ? rawCurrent : itemMax),
                max: Math.max(0, itemMax)
            });
        }
    }

    return pools;
}

function armorProtectionAt(actor, location) {
    const pools = armorProtectionPools(actor, location);
    return {
        current: pools.reduce((total, pool) => total + pool.current, 0),
        max: pools.reduce((total, pool) => total + pool.max, 0),
        highestCurrent: pools.reduce((highest, pool) => Math.max(highest, pool.current), 0),
        highestMax: pools.reduce((highest, pool) => Math.max(highest, pool.max), 0),
        hasPools: pools.length > 0
    };
}

/**
 * Build the Stats-tab protection table. Alternate anatomy names remain visible
 * while damage continues to use the compatible underlying armor/ND pool.
 */
export function buildProtectionView(actor, preset = "humanoid") {
    const poolOrder = ["head", "body", "leftarm", "rightarm", "leftleg", "rightleg"];
    const locations = anatomyLocationsForPreset(preset)
        .map((entry, sourceIndex) => ({ ...entry, sourceIndex }))
        .sort((a, b) => {
            const poolDelta = poolOrder.indexOf(a.location) - poolOrder.indexOf(b.location);
            if (poolDelta) return poolDelta;
            const canonical = String(CANONICAL_LABELS[a.location] || "").toLowerCase();
            const aCanonical = String(a.label).toLowerCase() === canonical ? 0 : 1;
            const bCanonical = String(b.label).toLowerCase() === canonical ? 0 : 1;
            return (aCanonical - bCanonical) || (a.sourceIndex - b.sourceIndex);
        });
    const poolUseCounts = locations.reduce((counts, entry) => {
        counts[entry.location] = (counts[entry.location] || 0) + 1;
        return counts;
    }, {});
    const renderedPools = new Set();

    return locations.map((entry, index) => {
        const armor = armorProtectionAt(actor, entry.location);
        const rawNatural = actor?.system?.naturalDeflection?.[entry.location] || {};
        const natural = {
            current: Number(rawNatural.current) || 0,
            max: Number(rawNatural.max) || 0,
            stacks: rawNatural.stacks === true
        };
        const total = natural.stacks
            ? { current: armor.current + natural.current, max: armor.max + natural.max }
            : {
                current: Math.max(armor.highestCurrent, natural.current),
                max: Math.max(armor.highestMax, natural.max)
            };
        const isPrimaryPool = !renderedPools.has(entry.location);
        renderedPools.add(entry.location);
        const canonicalLabel = CANONICAL_LABELS[entry.location] || entry.location;

        return {
            key: `${String(entry.label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
            label: entry.label,
            location: entry.location,
            poolLabel: canonicalLabel,
            armor,
            natural,
            total,
            isPrimaryPool,
            isSharedPool: poolUseCounts[entry.location] > 1,
            isMapped: String(entry.label).toLowerCase() !== canonicalLabel.toLowerCase()
        };
    });
}
