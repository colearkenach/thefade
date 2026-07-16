// Built-in, opt-in world content. The installer creates normal world Items
// instead of mutating the system's LevelDB compendiums. Every record has a
// stable flag so running the installer again only adds genuinely new entries.

import { RULE_SOURCES } from "./rules.js";

const trap = (id, name, system) => ({ id: `trap.${id}`, name, type: "trap", img: "icons/svg/trap.svg", system });
const hazard = (id, name, system) => ({ id: `hazard.${id}`, name, type: "hazard", img: "icons/svg/hazard.svg", system });
const downtime = (id, name, system) => ({ id: `downtime.${id}`, name, type: "downtime", img: "icons/svg/clockwork.svg", system });
const heritage = (id, name, system) => ({ id: `heritage.${id}`, name, type: "heritage", img: "icons/svg/biohazard.svg", system });

export const TRAP_LIBRARY = Object.freeze([
    trap("pit", "Pit Trap", { level:1, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:4, trigger:"Pressure plate", attackDice:6, defense:"avoid", damage:"4", damageType:"B", bypassArmor:true, reset:"Manual (replace cover)", effect:"The target falls 4 yards. Climbing out requires a DT 4 Athletics check.", source: RULE_SOURCES.traps }),
    trap("spiked-pit", "Spiked Pit Trap", { level:2, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:4, trigger:"Pressure plate", attackDice:6, defense:"avoid", damage:"8", damageType:"P", critical:3, reset:"Manual (replace cover)", effect:"The target falls 4 yards and suffers falling damage plus 4 piercing damage. Climbing out requires DT 4 Athletics.", source: RULE_SOURCES.traps }),
    trap("needle", "Needle Trap", { level:1, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:4, trigger:"Locked door or chest", attackDice:6, defense:"avoid", damage:"8", damageType:"P", critical:4, reset:"Automatic", effect:"Fires as a repeating crossbow with Auto; normally loaded with 25 bolts.", source: RULE_SOURCES.traps }),
    trap("armor-piercing-bolt", "Armor-Piercing Bolt Trap", { level:2, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:4, trigger:"Tripwire", attackDice:8, defense:"avoid", damage:"4", damageType:"P", reset:"Manual (reload)", effect:"Damage is doubled against armor AP and has the Savage quality.", source: RULE_SOURCES.traps }),
    trap("swinging-blade", "Swinging Blade", { level:3, category:"mechanical", detectionSkill:"Sight", detectionDT:5, disarmSkill:"Lockpicking", disarmDT:6, trigger:"Tripwire", attackDice:10, defense:"avoid", damage:"10", damageType:"S", critical:3, reset:"Automatic", effect:"The attack has the Deadly quality.", source: RULE_SOURCES.traps }),
    trap("crushing-ceiling", "Crushing Ceiling", { level:5, category:"mechanical", detectionSkill:"Sight DT 6 or Hearing", detectionDT:5, disarmSkill:"Lockpicking", disarmDT:7, trigger:"Pressure plate", attackDice:12, defense:"avoid", damage:"20", damageType:"B", bypassArmor:true, reset:"Automatic (1 minute)", effect:"Targets are knocked prone. Creatures remaining beneath it take the damage again without an attack until it resets after 1d6 rounds.", source: RULE_SOURCES.traps }),
    trap("rolling-boulder", "Rolling Boulder", { level:6, category:"mechanical", detectionSkill:"Sight DT 6 or Hearing", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:8, trigger:"Pressure plate", attackDice:12, defense:"avoid", damage:"50", damageType:"B", reset:"None", effect:"Attacks everyone in a 10-hex by 2-hex line and knocks hit targets prone.", source: RULE_SOURCES.traps }),
    trap("bear", "Bear Trap", { level:2, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:5, trigger:"Step", attackDice:8, defense:"avoid", damage:"10", damageType:"S", critical:3, reset:"Manual", effect:"Hits a leg and restrains the target. Escape requires DT 8 Athletics or Contortion, or disarming the trap.", source: RULE_SOURCES.traps }),
    trap("net", "Net Trap", { level:1, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:2, trigger:"Tripwire", attackDice:6, defense:"avoid", damage:"0", damageType:"Ut", reset:"Manual", effect:"The target is grappled and unable to move. Escape requires DT 5 Athletics or Contortion. The net has Integrity 5 and break DT 3.", source: RULE_SOURCES.traps }),
    trap("scythe-hall", "Scythe Blade Hall", { level:7, category:"mechanical", detectionSkill:"Sight", detectionDT:4, disarmSkill:"Lockpicking", disarmDT:10, trigger:"Constant", attackDice:15, defense:"avoid", damage:"28", damageType:"S", critical:3, reset:"Automatic", effect:"Crossing the 12-hex hall requires four DT 6 Acrobatics checks; each failure triggers an attack. A scythe has Avoid 8 and Integrity 40.", source: RULE_SOURCES.traps }),
    trap("alarm-ward", "Alarm Ward", { level:1, category:"magical", detectionSkill:"Sight", detectionDT:6, disarmSkill:"Spellcasting", disarmDT:4, trigger:"Proximity (3 hexes)", attackDice:0, defense:"none", damage:"0", damageType:"Ut", reset:"Automatic (once per hour)", effect:"Creates an alarm audible within 100 yards.", source: RULE_SOURCES.traps }),
    trap("glyph-pain", "Glyph of Pain", { level:2, category:"magical", detectionSkill:"Sight", detectionDT:6, disarmSkill:"Spellcasting", disarmDT:6, trigger:"Touch", attackDice:8, defense:"grit", damage:"0", damageType:"Ut", reset:"Automatic (once per hour)", effect:"Inflicts Pain at Moderate Intensity for 1 minute.", source: RULE_SOURCES.traps }),
    trap("fire-rune", "Fire Rune", { level:3, category:"magical", detectionSkill:"Sight", detectionDT:5, disarmSkill:"Spellcasting", disarmDT:6, trigger:"Touch", attackDice:10, defense:"avoid", damage:"10", damageType:"F", reset:"Automatic (once per day)", effect:"Three attack successes can set the target on fire.", source: RULE_SOURCES.traps }),
    trap("frost-rune", "Frost Rune", { level:3, category:"magical", detectionSkill:"Sight", detectionDT:5, disarmSkill:"Spellcasting", disarmDT:6, trigger:"Touch", attackDice:10, defense:"resilience", damage:"8", damageType:"C", reset:"Automatic (once per day)", effect:"Inflicts Fatigue at Moderate Intensity for 1 minute.", source: RULE_SOURCES.traps }),
    trap("lightning-rune", "Lightning Rune", { level:3, category:"magical", detectionSkill:"Sight", detectionDT:5, disarmSkill:"Spellcasting", disarmDT:6, trigger:"Touch", attackDice:10, defense:"avoid", damage:"10", damageType:"E", reset:"Automatic (once per day)", effect:"Spend 2 successes to bounce to another target within 2 hexes, up to two additional targets.", source: RULE_SOURCES.traps }),
    trap("phantasmal-terror", "Phantasmal Terror", { level:4, category:"magical", detectionSkill:"Sight", detectionDT:6, disarmSkill:"Spellcasting", disarmDT:8, trigger:"Proximity (3 hexes)", attackDice:9, defense:"grit", damage:"4", damageType:"Psi", damageTrack:"sanity", reset:"Automatic", effect:"Deals sanity damage and inflicts Fear at Moderate Intensity for 1 minute.", source: RULE_SOURCES.traps }),
    trap("binding", "Binding Trap", { level:4, category:"magical", detectionSkill:"Sight", detectionDT:6, disarmSkill:"Spellcasting", disarmDT:8, trigger:"Step", attackDice:12, defense:"avoid", damage:"0", damageType:"Ut", reset:"Automatic", effect:"Immobilizes the target for 10 minutes. Escape requires DT 8 Athletics, reduced by 1 each minute, or dispelling the circle.", source: RULE_SOURCES.traps }),
    trap("teleportation", "Teleportation Trap", { level:5, category:"magical", detectionSkill:"Sight", detectionDT:8, disarmSkill:"Spellcasting", disarmDT:8, trigger:"Step", attackDice:14, defense:"avoid", damage:"0", damageType:"Ut", reset:"Automatic", effect:"Teleports the target to a predetermined location within 150 hexes.", source: RULE_SOURCES.traps }),
    trap("soul-snare", "Soul Snare", { level:8, category:"magical", detectionSkill:"Sight", detectionDT:8, disarmSkill:"Spellcasting", disarmDT:10, trigger:"Proximity (2 hexes)", attackDice:18, defense:"grit", damage:"2d12", damageType:"Psi", damageTrack:"sanity", reset:"Automatic (once per week)", effect:"Deals sanity damage and causes Severe Confusion for 1 minute. At 0 sanity, the soul is trapped in a gem within 100 hexes.", source: RULE_SOURCES.traps }),
    trap("disintegration", "Disintegration Field", { level:9, category:"magical", detectionSkill:"Sight", detectionDT:10, disarmSkill:"Spellcasting", disarmDT:12, trigger:"Step", attackDice:20, defense:"avoid", damage:"2d12", damageType:"Ut", bypassArmor:true, reset:"Automatic", effect:"Attacks all targets within 4 hexes. Nonmagical equipment also takes the damage to Integrity; destroyed creatures and objects disintegrate.", source: RULE_SOURCES.traps }),
    trap("petrification", "Petrification Rune", { level:9, category:"magical", detectionSkill:"Sight", detectionDT:8, disarmSkill:"Spellcasting", disarmDT:8, trigger:"Proximity (2 hexes)", attackDice:18, defense:"resilience", damage:"0", damageType:"Ut", reset:"Automatic", effect:"Petrifies the target for 24 hours, functioning as Severe Paralysis.", source: RULE_SOURCES.traps }),
    trap("damnation", "Hand of Damnation", { level:10, category:"magical", detectionSkill:"Sight", detectionDT:5, disarmSkill:"Spellcasting", disarmDT:12, trigger:"Proximity (2 hexes)", attackDice:20, defense:"resilience", damage:"60", damageType:"Sm", reset:"Automatic (once per day)", effect:"Deals 30 smiting and 30 corruption damage. If no HP damage is dealt, it deals 1d6 Expel damage.", source: RULE_SOURCES.traps }),
    trap("acid-pit", "Pit of Acid", { level:5, category:"environmental", detectionSkill:"Sight", detectionDT:4, disarmSkill:"N/A", disarmDT:0, trigger:"Step", attackDice:12, defense:"avoid", damage:"6", damageType:"A", reset:"Manual (replace cover)", effect:"The target falls into acid. Escape requires DT 4 Athletics or 1d6 minutes; jumping across requires DT 4 Acrobatics.", source: RULE_SOURCES.traps }),
    trap("gas-chamber", "Gas Chamber", { level:5, category:"environmental", detectionSkill:"Sight", detectionDT:6, disarmSkill:"N/A", disarmDT:0, trigger:"Timer or manual", attackDice:14, defense:"resilience", damage:"6", damageType:"Ut", bypassArmor:true, reset:"Manual (refill gas)", effect:"Attacks creatures beginning their turn in the gas and causes Moderate Illness. Disperses after 1 minute or with ventilation.", source: RULE_SOURCES.traps }),
    trap("collapsing-tunnel", "Collapsing Tunnel", { level:6, category:"environmental", detectionSkill:"Sight or Hearing", detectionDT:4, disarmSkill:"N/A", disarmDT:0, trigger:"Loud noise", attackDice:15, defense:"avoid", damage:"50", damageType:"B", reset:"None", effect:"Functions as an avalanche or rockslide with increased damage.", source: RULE_SOURCES.traps })
]);

export const HAZARD_LIBRARY = Object.freeze([
    hazard("acid", "Acid", { category:"hazard", attackDice:7, defense:"resilience", damage:"6", damageType:"A", interval:"Each round of contact", bypassArmor:false, effect:"Full submersion deals 12 acid damage per round. Acidic fumes can inflict Moderate Illness.", source:RULE_SOURCES.environments }),
    hazard("corrosive-atmosphere", "Corrosive Atmosphere", { category:"atmosphere", attackDice:6, escalationDice:1, defense:"resilience", damage:"3", damageType:"A", interval:"Start of each unprotected turn", bypassArmor:true, effect:"Attack dice increase by 1 each subsequent round in the atmosphere.", source:RULE_SOURCES.environments }),
    hazard("toxic-atmosphere", "Toxic Atmosphere", { category:"atmosphere", attackDice:8, escalationDice:1, defense:"resilience", damage:"4", damageType:"Ut", interval:"Start of each unprotected turn", bypassArmor:true, effect:"Inflicts Moderate Illness. Holding breath grants +2 Resilience; attack dice increase each round.", source:RULE_SOURCES.environments }),
    hazard("high-gravity", "High Gravity", { category:"atmosphere", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"Continuous", effect:"Half movement, Physical skill DTs +5, carried weight doubles, and ranged weapon range is halved.", source:RULE_SOURCES.environments }),
    hazard("low-gravity", "Low Gravity", { category:"atmosphere", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"Continuous", effect:"Jump distance, movement, lifting capacity, and ranged weapon range are tripled.", source:RULE_SOURCES.environments }),
    hazard("drowning", "Drowning", { category:"hazard", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"After 2 rounds per Physique", effect:"After breath expires, make DT 5 Athletics each round, increasing DT by 1. Failure begins the drowning sequence.", source:RULE_SOURCES.environments }),
    hazard("falling", "Falling", { category:"hazard", attackDice:0, defense:"none", damage:"1", damageType:"B", interval:"Per yard fallen", bypassArmor:true, effect:"Falling damage bypasses armor; use the distance fallen as damage.", source:RULE_SOURCES.environments }),
    hazard("lava", "Lava / Magma", { category:"hazard", attackDice:0, defense:"none", damage:"10", damageType:"F", interval:"Each round exposed", effect:"Full submersion deals 20 fire damage. Lingering damage lasts 1d12 rounds at half damage.", source:RULE_SOURCES.environments }),
    hazard("low-branches", "Low-Hanging Branches", { category:"terrain", attackDice:6, escalationDice:1, defense:"avoid", damage:"2", damageType:"S", interval:"Each hex moved through", effect:"Mounted targets take 6 damage. Armor or Natural Deflection negates the damage.", source:RULE_SOURCES.environments }),
    hazard("smoke", "Smoke", { category:"hazard", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"Continuous", effect:"Obscures sight and can lead to suffocation; use the suffocation workflow when clean air is unavailable.", source:RULE_SOURCES.environments }),
    hazard("suffocation", "Suffocation", { category:"hazard", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"After 2 rounds per Physique", effect:"After breath expires, make DT 6 Physique each round, increasing DT by 1. Failure drops the creature to 0 HP, then -1 HP, then death.", source:RULE_SOURCES.environments }),
    hazard("cold", "Cold Weather", { category:"weather", attackDice:6, escalationDice:1, defense:"resilience", damage:"1", damageType:"C", interval:"Each minute unprotected", bypassArmor:true, effect:"Deals nonlethal cold damage; attack dice increase with continued exposure.", source:RULE_SOURCES.environments }),
    hazard("rain", "Rain", { category:"weather", attackDice:0, defense:"none", damage:"0", damageType:"Ut", interval:"Continuous", effect:"Sight and Hearing DTs increase by 1; ranged attacks suffer -1D. Exposed fires have a chance to extinguish.", source:RULE_SOURCES.environments }),
    hazard("thunderstorm", "Thunderstorm", { category:"weather", attackDice:10, defense:"avoid", damage:"12", damageType:"E", interval:"Every 10 minutes to a random unsheltered creature", effect:"A miss still deals half damage. A hit inflicts Low Paralysis for 1 minute.", source:RULE_SOURCES.environments }),
    hazard("hurricane", "Hurricane", { category:"weather", attackDice:0, defense:"none", damage:"6", damageType:"B", interval:"When battered or thrown", effect:"Creatures are blown in random directions, knocked prone, and may take collision damage.", source:RULE_SOURCES.environments })
]);

export const DOWNTIME_LIBRARY = Object.freeze([
    downtime("mundane-crafting", "Mundane Item Crafting", { activityType:"crafting", skill:"GM choice", dt:1, duration:"30 minutes to 2 days", cost:"Materials", progress:0, target:1, status:"planned", benefit:"Craft a mundane item; DT and duration scale from Simple Item (DT 1) to Masterpiece (DT 10).", source:RULE_SOURCES.downtime }),
    downtime("magic-item-crafting", "Magic Item Crafting", { activityType:"crafting", skill:"Spellcasting", dt:4, duration:"1 day per 1,000 sp.", cost:"Item cost", progress:0, target:1, status:"planned", benefit:"Create a magic item. DT scales with total item price.", source:RULE_SOURCES.downtime }),
    downtime("skill-training", "Skill Training", { activityType:"training", skill:"Relevant skill", dt:0, duration:"Varies by rank", cost:"Tutor or training costs", progress:0, target:1, status:"planned", benefit:"Learn or improve a skill during downtime, subject to rank limits and available instruction.", source:RULE_SOURCES.downtime }),
    downtime("talent-training", "Talent Training", { activityType:"training", skill:"N/A", dt:0, duration:"2 weeks", cost:"2,000 sp. plus 2,000 per prerequisite", progress:0, target:1, status:"planned", benefit:"Learn a talent from a tutor who already has it. Swapping a talent takes 1 month.", source:RULE_SOURCES.downtime }),
    downtime("social", "Social & Political Activity", { activityType:"social", skill:"Social skill", dt:0, duration:"1 month", cost:"Varies", progress:0, target:1, status:"planned", benefit:"Gather gossip, cultivate influence, boast, or improve social standing.", source:RULE_SOURCES.downtime }),
    downtime("exploration", "Wilderness Exploration", { activityType:"exploration", skill:"Survival or relevant Lore", dt:0, duration:"96 hours per wilderness hex", cost:"Supplies", progress:0, target:96, status:"planned", benefit:"Clear and map a wilderness hex, making future travel and settlement easier.", source:RULE_SOURCES.downtime }),
    downtime("commerce", "Commerce", { activityType:"commerce", skill:"Business skill", dt:0, duration:"1 month", cost:"Business expenses", progress:0, target:1, status:"planned", benefit:"Operate a business and earn serpents based on the relevant skill rank.", source:RULE_SOURCES.downtime }),
    downtime("leisure", "Leisure - Refreshed", { activityType:"leisure", skill:"N/A", dt:0, duration:"1 month", cost:"Living expenses", progress:0, target:1, status:"planned", benefit:"For 1 week per month, gain +1 to all Defenses, +2 natural HP recovery, and double sanity recovery.", source:RULE_SOURCES.downtime }),
    downtime("magical-pursuit", "Magical Pursuit", { activityType:"magic", skill:"Spellcasting", dt:0, duration:"1 month", cost:"Research materials", progress:0, target:3, status:"planned", benefit:"Make three Spellcasting checks to learn a spell; DT increases by 1 after each check. Progress can carry forward.", source:RULE_SOURCES.downtime })
]);

export const HERITAGE_LIBRARY = Object.freeze([
    heritage("banadars-last-gift", "Banadar's Last Gift", {
        heritageType:"special", motherSpecies:"Kendari", fatherSpecies:"Any non-Kendari", characteristicChanges:0,
        mutationRolls:"Roll twice on Corrupted Mutations; choose one permanent result",
        effect:"A Kendari crossbreed carries Banadar's final corruption. This does not apply to two Kendari parents.",
        source:"Heirs to Rangar, p. 37"
    }),
    heritage("moon-maid", "Moon Maid", {
        heritageType:"mule", motherSpecies:"Satori or Nue", fatherSpecies:"Ny'var", characteristicChanges:0,
        mutationRolls:"1d4 Minor; 1d2-1 Major",
        effect:"Use the Satori or Nue characteristics regardless of parent order, then apply the matching Moon Maid profile and its Nyarlathotep-touched abilities.",
        source:"Heirs to Rangar, p. 38"
    }),
    heritage("velshros-mark", "Velshro's Mark", {
        heritageType:"special", motherSpecies:"Velshro", fatherSpecies:"Any", characteristicChanges:0,
        mutationRolls:"Varies: Slime Man (Blooded/Hybrid), Chitinman (Degenerate), Homunculus (True Born)",
        effect:"Choose the profile set by the non-Velshro parent: Slime Man for humanoid/reptile/mammal/goblin/other Xeno, Chitinman for insect Xeno, or Homunculus for an extradimensional parent.",
        source:"Heirs to Rangar, p. 39"
    }),
    heritage("celeste", "Celeste", {
        heritageType:"special", motherSpecies:"Humanoid (Human)", fatherSpecies:"Extradimensional (Celestial)", characteristicChanges:1,
        mutationRolls:"None unless another rule requires them",
        effect:"Use the non-celestial parent's characteristics, gain the Celestial creature tag, Darksight, broken Truespeak, and increased lifespan; replace one ability with a listed Celeste gift or a celestial-parent ability.",
        source:"Heirs to Rangar, p. 40"
    }),
    heritage("progenitor", "Progenitor", {
        heritageType:"special", motherSpecies:"Sankat or Lumestri", fatherSpecies:"Lumestri or Sankat", characteristicChanges:0,
        mutationRolls:"None",
        effect:"Use the Eyeless profile for a Sankat mother and Lumestri father, or the Hoplite profile for a Lumestri mother and Sankat father.",
        source:"Heirs to Rangar, p. 41"
    }),
    heritage("asmod", "Asmod", {
        heritageType:"special", motherSpecies:"Humanoid (Human)", fatherSpecies:"Extradimensional (Demonic)", characteristicChanges:1,
        mutationRolls:"None unless another rule requires them",
        effect:"Use the non-demonic parent's characteristics, gain the Infernal creature tag, Darksight, Hadean, and increased lifespan; replace one ability with a Mark or a demonic-parent ability.",
        source:"Heirs to Rangar, p. 42"
    }),
    heritage("goliath", "Goliath", {
        heritageType:"degenerate", motherSpecies:"Humanoid (Human or Demihuman)", fatherSpecies:"Ogre", characteristicChanges:0,
        mutationRolls:"1d6 Minor; 1d4 Major; 1d4-2 Severe",
        effect:"Use the fixed Goliath profile: a powerful but genetically unstable Ogre crossbreed with Fleshcrafted, Tortured, and Goliath Grip abilities.",
        source:"Heirs to Rangar, p. 43"
    }),
    heritage("dhampir", "Dhampir", {
        heritageType:"special", motherSpecies:"Vampire or mortal", fatherSpecies:"Mortal or Vampire", characteristicChanges:0,
        mutationRolls:"None unless another rule requires them",
        effect:"Adopt the mortal parent's characteristics and choose Crimson for a Vampire father or Ebony for a Vampire mother, applying the matching Dhampir profile.",
        source:"Heirs to Rangar, p. 44"
    }),
    heritage("atrocity", "Atrocity", {
        heritageType:"special", motherSpecies:"Extradimensional", fatherSpecies:"Extradimensional", characteristicChanges:0,
        mutationRolls:"GM adjudication",
        effect:"The impossible offspring of opposed extradimensional beings. This is presented as a catastrophic story element rather than a standard player option.",
        source:"Heirs to Rangar, p. 45"
    })
]);

async function ensureFolder(name, parent = null) {
    const existing = game.folders?.find(folder => folder.type === "Item" && folder.name === name && (folder.folder?.id ?? null) === (parent?.id ?? null));
    if (existing) return existing;
    return Folder.create({ name, type: "Item", folder: parent?.id ?? null });
}

export async function installRulesContent() {
    if (!game.user?.isGM) throw new Error("Only a GM can install rules content.");

    const root = await ensureFolder("The Fade Rules");
    const folders = {
        trap: await ensureFolder("Traps", root),
        hazard: await ensureFolder("Environments & Hazards", root),
        downtime: await ensureFolder("Downtime Activities", root),
        heritage: await ensureFolder("Half-Breeds & Oddities", root)
    };
    const existingIds = new Set(game.items?.map(item => item.getFlag("thefade", "rulesContentId")).filter(Boolean) ?? []);
    const library = [...TRAP_LIBRARY, ...HAZARD_LIBRARY, ...DOWNTIME_LIBRARY, ...HERITAGE_LIBRARY];
    const documents = library
        .filter(entry => !existingIds.has(entry.id))
        .map(entry => ({
            name: entry.name,
            type: entry.type,
            img: entry.img,
            folder: folders[entry.type]?.id ?? root.id,
            system: entry.system,
            flags: { thefade: { rulesContentId: entry.id } }
        }));

    if (documents.length) await Item.createDocuments(documents);
    return { created: documents.length, existing: library.length - documents.length, total: library.length };
}
