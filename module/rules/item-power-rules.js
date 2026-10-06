export const ITEM_POWER_SLOT_RULES = Object.freeze({
    standard: "Standard slots",
    alternate: "Alternate expanded slots"
});

export const ITEM_POWER_ATTUNEMENT_RULES = Object.freeze({
    standard: "Standard attunement",
    removed: "No attunement",
    technology: "Technology can use attunement"
});

const STANDARD_SLOTS = Object.freeze([
    { key: "head", label: "Head", examples: "Helmets, crowns, circlets, masks, hoods, and other headwear" },
    { key: "neck", label: "Neck", examples: "Gorgets, chokers, necklaces, scarves, and pendants" },
    { key: "body", label: "Body", examples: "Clothing, overcoats, robes, and armor-shaped Items of Power" },
    { key: "hands", label: "Hands", examples: "Gauntlets, gloves, bracers, vambraces, and wristbands" },
    { key: "belt", label: "Belt", examples: "Belts, girdles, sashes, sheaths, and bandoliers" },
    { key: "legs", label: "Legs", examples: "Pants, leggings, skirts, and sabatons" },
    { key: "boots", label: "Boots", examples: "Boots, shoes, greaves, sandals, and slippers" },
    { key: "ring", label: "Rings", examples: "Two rings total", capacity: 2, alwaysCapped: true }
]);

const ALTERNATE_SLOTS = Object.freeze([
    { key: "head", label: "Head", tableLabel: "—", oldSlot: "Head", examples: "Crown, hat, helm, cowl, turban, cap, hood" },
    { key: "headband", label: "Headband", oldSlot: "Head", examples: "Headband, diadem, circlet, phylactery, wreath" },
    { key: "eyes", label: "Eyes", oldSlot: "Head", examples: "Glasses, goggles, contacts, monocle, blindfold" },
    { key: "ears", label: "Ears", oldSlot: "Head", examples: "Earring, earmuff, headset" },
    { key: "face", label: "Face", oldSlot: "Head", examples: "Mask, veil, visor" },
    { key: "neck", label: "Neck", tableLabel: "—", oldSlot: "Neck", examples: "Gorget, choker" },
    { key: "necklace", label: "Necklace", oldSlot: "Neck", examples: "Necklace, scarf, pendant, medallion" },
    { key: "shoulders", label: "Shoulders", oldSlot: "Neck", examples: "Coat, cloak, mantle, shawl, pauldrons" },
    { key: "clothing", label: "Clothing", oldSlot: "Body", examples: "Suit, shirt, vest, garb" },
    { key: "overcoat", label: "Overcoat", oldSlot: "Body", examples: "Robe, apron, coat, vestments, duster, surcoat" },
    { key: "chestplate", label: "Chestplate", oldSlot: "Body", examples: "Breastplate, chain shirt, and other Body armor" },
    { key: "backpack", label: "Backpack", oldSlot: "—", examples: "Backpack, bag, sheath" },
    { key: "ring", label: "Rings", tableLabel: "*", oldSlot: "Ring", examples: "One per finger or similar appendage", capacity: null, alwaysCapped: true },
    { key: "hands", label: "Hands", tableLabel: "—", oldSlot: "Hand", examples: "Gloves, gauntlets, handwraps" },
    { key: "arm", label: "Arm", oldSlot: "Hand", examples: "Vambrace, sleeves, couter" },
    { key: "wrist", label: "Wrist", oldSlot: "Hand", examples: "Bracers, bands" },
    { key: "belt", label: "Belt", tableLabel: "—", oldSlot: "Belt", examples: "Belt, girdle, cincture, sash, loincloth" },
    { key: "sheath", label: "Sheath", tableLabel: "Sheath*", oldSlot: "Belt", examples: "Sheath, quiver, satchel, bag, bandolier", capacity: 4, alwaysCapped: true },
    { key: "legs", label: "Legs", tableLabel: "—", oldSlot: "Legs", examples: "Pants, leggings, sabaton, skirt, hosen" },
    { key: "boots", label: "Boots", tableLabel: "—", oldSlot: "Boots", examples: "Boots, shoes, greaves, sandals, slippers" }
]);

const ALTERNATE_TO_STANDARD = Object.freeze({
    headband: "head", eyes: "head", ears: "head", face: "head",
    necklace: "neck", shoulders: "neck",
    clothing: "body", overcoat: "body", chestplate: "body", backpack: "body",
    arm: "hands", wrist: "hands", sheath: "belt"
});

const STANDARD_TO_ALTERNATE = Object.freeze({ body: "clothing" });

export const ITEM_POWER_OVERLAP_OPTIONS = Object.freeze({
    overlaps: "Overlapping / exclusive piece",
    stackable: "Non-overlapping accessory"
});

export const DARK_MAGIC_ITEM_NAMES = Object.freeze([
    "Yellow Garb",
    "Satan's Ring",
    "The Dark Hand",
    "Death's Pauldrons",
    "Nightmare Flask",
    "Soul Crystal"
]);

const DARK_MAGIC_NAME_KEYS = new Set(DARK_MAGIC_ITEM_NAMES.map(name => normalizeName(name)));

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .replaceAll("’", "'")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function getItemPowerSlotDefinitions(mode = "standard") {
    const source = mode === "alternate" ? ALTERNATE_SLOTS : STANDARD_SLOTS;
    return source.map(slot => ({ ...slot }));
}

export function getItemPowerSlotOptions(mode = "standard", current = "") {
    const options = Object.fromEntries(getItemPowerSlotDefinitions(mode).map(slot => [slot.key, slot.label]));
    if (current && !options[current]) options[current] = `${current} (legacy)`;
    return options;
}

export function normalizeItemPowerSlot(slot, mode = "standard") {
    const key = String(slot || "head").toLowerCase();
    const definitions = getItemPowerSlotDefinitions(mode);
    if (definitions.some(entry => entry.key === key)) return key;
    if (mode === "alternate") return STANDARD_TO_ALTERNATE[key] || key;
    return ALTERNATE_TO_STANDARD[key] || key;
}

export function itemPowerAllowsOverlap(item) {
    return item?.system?.overlapMode === "stackable";
}

function canAddToSlot(slot, item) {
    if (slot.alwaysCapped) {
        return slot.capacity == null || slot.items.length < slot.capacity;
    }
    if (itemPowerAllowsOverlap(item)) return true;
    return !slot.items.some(existing => !itemPowerAllowsOverlap(existing));
}

export function organizeItemsOfPower(items, mode = "standard") {
    const slots = getItemPowerSlotDefinitions(mode).map(slot => ({ ...slot, items: [] }));
    const byKey = new Map(slots.map(slot => [slot.key, slot]));
    const unequipped = [];

    for (const item of Array.isArray(items) ? items : []) {
        if (!item?.system?.equipped) {
            unequipped.push(item);
            continue;
        }
        const key = normalizeItemPowerSlot(item.system.slot, mode);
        const slot = byKey.get(key);
        if (!slot || !canAddToSlot(slot, item)) {
            unequipped.push(item);
            continue;
        }
        slot.items.push(item);
    }

    return {
        slots: slots.map(slot => ({
            ...slot,
            capacityLabel: slot.capacity == null ? "" : `${slot.items.length}/${slot.capacity}`,
            empty: slot.items.length === 0
        })),
        unequipped
    };
}

export function canEquipItemPower(items, candidate, mode = "standard") {
    const key = normalizeItemPowerSlot(candidate?.system?.slot, mode);
    const definition = getItemPowerSlotDefinitions(mode).find(slot => slot.key === key);
    if (!definition) return { allowed: false, reason: `Unknown Item of Power slot: ${key}.` };
    const slot = { ...definition, items: (Array.isArray(items) ? items : []).filter(item =>
        item?.id !== candidate?.id
        && item?.system?.equipped
        && normalizeItemPowerSlot(item.system.slot, mode) === key
    ) };
    if (canAddToSlot(slot, candidate)) return { allowed: true, slot: key };
    const capacity = definition.capacity ?? 1;
    return { allowed: false, reason: `${definition.label} is already occupied (${capacity} maximum).` };
}

export function isAttunementRemoved(mode = "standard") {
    return mode === "removed";
}

export function isItemPowerActive(item, mode = "standard") {
    if (item?.type !== "magicitem" || item?.system?.equipped !== true) return false;
    return isAttunementRemoved(mode) || item.system.attunement === true;
}

export function usesTechnologyAttunement(item, mode = "standard") {
    return mode === "technology"
        && item?.type !== "magicitem"
        && item?.system?.technological === true
        && item?.system?.technologyAttunement === true;
}

export function countAttunements(items, mode = "standard") {
    if (isAttunementRemoved(mode)) return 0;
    return (Array.isArray(items) ? items : []).filter(item =>
        (item?.type === "magicitem" && item?.system?.attunement === true)
        || usesTechnologyAttunement(item, mode)
    ).length;
}

export function corruptionValueFromPrice(price) {
    const value = Math.max(0, Number(price) || 0);
    if (value < 10000) return 1;
    if (value <= 25000) return 2;
    if (value <= 50000) return 3;
    return 4;
}

export function isDarkMagicItem(item) {
    return item?.type === "magicitem" && (
        item?.system?.darkMagic === true
        || DARK_MAGIC_NAME_KEYS.has(normalizeName(item?.name))
    );
}

export function getDarkMagicItemCorruptionValue(item) {
    if (!isDarkMagicItem(item)) return 0;
    const override = Number(item?.system?.corruptionValueOverride) || 0;
    return override > 0 ? Math.min(4, Math.max(1, Math.floor(override))) : corruptionValueFromPrice(item?.system?.price);
}
