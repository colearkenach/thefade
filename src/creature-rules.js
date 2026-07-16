import { COMBAT_DAMAGE_TYPES } from "./constants.js";

const ability = (id, name, description, mechanics = {}) => ({
    id,
    name,
    description,
    activation: "passive",
    actionCost: "",
    durationRounds: 0,
    bonuses: [],
    ...mechanics
});

const active = (id, name, description, mechanics = {}) => ability(id, name, description, {
    activation: "active",
    ...mechanics
});

const rule = (id, label, abilities, extra = {}) => ({ id, label, abilities, ...extra });

/** Creature types from the core rules. Sapient intentionally has no automatic grants. */
export const CREATURE_TYPE_RULES = Object.freeze({
    artificial: rule("artificial", "Artificial", [
        ability("soulless", "Soulless", "Soul is locked at 0 while the creature is soulless. It is immune to magical healing and magical damage; a Soul of 1 or more removes these effects.", { conditionalZero: "soul" }),
        ability("integrated-bulk", "Integrated Bulk", "Increase Base HP by 10 for every size category above Large.", { dynamic: "integratedBulk" }),
        ability("inanimate", "Inanimate", "Does not need to eat, sleep, or breathe to survive."),
        ability("darkvision", "Darkvision", "Can see in darkness just as well as daylight.", { vision: "darkvision" }),
        ability("immunities", "Immunities", "Immune to bleed, poisons, diseases, death effects, Paralysis, Illness, Fear, Sleep, and Pain.", {
            traits: { statuses: ["bleed", "paralysis", "illness", "fear", "sleep", "pain"], effects: ["poisons", "diseases", "deathEffects"] }
        }),
        ability("stasis", "Stasis", "Destroyed at 0 HP. It may enter Stasis for 8 hours to self-repair; this otherwise functions like sleep."),
        ability("unfazed", "Unfazed", "Receive +2 Grit against Deception attempts.")
    ]),
    beast: rule("beast", "Beast", [
        ability("keen-senses", "Keen Senses", "Roll at least 6D for all Sense skill checks and choose one Sense skill to roll at least 8D.")
    ]),
    dragon: rule("dragon", "Dragon", [
        ability("draconic-blood", "Draconic Blood", "Always counts as magical and receives +1D to all Spellcasting checks.", { bonuses: [{ type: "spell", target: "", value: 1 }] }),
        ability("immunities", "Immunities", "Immune to Sleep, Fear, and Paralysis.", { traits: { statuses: ["sleep", "fear", "paralysis"] } }),
        ability("darkvision", "Darkvision", "Can see in darkness just as well as daylight.", { vision: "darkvision" })
    ]),
    extradimensional: rule("extradimensional", "Extradimensional", [
        ability("otherworldly", "Otherworldly", "Can eat, sleep, and breathe, but does not need to do so to survive."),
        active("home-dimension", "Home Dimension", "After 1 minute of meditation, return to the creature's home realm once per day, plus one additional time at 5th level and every 5 levels thereafter. Returning to the mortal realm places it where it previously departed.", { actionCost: "1 minute" }),
        ability("darkvision", "Darkvision", "Can see in darkness just as well as daylight.", { vision: "darkvision" })
    ]),
    fey: rule("fey", "Fey", [
        ability("fey-speech", "Fey Speech", "Can speak with animals as though they share a language and can understand Fey creatures."),
        ability("enhanced-vision", "Enhanced Vision", "Can see up to 3 hexes in darkness unaided and twice as far as normal in dim light.", { vision: "enhanced" })
    ]),
    plants: rule("plants", "Plants", [
        ability("mindless", "Mindless", "Mind is locked at 0 and the creature receives no Talents. A Mind of 1 or more removes this restriction.", { conditionalZero: "mind" }),
        ability("immunities", "Immunities", "Immune to mind-affecting effects and Fear, Illness, Pain, Blindness, Deafness, Confusion, Dazed, and Sleep. Ordinary poisons and diseases do not affect Plants, though plant-based versions do.", {
            traits: { statuses: ["fear", "illness", "pain", "blindness", "deafness", "confusion", "dazed", "sleep"], effects: ["mindAffecting"] }
        })
    ]),
    sapient: rule("sapient", "Sapient", []),
    undead: rule("undead", "Undead", [
        ability("brain-or-brainless", "Brain or Brainless", "Undead with Mind 0 are Mindless and receive no Talents; a Mind of 1 or more removes this restriction.", { conditionalZero: "mind" }),
        ability("no-life-signs", "No Life Signs", "Does not need to eat or breathe, and most Undead do not require sleep."),
        ability("tortured-soul", "Tortured Soul", "Has Smiting Resistance and Moderate Expel Vulnerability.", { traits: { resistances: ["Sm"], vulnerabilities: { Ex: "moderate" } } }),
        ability("immunities", "Immunities", "Immune to poisons, diseases, mind-affecting effects, death effects, nonlethal damage, Fear, Illness, Pain, Confusion, Dazed, Stunned, and Sleep.", {
            traits: { statuses: ["fear", "illness", "pain", "confusion", "dazed", "stunned", "sleep"], effects: ["poisons", "diseases", "mindAffecting", "deathEffects"] }
        })
    ])
});

/** Common bestiary subtypes. Text-only clauses remain visible even when no safe numeric automation exists. */
export const CREATURE_SUBTYPE_RULES = Object.freeze({
    aberrant: rule("aberrant", "Aberrant", [
        ability("frightening", "Frightening", "Has the Frightening Universal Ability.", { traits: { abilities: [["defensive", "frightening"]] } }),
        ability("psychokinetic-resistance", "Psychokinetic Resistance", "Has Psychokinetic Resistance.", { traits: { resistances: ["Psi"] } }),
        ability("alien-anatomy", "Alien Anatomy", "Lore and Medicine attempts concerning the Aberrant increase their DT by 2.")
    ]),
    aeon: rule("aeon", "Aeon", [
        ability("universal-language", "Universal Language", "Can understand every language."),
        ability("ancient-lore", "Ancient Lore", "Receives +1D to all Lore skill checks.", { bonuses: [{ type: "skill", target: "Lore", value: 1 }] }),
        ability("cold-resistance", "Cold Resistance", "Has Resistance to Cold damage.", { traits: { resistances: ["C"] } })
    ]),
    animal: rule("animal", "Animal", [
        ability("bestial", "Bestial", "Mind is limited to 1. The creature cannot learn languages and communicates only in a simplistic manner.", { cap: { mind: 1 } }),
        ability("non-combatant", "Non-Combatant", "Some animals treat their natural attacks as secondary even when they would normally be primary.")
    ]),
    apex: rule("apex", "Apex", [
        ability("perfect-hunter", "Perfect Hunter", "Hunting and Intimidate are at least Learned, and Hunting rolls at least 8D."),
        active("command-kind", "Command Kind", "Spend a Minor Action to command creatures of the same type equal to EL + Presence (minimum 2).", { actionCost: "Minor Action" }),
        ability("apex-reflexes", "Apex Reflexes", "Immune to Fear and Flat-Footed and receives +2 Initiative.", { bonuses: [{ type: "initiative", target: "", value: 2 }], traits: { statuses: ["fear", "flatFooted"] } })
    ]),
    aquatic: rule("aquatic", "Aquatic", [
        ability("water-breathing", "Water Breathing", "Can breathe underwater but suffocates on land unless it has Amphibious."),
        ability("natural-swimmer", "Natural Swimmer", "Receives +2D to Athletics checks made to Swim.")
    ]),
    archon: rule("archon", "Archon", [
        ability("suppressing-presence", "Suppressing Presence", "A 6-hex aura prevents creatures from entering Ignition and ends Ignition for creatures that enter it."),
        ability("false-light", "False Light", "A failed DT 6 Lore (Religion or Planar) identification misidentifies the Archon as Celestial and Aeon."),
        ability("immutable", "Immutable", "Immune to effects that would forcibly transform or disfigure it."),
        ability("electricity-resistance", "Electricity Resistance", "Has Electricity Resistance.", { traits: { resistances: ["E"] } })
    ]),
    awakened: rule("awakened", "Awakened", [
        ability("awakened-mind", "Awakened Mind", "Loses Bestial, learns language, replaces Mind with 1d12, and receives five Learned skills, at least two of which are Knowledge skills.")
    ]),
    blight: rule("blight", "Blight", [
        ability("disease-carrier", "Disease Carrier", "Immune to poisons and diseases but acts as a carrier for diseases.", { traits: { effects: ["poisons", "diseases"] } }),
        ability("aura-of-decay", "Aura of Decay", "Creatures within 4 hexes suffer -4 Resilience and take +1d6 direct HP damage when affected by poison or disease.")
    ]),
    blob: rule("blob", "Blob", [
        ability("blob-form", "Blob Form", "Has All-Around Vision and Amorphous.", { traits: { abilities: [["defensive", "allAroundVision"], ["defensive", "amorphous"]] } }),
        ability("tremor-sense", "Tremor Sense", "Has Tremor Sense out to 12 hexes.", { traits: { abilities: [["sensory", "tremorSense"]] } }),
        ability("blob-immunities", "Blob Immunities", "Immune to poison, disease, nonlethal damage, Blindness, Confusion, Deafness, Fatigue, Fear, Flat-Footed, Illness, Pain, Paralysis, Sleep, and Stunned.", {
            traits: { statuses: ["blindness", "confusion", "deafness", "fatigue", "fear", "flatFooted", "illness", "pain", "paralysis", "sleep", "stunned"], effects: ["poisons", "diseases"] }
        }),
        ability("no-front", "No Front", "Immune to critical hits; ignores facing and Gang Up modifiers and is always treated as facing front.", { traits: { effects: ["criticalHits"] } }),
        ability("no-anatomy", "No Anatomy", "Usually has no limbs. With only one location, Attack Location is not rolled and the creature is immune to Trip."),
        ability("contorting", "Contorting", "A Blob with Contortion receives +4D to Contortion and is immune to Grapple.")
    ]),
    celestial: rule("celestial", "Celestial", [
        ability("universal-language", "Universal Language", "Can understand every language."),
        ability("holy-nature", "Holy Nature", "Has Smiting Resistance and Moderate Expel Vulnerability.", { traits: { resistances: ["Sm"], vulnerabilities: { Ex: "moderate" } } }),
        active("divine-communion", "Divine Communion", "Can communicate with its associated deity for 1 minute per day.", { actionCost: "1 minute" }),
        ability("darkvision", "Darkvision", "Has Darkvision.", { vision: "darkvision" }),
        ability("truespeak", "Truespeak", "Has the Truespeak Universal Ability.", { traits: { abilities: [["sensory", "truespeak"]] } })
    ]),
    chaos: rule("chaos", "Chaos", [
        ability("empathic-communication", "Empathic Communication", "Communicates through immediate empathic understanding without speech or telepathy."),
        ability("chaos-form", "Chaos Form", "Has All-Around Vision, Amorphous, Frightening, Mind Static, and Shapeshift.", { traits: { abilities: [["defensive", "allAroundVision"], ["defensive", "amorphous"], ["defensive", "frightening"], ["defensive", "mindStatic"], ["defensive", "shapeshift"]] } }),
        ability("return-to-chaos", "Return to Chaos", "On death, returns to the Realm of Chaos to be reborn or reused without remembering its death.")
    ]),
    clockwork: rule("clockwork", "Clockwork", [
        ability("winding", "Winding", "Must be wound for 1 minute to operate for 24 hours; another creature may wind it."),
        ability("stable-technology", "Stable Technology", "Spells cast on it have a 50% chance to destabilize it and deal 1d6 direct HP damage, including beneficial spells."),
        active("overcharge", "Overcharge", "Spend a Minor Action and 1 hour of operation to gain +1D attacks, +4 Initiative, and +1 Avoid for 2 rounds per EL; then wait 1 minute before using it again.", {
            actionCost: "Minor Action", dynamic: "clockworkOvercharge", durationRounds: 2
        })
    ]),
    colossus: rule("colossus", "Colossus", [
        ability("titanic", "Titanic", "Always Titanic size.", { minimumSize: "titanic" }),
        ability("impervious-deflection", "Impervious Deflection", "Natural Deflection can be overcome only by magical weapons, adamantine, blacksteel, and spells."),
        ability("magical-strikes", "Magical Strikes", "Natural attacks and wielded weapons count as magical."),
        ability("brutish-mass", "Brutish Mass", "Uses full Physique instead of half Physique when calculating Brutish bonus damage."),
        ability("colossal-vitality", "Colossal Vitality", "Receives bonus HP equal to Total Level × 5.", { dynamic: "colossusHp" }),
        ability("colossal-resilience", "Colossal Resilience", "Receives +3 Resilience.", { bonuses: [{ type: "resilience", target: "", value: 3 }] })
    ]),
    corrupted: rule("corrupted", "Corrupted", [
        ability("corruption-resistance", "Corruption Resistance", "Has Corruption Resistance.", { traits: { resistances: ["Co"] } }),
        active("corrupt-attacks", "Corrupt Attacks", "May convert weapon and unarmed attacks to Corruption damage."),
        ability("tainted-healing", "Tainted Healing", "Healing effects are halved against the creature.")
    ]),
    cryptid: rule("cryptid", "Cryptid", [
        ability("sixth-sense", "Sixth Sense", "Knows when it is being observed and immediately knows when it fails a Sneaking check."),
        ability("elusive-nature", "Elusive Nature", "Lore (Wilderness) identification attempts increase their DT by 2.")
    ]),
    cthonic: rule("cthonic", "Cthonic", [
        ability("terror", "Terror", "Has Frightening and is immune to the Frightening ability of other Cthonic creatures.", { traits: { abilities: [["defensive", "frightening"]] } }),
        ability("abstract-mind", "Abstract Mind", "Has Psychokinetic Resistance and +2 Grit.", { bonuses: [{ type: "grit", target: "", value: 2 }], traits: { resistances: ["Psi"] } }),
        ability("darkvision", "Darkvision", "Has Darkvision if it did not already.", { vision: "darkvision" })
    ]),
    dream: rule("dream", "Dream", [
        ability("dream-being", "Dream Being", "Incorporeal to awake creatures, but corporeal to sleeping creatures and creatures incapable of sleep."),
        active("dream-combat", "Dream Combat", "A sleeping creature within 24 hexes may create a temporary Dream copy to fight it. The copy shares HP and cannot move farther than 24 hexes from its body.")
    ]),
    element: rule("element", "Element", [
        ability("element-immunity", "Element Immunity", "Immune to its chosen element, upgrading to Absorption at EL 6. Corruption grants Resistance instead and Untyped grants no protection."),
        active("element-damage", "Element Damage", "May change natural or weapon attack damage to match its chosen element.")
    ]),
    giant: rule("giant", "Giant", [
        ability("large-frame", "Large Frame", "At least Large size; effects cannot reduce it below Large.", { minimumSize: "large" }),
        ability("armor-bearer", "Armor Bearer", "Ignores the Heavy quality of worn armor."),
        ability("great-capacity", "Great Capacity", "Treats Physique as 4 higher for carrying capacity."),
        ability("towering-presence", "Towering Presence", "Receives +1D Intimidation against smaller creatures.")
    ]),
    golem: rule("golem", "Golem", [
        ability("creator-language", "Creator's Language", "Cannot speak, but understands, reads, and writes its creator's native language.")
    ]),
    hivemind: rule("hivemind", "Hivemind", [
        ability("shared-mind", "Shared Mind", "Linked creatures share one controller identity for Hivemind features."),
        ability("linked-consciousness", "Linked Consciousness", "Shares threat awareness with all linked minds on the same planet, though not their senses."),
        ability("shared-language", "Shared Language", "All members share every language known by any linked member."),
        ability("mental-barrier", "Mental Barrier", "Immune to Confusion, Dazed, Fear, Pain, Sleep, and Stunned.", { traits: { statuses: ["confusion", "dazed", "fear", "pain", "sleep", "stunned"] } })
    ]),
    horseman: rule("horseman", "Horseman", [
        ability("supernatural", "Supernatural", "Counts as Supernatural and has the Supernatural subtype."),
        active("realm-travel", "Realm Travel", "Once per day, travel from one Realm to another and bring along creatures currently being touched."),
        ability("unbound", "Unbound", "Immune to control and mind-altering effects, but not Psychokinetic damage.", { traits: { effects: ["mindAffecting"] } })
    ]),
    incorporeal: rule("incorporeal", "Incorporeal", [
        ability("incorporeal", "Incorporeal", "Has the Incorporeal Universal Ability.", { traits: { abilities: [["defensive", "incorporeal"]] } }),
        ability("formless-vitality", "Formless Vitality", "Increases Base HP by 30 because it lacks Armored Protection.", { bonuses: [{ type: "hp", target: "", value: 30 }] }),
        ability("weightless", "Weightless", "Always flies and does not touch the ground.", { movement: "fly" }),
        ability("expel-vulnerability", "Expel Vulnerability", "Has Moderate Expel Vulnerability.", { traits: { vulnerabilities: { Ex: "moderate" } } })
    ]),
    infernal: rule("infernal", "Infernal", [
        ability("hellish-cunning", "Hellish Cunning", "Receives +2D to Deception, Etiquette, and Persuasion.", { bonuses: [{ type: "skill", target: "Deception", value: 2 }, { type: "skill", target: "Etiquette", value: 2 }, { type: "skill", target: "Persuasion", value: 2 }] }),
        active("make-a-deal", "Make a Deal", "May make a deal with a mortal for something within the Infernal's power. If the mortal breaks it, all demons in Hell are alerted."),
        ability("universal-language", "Universal Language", "Can understand every language."),
        ability("infernal-nature", "Infernal Nature", "Immune to Fire and has Moderate Smiting Vulnerability.", { traits: { damageImmunities: ["F"], vulnerabilities: { Sm: "moderate" } } })
    ]),
    jelly: rule("jelly", "Jelly", [
        ability("blob-heritage", "Blob Heritage", "Receives all Blob abilities."),
        ability("energized", "Energized", "Immune to one arcane damage type and converts natural attacks to that damage type.")
    ], { inherits: ["blob"] }),
    mindless: rule("mindless", "Mindless", [
        ability("mindless", "Mindless", "Cannot communicate or be reasoned with, has no Mind attribute, is immune to Psychokinetic damage, and is immune to Grit attacks that do not also affect objects.", { lock: { mind: 0 }, traits: { damageImmunities: ["Psi"] } })
    ]),
    pudding: rule("pudding", "Pudding", [
        ability("blob-heritage", "Blob Heritage", "Receives all Blob abilities."),
        ability("caustic", "Caustic", "Manufactured weapons that attack it take 1 Integrity damage; its attacks deal +1d12 damage to manufactured armor AP."),
        active("split", "Split", "As a Reaction at half HP or less, split into two creatures one size smaller, each with the current HP. May split no more than twice per day.", { actionCost: "Reaction" })
    ], { inherits: ["blob"] }),
    robot: rule("robot", "Robot", [
        ability("artificial-immunities", "Artificial Immunities", "Shares the immunities of the Artificial creature type."),
        ability("electricity-vulnerability", "Electricity Vulnerability", "Has Moderate Electricity Vulnerability.", { traits: { vulnerabilities: { E: "moderate" } } })
    ]),
    swarm: rule("swarm", "Swarm", [
        ability("distributed-body", "Distributed Body", "Takes half damage from single-target effects."),
        ability("area-vulnerability", "Area Vulnerability", "Has Severe Vulnerability to area-of-effect attacks."),
        ability("swarm-immunities", "Swarm Immunities", "Immune to Disarm, Grapple, Reposition, Steal, Sunder, Trip, and every status effect except Dazed and Flat-Footed.", { traits: { statuses: ["bleed", "blindness", "confusion", "deafness", "fatigue", "fear", "illness", "pain", "paralysis", "sleep", "staggered", "stunned"] } }),
        ability("occupy", "Occupy", "Can enter occupied hexes and attacks creatures when it first enters and when they begin a turn inside the swarm.")
    ]),
    unique: rule("unique", "Unique", [
        ability("one-of-a-kind", "One of a Kind", "Only one of this creature exists; if killed, it is gone.")
    ]),
    vermin: rule("vermin", "Vermin", [
        ability("instinct-alone", "Instinct Alone", "Many Vermin possess the Mindless trait unless otherwise indicated."),
        ability("soulless", "Soulless", "Has no Soul, cannot learn spells or use magic, and is immune to Smiting and Expel damage.", { lock: { soul: 0 }, traits: { damageImmunities: ["Sm", "Ex"] } })
    ]),
    virtue: rule("virtue", "Virtue", [
        ability("primary-directive", "Primary Directive", "Cannot act against its primary directive or be forced to do so, though it may be deceived into undermining it."),
        ability("conceptual-reinforcement", "Conceptual Reinforcement", "Within a 4-hex aura, the Virtue and creatures enforcing its directive receive +2D to all checks.")
    ]),
    youkai: rule("youkai", "Youkai", [
        ability("human-form", "Human Form", "Sapient Youkai receive +2D Disguise to appear human. Non-Sapient Youkai can shapeshift into a human-like form instead."),
        ability("miraculous-aging", "Miraculous Aging", "Appears Adult even while Old and receives +2D Disguise to appear younger.", { bonuses: [{ type: "skill", target: "Disguise", value: 2 }] })
    ])
});

export const CREATURE_TYPE_OPTIONS = Object.freeze(Object.fromEntries(
    Object.values(CREATURE_TYPE_RULES).map(entry => [entry.id, entry.label])
));

export const CREATURE_SUBTYPE_OPTIONS = Object.freeze(Object.fromEntries(
    Object.values(CREATURE_SUBTYPE_RULES).map(entry => [entry.id, entry.label])
));

export const RESISTANCE_OPTIONS = Object.freeze(Object.fromEntries(
    COMBAT_DAMAGE_TYPES.map(type => [type.key, type.label])
));

const TYPE_ALIASES = Object.freeze({
    humanoid: "sapient",
    extraplanar: "extradimensional",
    extradimensional: "extradimensional",
    plant: "plants",
    plants: "plants"
});

const SIZE_ORDER = ["miniscule", "diminutive", "tiny", "small", "medium", "large", "massive", "immense", "enormous", "titanic"];

export function normalizeCreatureType(value) {
    const key = String(value || "sapient").trim().toLowerCase();
    return TYPE_ALIASES[key] || (CREATURE_TYPE_RULES[key] ? key : "sapient");
}

export function normalizeCreatureSubtypes(values, legacyText = "") {
    const hasStructuredSelection = Array.isArray(values);
    const selected = hasStructuredSelection ? values : [];
    const legacy = String(legacyText || "").split(/[;,]+/).map(value => value.trim().toLowerCase()).filter(Boolean);
    const byLabel = new Map(Object.values(CREATURE_SUBTYPE_RULES).map(entry => [entry.label.toLowerCase(), entry.id]));
    const migratedLegacy = hasStructuredSelection ? [] : legacy.map(value => CREATURE_SUBTYPE_RULES[value]?.id || byLabel.get(value));
    const ids = [...selected, ...migratedLegacy]
        .map(value => String(value || "").trim().toLowerCase())
        .filter(value => CREATURE_SUBTYPE_RULES[value]);
    return [...new Set(ids)];
}

export function getCreatureIdentity(system, scope = "character") {
    const source = scope === "character" ? (system?.species || {}) : system || {};
    return {
        type: normalizeCreatureType(source.creatureType),
        subtypes: normalizeCreatureSubtypes(source.creatureSubtypes, source.creatureSubtype),
        source
    };
}

export function buildCreatureSubtypeSelector(system, scope = "character") {
    const { subtypes } = getCreatureIdentity(system, scope);
    const selectedSet = new Set(subtypes);
    return {
        selected: subtypes.map(id => ({ id, label: CREATURE_SUBTYPE_RULES[id].label })),
        available: Object.values(CREATURE_SUBTYPE_RULES)
            .filter(entry => !selectedSet.has(entry.id))
            .map(entry => ({ id: entry.id, label: entry.label }))
    };
}

function expandSubtypeRules(ids) {
    const expanded = [];
    const seen = new Set();
    const visit = id => {
        const entry = CREATURE_SUBTYPE_RULES[id];
        if (!entry || seen.has(id)) return;
        for (const inherited of entry.inherits || []) visit(inherited);
        seen.add(id);
        expanded.push(entry);
    };
    for (const id of ids) visit(id);
    return expanded;
}

function resolveAbility(entry, system, scope) {
    const resolved = {
        ...entry,
        bonuses: (entry.bonuses || []).map(bonus => ({ ...bonus })),
        traits: entry.traits ? foundry.utils.deepClone(entry.traits) : null
    };
    const actorSystem = scope === "character" || scope === "npc" ? system : null;
    const identitySource = scope === "character" ? system?.species : system;

    if (entry.dynamic === "integratedBulk") {
        const index = SIZE_ORDER.indexOf(identitySource?.size || "medium");
        const large = SIZE_ORDER.indexOf("large");
        const value = Math.max(0, index - large) * 10;
        if (value) resolved.bonuses.push({ type: "hp", target: "", value });
    }
    if (entry.dynamic === "colossusHp") {
        const level = Math.max(0, Number(actorSystem?.level ?? actorSystem?.el ?? 0) || 0);
        if (level) resolved.bonuses.push({ type: "hp", target: "", value: level * 5 });
    }
    if (entry.dynamic === "clockworkOvercharge") {
        const el = Math.max(1, Number(actorSystem?.el ?? actorSystem?.level ?? 1) || 1);
        resolved.durationRounds = el * 2;
        resolved.bonuses.push(
            { type: "attack", target: "", value: 1 },
            { type: "initiative", target: "", value: 4 },
            { type: "avoid", target: "", value: 1 }
        );
    }
    return resolved;
}

/** Build the read-only type/subtype ability sources shown on actor and species sheets. */
export function getCreatureRuleSources(system, scope = "character") {
    const identity = getCreatureIdentity(system, scope);
    const sources = [];
    const typeRule = CREATURE_TYPE_RULES[identity.type];
    if (typeRule?.abilities?.length) {
        sources.push({
            id: `type.${typeRule.id}`,
            kind: "Type",
            label: typeRule.label,
            abilities: typeRule.abilities.map(entry => resolveAbility(entry, system, scope))
        });
    }
    for (const subtypeRule of expandSubtypeRules(identity.subtypes)) {
        sources.push({
            id: `subtype.${subtypeRule.id}`,
            kind: "Subtype",
            label: subtypeRule.label,
            abilities: subtypeRule.abilities.map(entry => resolveAbility(entry, system, scope))
        });
    }
    return sources;
}

function setGranted(target, key) {
    if (target && key) target[key] = true;
}

/** Apply safe, unambiguous type/subtype mechanics and return passive numeric bonuses. */
export function applyCreatureRuleEffects(data, actorType = "character") {
    const scope = actorType === "character" ? "character" : "npc";
    const sources = getCreatureRuleSources(data, scope);
    const traits = data.combatTraits || {};
    traits.ruleGranted = { abilities: {}, resistances: {}, immunities: { damageTypes: {}, statuses: {}, effects: {} }, vulnerabilities: {} };
    data.creatureRuleAttributeLocks = {};
    data.creatureRuleAttributeCaps = {};
    const passiveBonuses = [];

    for (const source of sources) {
        for (const entry of source.abilities) {
            if (entry.activation !== "active") passiveBonuses.push(...(entry.bonuses || []));

            const mechanics = entry.traits || {};
            for (const [category, abilityKey] of mechanics.abilities || []) {
                if (!traits.abilities?.[category]) continue;
                traits.abilities[category][abilityKey] = true;
                if (!traits.ruleGranted.abilities[category]) traits.ruleGranted.abilities[category] = {};
                traits.ruleGranted.abilities[category][abilityKey] = true;
            }
            for (const key of mechanics.resistances || []) {
                setGranted(traits.resistances, key);
                setGranted(traits.ruleGranted.resistances, key);
            }
            for (const key of mechanics.damageImmunities || []) {
                setGranted(traits.immunities?.damageTypes, key);
                setGranted(traits.ruleGranted.immunities.damageTypes, key);
            }
            for (const key of mechanics.statuses || []) {
                setGranted(traits.immunities?.statuses, key);
                setGranted(traits.ruleGranted.immunities.statuses, key);
            }
            for (const key of mechanics.effects || []) {
                setGranted(traits.immunities?.effects, key);
                setGranted(traits.ruleGranted.immunities.effects, key);
            }
            for (const [key, severity] of Object.entries(mechanics.vulnerabilities || {})) {
                setGranted(traits.vulnerabilities, key);
                traits.vulnerabilitySeverity[key] = severity;
                traits.ruleGranted.vulnerabilities[key] = true;
            }

            if (entry.vision === "darkvision") {
                data.vision = data.vision || {};
                data.vision.darkvision = true;
            } else if (entry.vision === "enhanced") {
                data.vision = data.vision || {};
                data.vision.enhanced = true;
            }
            if (entry.movement === "fly") {
                data.movement = data.movement || {};
                data.movement.fly = Math.max(Number(data.movement.fly) || 0, Number(data.movement.land) || 4);
            }
            for (const [attribute, value] of Object.entries(entry.lock || {})) {
                data.creatureRuleAttributeLocks[attribute] = Number(value);
            }
            if (entry.conditionalZero) {
                const raw = Number(data.attributes?.[entry.conditionalZero]?.value ?? 0);
                if (raw < 1) data.creatureRuleAttributeLocks[entry.conditionalZero] = 0;
            }
            for (const [attribute, value] of Object.entries(entry.cap || {})) {
                const previous = data.creatureRuleAttributeCaps[attribute];
                data.creatureRuleAttributeCaps[attribute] = previous === undefined ? Number(value) : Math.min(previous, Number(value));
            }
            if (entry.minimumSize) {
                const identitySource = scope === "character" ? data.species : data;
                const current = SIZE_ORDER.indexOf(identitySource?.size || "medium");
                const minimum = SIZE_ORDER.indexOf(entry.minimumSize);
                if (identitySource && current < minimum) identitySource.size = entry.minimumSize;
            }
        }
    }

    // Awakened explicitly removes the Animal subtype's Bestial Mind cap.
    const identity = getCreatureIdentity(data, scope);
    if (identity.subtypes.includes("awakened")) delete data.creatureRuleAttributeCaps.mind;
    data.creatureRuleSources = sources;
    return passiveBonuses;
}

export function resistanceLabel(key) {
    return RESISTANCE_OPTIONS[key] || key || "Unknown";
}
