export const ACCESS_LEVEL_RANKS = Object.freeze([
    { key: "ubiquitous", label: "Ubiquitous", value: 2, examples: "Trench Spike" },
    { key: "uncommon", label: "Uncommon", value: 4, examples: "Insurance, Vestigial Blade, Gnashcutter, Grave Spade, Blight-Bow, Canister Launcher" },
    { key: "scarce", label: "Scarce", value: 6, examples: "Brand of Justice, Protean Formknife, Trifecta's Brand, Rad Knife Mk. II, Soulbrand, Nest-Blade, Mandible-Catcher, Stalwart Cleaver, Trifecta Censer, Pulse Baton, Pakt Repeater" },
    { key: "rare", label: "Rare", value: 8, examples: "Void-Fang, Psionic Foil, Moon Crescent, Eclipse Longsword, Ashtplag, Gash'kan Scepter, Arc-Caster, Resonance Rifle" },
    { key: "unique", label: "Unique", value: 10, examples: "Null Projector" }
]);

export const AVERAGE_GEAR_ACCESS_LEVELS = Object.freeze([
    { value: 2, examples: "Common weapons, most armor, basic supplies, mundane equipment" },
    { value: 4, examples: "Specialty weapons, breastplates, strange-sized armor, uncommon materials" },
    { value: 6, examples: "Exotic weaponry, rare materials, enchantments" },
    { value: 8, examples: "Faction-exclusive gear, adamantine equipment, most Items of Power" },
    { value: 10, examples: "One-of-a-kind relics and artifacts of historical significance" }
]);

export const ACCESS_LEVEL_SKILLS = Object.freeze([
    { label: "Lore [Underworld]", use: "Black markets, illicit goods, stolen relics, smuggled contraband" },
    { label: "Research", use: "Track locations or sellers and find records of sales or sightings" },
    { label: "Haggling", use: "Gain access to restricted stock or convince a seller to part with it" },
    { label: "Persuasion", use: "Open guild inventory or convince collectors to sell" },
    { label: "Deception", use: "Pose as authorized personnel or bluff credentials" },
    { label: "Etiquette", use: "Navigate high-society auctions or exclusive trade circles" },
    { label: "Intimidate", use: "Pressure reluctant sellers or threaten fences" },
    { label: "Lore [Region or Faction]", use: "Know which factions possess an item and where" }
]);

export const ACCESS_LEVEL_MODIFIERS = Object.freeze([
    { key: "majorCity", label: "Major city or trade hub", value: -1 },
    { key: "metropolis", label: "Metropolis with established guild presence", value: -2 },
    { key: "rural", label: "Rural village or frontier outpost", value: 1 },
    { key: "warzone", label: "Warzone or blockaded region", value: 2 },
    { key: "localProduction", label: "Produced locally or by a local faction", value: -2 },
    { key: "hostileFaction", label: "From a hostile or enemy faction", value: 2 },
    { key: "illegal", label: "Illegal in the current jurisdiction", value: 2 },
    { key: "contact", label: "Relevant contact or faction membership", value: -1, variable: "−1 to −3" },
    { key: "repeatBuyer", label: "Reputation as a repeat buyer", value: -1 },
    { key: "darkMagic", label: "Dark Magic in nature", value: 2 }
]);

export function calculateAccessLevel(base, modifiers = [], custom = 0) {
    const total = (Number(base) || 2)
        + (Array.isArray(modifiers) ? modifiers : []).reduce((sum, value) => sum + (Number(value) || 0), 0)
        + (Number(custom) || 0);
    return Math.max(2, total);
}
