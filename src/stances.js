// Defensive-stance engine for The Fade - Abyss.
// Each stance costs both Minor Actions; effects last until the start of the
// stancee's next turn. Only one stance active at a time.
//
// Rules source: Core Rulebook "Entering Defensive Stances" (PDF p.941-968).

export const STANCES = {
    none: {
        key: "none",
        label: "None",
        description: "No stance; default passive defenses apply."
    },
    dodgeStance: {
        key: "dodgeStance",
        label: "Dodge Stance",
        description: "Add half Finesse OR your full Acrobatics dice to Avoid. Costs both Minor Actions."
    },
    parryingStance: {
        key: "parryingStance",
        label: "Parrying Stance",
        description: "Passive Parry applies to Back Flanks. On a failed attack against you, Riposte as a Reaction."
    },
    brace: {
        key: "brace",
        label: "Brace for Impact",
        description: "Excess damage past AP/Deflection doesn't carry to HP; HP damage is halved (min 1)."
    },
    toughItOut: {
        key: "toughItOut",
        label: "Tough it Out",
        description: "Add full Physique to Resilience instead of half."
    },
    resoluteWill: {
        key: "resoluteWill",
        label: "Resolute Will",
        description: "Add full Mind to Grit instead of half."
    }
};

/**
 * Return the stance record, or the "none" record if unset/unknown.
 */
export function getStance(stance) {
    return STANCES[stance] || STANCES.none;
}

/**
 * Lift base defenses for Tough-It-Out / Resolute-Will: the rule replaces
 * "half attribute" with "full attribute" for one defense. Call before
 * facing/condition modifiers so the higher value flows through consistently.
 *
 * Mutates data.defenses.resilience and data.defenses.grit in place; also
 * re-derives data.totalResilience / data.totalGrit so downstream code
 * sees the new base.
 */
export function applyBaseDefenseStances(data) {
    const stance = data.activeStance || "none";
    if (!data.attributes || !data.defenses) return;

    if (stance === "toughItOut") {
        const full = Math.max(1, data.attributes.physique?.value || 1);
        data.defenses.resilience = full;
        data.totalResilience = Math.max(1, full + Number(data.defenses.resilienceBonus || 0));
    }

    if (stance === "resoluteWill") {
        const full = Math.max(1, data.attributes.mind?.value || 1);
        data.defenses.grit = full;
        data.totalGrit = Math.max(1, full + Number(data.defenses.gritBonus || 0));
    }
}

/**
 * Post-facing stance effects:
 *   - Dodge Stance: bump totalAvoid by max(half Finesse, full Acrobatics dice)
 *   - Parrying Stance: restore Passive Parry when facing = backflank
 *
 * `acrobaticsDodgeDice` is the already-computed dice value from actor prep
 * (max Acrobatics rank → 0/1/1/2/3 dice).
 */
export function applyPassiveStances(data, acrobaticsDodgeDice = 0) {
    const stance = data.activeStance || "none";
    if (!data.defenses) return;

    if (stance === "dodgeStance") {
        const halfFinesse = Math.floor((data.attributes?.finesse?.value || 0) / 2);
        const bonus = Math.max(halfFinesse, acrobaticsDodgeDice);
        if (bonus > 0) {
            data.totalAvoid = Math.max(0, (data.totalAvoid || 0) + bonus);
            data.defenses.dodgeStanceBonus = bonus;
        }
    } else {
        data.defenses.dodgeStanceBonus = 0;
    }

    if (stance === "parryingStance") {
        const facing = data.defenses.facing || "front";
        if (facing === "backflank") {
            data.defenses.passiveParry = data.defenses.basePassiveParry || 0;
        }
    }
}

/**
 * Damage-mitigation flags consumed by attack resolution (Brace for Impact).
 */
export function getDamageMitigation(activeStance) {
    if (activeStance === "brace") {
        return { noExcessToHp: true, halveHp: true };
    }
    return { noExcessToHp: false, halveHp: false };
}

/**
 * Per-roll effects from the active stance (placeholder for future: Parrying
 * Stance may later contribute a Riposte reaction trigger). Returns empty
 * for now — stance effects are currently all passive.
 */
export function computeStanceRollModifiers() {
    return { bonusDice: 0, penaltyDice: 0, notes: [] };
}

/**
 * Short descriptor for the sheet summary row, e.g. "Dodge Stance (+3 Avoid)".
 */
export function summarizeStance(data) {
    const stance = getStance(data?.activeStance);
    if (stance.key === "none") return null;
    if (stance.key === "dodgeStance") {
        const bonus = data?.defenses?.dodgeStanceBonus || 0;
        return bonus ? `${stance.label} (+${bonus} Avoid)` : stance.label;
    }
    return stance.label;
}
