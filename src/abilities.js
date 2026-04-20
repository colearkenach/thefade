// Universal Abilities registry for The Fade - Abyss.
//
// The Core Rulebook (pp. 40-50) lists ~30 universal abilities (Darkvision,
// Flight, Regeneration, Tough, Incorporeal, etc.) that species and paths
// can grant. Each ability authored on a species or path item is stored as
// { name, description } — this module matches those names against the
// registry below and applies passive effects during actor data prep.
//
// An ability missing from the registry renders as text only; the GM
// applies any mechanical effect manually. We only automate effects with
// an unambiguous numeric interpretation.
//
// Rules source: Core Rulebook universal-ability chapter. See AUDIT.md
// P1 #16 and P2 #31.

/**
 * Registry keyed by ability name (case-sensitive). Each entry has:
 *  - description: short mechanical summary shown on the sheet.
 *  - apply(data, ability): optional passive mutation on system data.
 *    `ability` is the authored object so we can read a numeric suffix
 *    in the name (e.g. "Regeneration 2" → regen = 2).
 */
export const UNIVERSAL_ABILITIES = {
    "Darkvision": {
        description: "See in darkness as if it were dim light.",
        apply: (data) => { data.vision = data.vision || {}; data.vision.darkvision = true; }
    },
    "Low-Light Vision": {
        description: "Dim light is treated as bright.",
        apply: (data) => { data.vision = data.vision || {}; data.vision.lowLight = true; }
    },
    "Blindsight": {
        description: "Perceive surroundings without sight at a short range.",
        apply: (data) => { data.vision = data.vision || {}; data.vision.blindsight = true; }
    },
    "Flight": {
        description: "Gains a fly speed equal to land speed if not already present.",
        apply: (data) => {
            if (!data.movement) data.movement = {};
            if (!data.movement.fly || data.movement.fly <= 0) {
                data.movement.fly = data.movement.land || 4;
            }
        }
    },
    "Climb": {
        description: "Gains a climb speed equal to land speed.",
        apply: (data) => {
            if (!data.movement) data.movement = {};
            if (!data.movement.climb || data.movement.climb <= 0) {
                data.movement.climb = data.movement.land || 4;
            }
        }
    },
    "Swim": {
        description: "Gains a swim speed equal to land speed.",
        apply: (data) => {
            if (!data.movement) data.movement = {};
            if (!data.movement.swim || data.movement.swim <= 0) {
                data.movement.swim = data.movement.land || 4;
            }
        }
    },
    "Burrow": {
        description: "Gains a burrow speed equal to half land speed.",
        apply: (data) => {
            if (!data.movement) data.movement = {};
            if (!data.movement.burrow || data.movement.burrow <= 0) {
                data.movement.burrow = Math.max(1, Math.floor((data.movement.land || 4) / 2));
            }
        }
    },
    "Amphibious": {
        description: "Breathes water as well as air.",
        apply: (data) => { data.amphibious = true; }
    },
    "Tough": {
        description: "+2 to maximum HP.",
        apply: (data) => {
            if (!data.hp) data.hp = { value: 1, max: 1 };
            data.hp.max = (data.hp.max || 1) + 2;
            data.maxHP = data.hp.max;
        }
    },
    "Regeneration": {
        description: "Recover HP each round (tracked for turn handling).",
        apply: (data, ability) => { data.regeneration = (data.regeneration || 0) + numericSuffix(ability, 1); }
    },
    "Incorporeal": {
        description: "Only magical or force damage affects this creature.",
        apply: (data) => { data.incorporeal = true; }
    },
    "Hivemind": {
        description: "Shares thoughts with allies of the same kind; no mechanical effect applied.",
        apply: null
    },
    "Keen Senses": {
        description: "+1D to Awareness rolls (exposed as perceptionBonus for roll code).",
        apply: (data) => { data.perceptionBonus = (data.perceptionBonus || 0) + 1; }
    },
    "Natural Armor": {
        description: "Baseline Natural Deflection on body; value set on the ability (e.g. \"Natural Armor 2\").",
        apply: (data, ability) => {
            const amount = numericSuffix(ability, 1);
            if (!data.naturalDeflection) data.naturalDeflection = {};
            if (!data.naturalDeflection.body) data.naturalDeflection.body = { current: 0, max: 0, stacks: false };
            data.naturalDeflection.body.max = Math.max(data.naturalDeflection.body.max || 0, amount);
            // Do NOT auto-raise current here. Damage drops current toward 0 and
            // must persist — re-raising on every prepareData would silently
            // refill broken ND. Players use the "Reset ND" button on the sheet
            // to refresh a location after repair/recovery.
        }
    },
    "Fire Resistance": {
        description: "Reduces fire damage taken (flagged for damage pipeline).",
        apply: (data, ability) => { setResistance(data, "F", numericSuffix(ability, 5)); }
    },
    "Cold Resistance": {
        description: "Reduces cold damage taken.",
        apply: (data, ability) => { setResistance(data, "C", numericSuffix(ability, 5)); }
    },
    "Acid Resistance": {
        description: "Reduces acid damage taken.",
        apply: (data, ability) => { setResistance(data, "A", numericSuffix(ability, 5)); }
    },
    "Electricity Resistance": {
        description: "Reduces electricity damage taken.",
        apply: (data, ability) => { setResistance(data, "E", numericSuffix(ability, 5)); }
    },
    "Fear Immunity": {
        description: "Immune to the Fear condition.",
        apply: (data) => { (data.immunities = data.immunities || []).push("fear"); }
    },
    "Sleep Immunity": {
        description: "Immune to magical sleep / forced unconsciousness.",
        apply: (data) => { (data.immunities = data.immunities || []).push("sleep"); }
    },
    "Poison Immunity": {
        description: "Immune to poisons and toxins.",
        apply: (data) => { (data.immunities = data.immunities || []).push("poison"); }
    }
};

function numericSuffix(ability, fallback) {
    if (!ability?.name) return fallback;
    const m = ability.name.match(/(\d+)\s*$/);
    return m ? parseInt(m[1]) : fallback;
}

function setResistance(data, type, amount) {
    data.resistances = data.resistances || {};
    data.resistances[type] = Math.max(data.resistances[type] || 0, amount);
}

/**
 * Walk species + path abilities and apply any that match the registry.
 * Stores the applied set on data.abilityEffects for the sheet to render.
 * Also stores a parallel list of *named* abilities so the sheet shows
 * registry-matched vs text-only.
 */
export function applyAbilityEffects(data, actor) {
    const sources = [];

    // Species abilities (authored on species, copied to actor by the
    // species createItem hook — see thefade.js).
    const speciesAbilities = data.species?.speciesAbilities || {};
    for (const ability of Object.values(speciesAbilities)) {
        if (ability?.name) sources.push({ source: "species", ability });
    }

    // Path abilities (authored on each path item).
    if (actor?.items) {
        for (const item of actor.items) {
            if (item.type !== "path") continue;
            const abilities = item.system?.abilities || {};
            for (const ability of Object.values(abilities)) {
                if (ability?.name) sources.push({ source: item.name, ability });
            }
        }
    }

    const applied = [];
    const unmatched = [];
    for (const { source, ability } of sources) {
        // Strip trailing numeric suffix to match the registry key.
        const key = ability.name.replace(/\s+\d+\s*$/, "").trim();
        const entry = UNIVERSAL_ABILITIES[key];
        if (entry?.apply) {
            try {
                entry.apply(data, ability);
                applied.push({ source, name: ability.name, description: entry.description });
            } catch (err) {
                console.error(`Failed to apply ability ${ability.name}:`, err);
            }
        } else {
            unmatched.push({ source, name: ability.name, description: ability.description });
        }
    }
    data.abilityEffects = { applied, unmatched };
}
