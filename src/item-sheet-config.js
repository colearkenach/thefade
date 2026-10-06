import { getItemResource } from "./item-actions.js";

// UI families do not change stored document types or compendium identities.
export const ITEM_FAMILIES = [
    { key: "equipment", label: "Equipment", types: ["weapon", "armor", "clothing", "magicitem"] },
    { key: "gear", label: "General Gear", types: ["item", "travel", "musical"] },
    { key: "consumables", label: "Consumables", types: ["potion", "drug", "poison", "medical", "alchemical"] },
    { key: "devices", label: "Devices", types: ["staff", "wand", "gate", "communication", "containment", "dream"] },
    { key: "companions", label: "Creatures & Transport", types: ["mount", "vehicle", "biological", "fleshcraft"] },
    { key: "abilities", label: "Abilities", types: ["skill", "talent", "trait", "precept"] },
    { key: "origins", label: "Origins & Progression", types: ["species", "monsterspecies", "path", "monsterpath", "heritage"] },
    { key: "magic", label: "Spells", types: ["spell"] },
    { key: "rules", label: "Rules & Activities", types: ["disease", "mutation", "trap", "hazard", "downtime"] }
];

export const ITEM_PACKS = Object.freeze({
    skill: "skills", path: "paths", monsterpath: "paths", species: "species", monsterspecies: "species",
    weapon: "weapons", armor: "armor", spell: "spells", talent: "talents", trait: "traits", precept: "precepts",
    ...Object.fromEntries(["magicitem", "potion", "staff", "wand", "gate"].map(type => [type, "magic-item"])),
    ...Object.fromEntries(["item", "alchemical", "medical", "travel", "biological", "musical", "drug", "poison", "clothing", "communication", "containment", "dream", "mount", "vehicle", "fleshcraft"].map(type => [type, "mundane-item"]))
});

const field = (path, label, type = "text", aliases = []) => ({ path, label, type, aliases });
const text = (path, label, aliases) => field(path, label, "textarea", aliases);
const number = (path, label, aliases) => field(path, label, "number", aliases);
const effect = text("effect", "Effect");
const duration = field("duration", "Duration");
const range = field("range", "Range");
const daily = number("usesPerDay", "Uses per day (0 = unlimited)");
const spellFields = [field("spellName", "Spell"), text("spellDescription", "Spell effect", ["spellEffect"]), field("school", "School"), field("activation", "Activation"), number("spellLevel", "Spell level"), number("strength", "Strength")];
const COMPACT_CHOICES = {
    clothing: {
        clothingType: { normal: "Normal Clothing", arctic: "Arctic Clothing", desert: "Desert Clothing", noble: "Noble Clothing", hat: "Hat", shoes: "Shoes", mask: "Mask", glasses: "Glasses", jewelry: "Jewelry", snowshoes: "Snowshoes", gasmask: "Gas Mask", other: "Other" },
        protectionLevel: { none: "None", minor: "Minor", moderate: "Moderate", major: "Major", immunity: "Immunity" },
        quality: { poor: "Poor", common: "Common", fine: "Fine", masterwork: "Masterwork", noble: "Noble" },
        wornLocation: { body: "Body", head: "Head", feet: "Feet", hands: "Hands", face: "Face", neck: "Neck", wrist: "Wrist", finger: "Finger", other: "Other" }
    },
    dream: { dreamType: { "": "—", dream: "Dream", nightmare: "Nightmare" } },
    trait: { traitType: { general: "General", species: "Species", background: "Background", physical: "Physical", mental: "Mental", social: "Social", supernatural: "Supernatural" } }
};

const COMPACT_FIELDS = {
    item: [effect, duration, field("itemCategory", "Category")],
    travel: [effect, field("travelType", "Type"), field("speedBonus", "Speed bonus"), field("capacity", "Capacity"), text("specialFeatures", "Special features")],
    musical: [effect, field("instrumentType", "Instrument"), field("performanceBonus", "Performance bonus"), text("magicalProperties", "Magical properties")],
    potion: [effect, duration],
    drug: [effect, duration, number("addictionRating", "Addiction rating"), text("sideEffects", "Side effects"), text("addiction", "Addiction"), text("overdose", "Overdose")],
    poison: [effect, number("toxicity", "Toxicity"), field("poisonType", "Application"), field("onset", "Onset"), field("category", "Category"), duration],
    medical: [effect, duration, field("medicalType", "Type", "text", ["type"]), field("healingAmount", "Healing"), field("applicationTime", "Application time"), number("bonus", "Bonus")],
    staff: [...spellFields, daily, number("uses", "Uses today", ["usesToday"])],
    wand: [...spellFields, number("charges", "Charges"), number("maxCharges", "Maximum charges")],
    gate: [effect, range, field("distance", "Travel distance"), duration, daily],
    communication: [effect, range, field("complexity", "Audio / audiovisual"), field("relayCode", "Relay code"), daily],
    containment: [effect, field("creaturesAffected", "Creatures affected")],
    dream: [effect, field("dreamType", "Dream type"), duration],
    biological: [effect, field("creatureType", "Creature type"), number("hp", "HP"), number("maxHp", "Maximum HP"), number("energy", "Energy"), number("maxEnergy", "Maximum energy"), text("specialAbilities", "Special abilities")],
    mount: [field("mountType", "Type", "text", ["type"]), field("size", "Size"), number("hp", "HP"), field("movement", "Movement", "text", ["speed"]), field("carryCapacity", "Carrying capacity", "text", ["carryingCapacity"]), number("loyalty", "Loyalty"), text("specialAbilities", "Special abilities")],
    vehicle: [field("vehicleType", "Type", "text", ["type"]), field("size", "Size"), number("hp", "HP"), field("movement", "Movement", "text", ["speed"]), number("drivers", "Drivers"), number("passengers", "Passengers"), field("overland", "Overland movement"), field("cargo", "Cargo capacity", "text", ["cargoCapacity"]), field("condition", "Condition"), text("specialFeatures", "Special features")],
    talent: [text("prerequisites", "Requirements"), field("talentType", "Talent type"), field("associatedPath", "Associated path"), daily, number("currentUses", "Uses today")],
    trait: [text("prerequisites", "Requirements"), field("traitType", "Trait type")],
    precept: [effect, field("deity", "Deity"), daily, number("currentUses", "Uses today")],
    clothing: [text("specialEffect", "Effect"), field("clothingType", "Clothing type"), field("wornLocation", "Worn location"), field("material", "Material"), field("quality", "Quality"), number("coldBonus", "Cold bonus"), number("hotBonus", "Heat bonus"), number("coldPenalty", "Cold penalty"), number("hotPenalty", "Heat penalty"), field("skillBonus", "Skill"), field("skillBonusDice", "Bonus dice"), field("skillConditions", "Bonus conditions"), field("protectionType", "Protection against"), field("protectionLevel", "Protection level")]
};

export const usesCompactItemSheet = type => Object.hasOwn(COMPACT_FIELDS, type);
export const getItemFamily = type => ITEM_FAMILIES.find(family => family.types.includes(type)) || ITEM_FAMILIES[1];
const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const populated = value => value !== undefined && value !== null && value !== "";

// Bind to the field actually present on an old document. When both aliases
// contain different data, retain an editor for each instead of discarding one.
function buildFields(item, definition) {
    const source = item._source?.system || item.system || {};
    const paths = [definition.path, ...(definition.aliases || [])];
    const path = paths.find(key => populated(get(source, key)) && get(source, key) !== 0)
        || paths.find(key => populated(get(source, key))) || definition.path;
    const value = get(item.system, path) ?? get(source, path) ?? "";
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value).filter(key => ["current", "value", "max"].includes(key)).map(key => ({
            path: `system.${path}.${key}`, label: `${definition.label} ${key === "max" ? "maximum" : "current"}`, type: "number", value: value[key], dtype: "Number"
        }));
    }
    const view = { ...definition, path: `system.${path}`, value, multiline: definition.type === "textarea", dtype: definition.type === "number" || typeof value === "number" ? "Number" : "String" };
    return [view, ...paths.filter(key => key !== path && populated(get(source, key)) && get(source, key) !== value).map(key => ({
        ...view, path: `system.${key}`, value: get(source, key), label: `${definition.label} (${key.replace(/([A-Z])/g, " $1").toLowerCase()})`
    }))];
}

export function buildCompactItemView(item, sheetData = {}) {
    if (!usesCompactItemSheet(item.type)) return null;
    const fields = COMPACT_FIELDS[item.type].flatMap(definition => buildFields(item, definition));
    if (item.type === "medical" && populated(item.system.uses)) fields.push(...buildFields(item, number("uses", "Uses")));
    const choices = {
        ...COMPACT_CHOICES[item.type],
        ...(item.type === "poison" ? { poisonType: sheetData.poisonAdminOptions, onset: sheetData.poisonOnsetOptions, category: sheetData.poisonCategoryOptions } : {}),
        ...(item.type === "communication" ? { complexity: sheetData.communicationComplexityOptions } : {}),
        ...(item.type === "talent" ? { talentType: sheetData.talentTypes } : {}),
        ...(["staff", "wand"].includes(item.type) ? { school: sheetData.spellSchoolOptions } : {}),
        ...(["mount", "vehicle"].includes(item.type) ? { size: sheetData.sizeOptions } : {})
    };
    for (const field of fields) {
        const options = choices[field.path.replace(/^system\./, "")];
        if (!options) continue;
        // Keep custom values from older packs selectable and unchanged.
        const values = { ...options };
        if (!(field.value in values)) values[field.value] = field.value || "—";
        field.options = Object.entries(values).map(([value, label]) => ({ value, label, selected: value === String(field.value) }));
    }
    const abilities = ["talent", "trait", "precept"].includes(item.type);
    return {
        family: getItemFamily(item.type).label,
        fields, physical: !abilities, resource: getItemResource(item),
        bonuses: ["talent", "precept"].includes(item.type),
        poison: item.type === "poison",
        technical: !abilities,
        hasDetails: fields.length > 0
    };
}

export function itemDisplaySummary(item) {
    const sys = item.system || {};
    const plain = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return plain(sys.effect || sys.spellDescription || sys.spellEffect || sys.specialEffect || sys.healingAmount || sys.description).slice(0, 180);
}

export function buildInventoryGroups(items) {
    const dedicated = new Set(["weapon", "armor", "magicitem", "skill", "path", "monsterpath", "species", "monsterspecies", "spell", "talent", "trait", "precept", "heritage", "mutation", "downtime"]);
    const label = type => globalThis.game?.i18n?.localize(globalThis.CONFIG?.Item?.typeLabels?.[type] || type) || type;
    const groups = ITEM_FAMILIES.map(family => ({
        ...family,
        options: family.types.filter(type => !dedicated.has(type)).map(type => ({ type, label: label(type) })),
        items: []
    })).filter(family => family.options.length);
    for (const item of items) {
        if (dedicated.has(item.type)) continue;
        const family = groups.find(group => group.types.includes(item.type)) || groups.find(group => group.key === "gear");
        const resource = getItemResource(item);
        const summary = itemDisplaySummary(item);
        family.items.push({
            ...item, typeLabel: label(item.type), summary, resource,
            searchText: `${item.name} ${label(item.type)} ${summary}`.toLocaleLowerCase(),
            canCraft: item.type === "alchemical",
            isClothing: item.type === "clothing",
            isFleshcraft: item.type === "fleshcraft"
        });
    }
    return groups;
}
