// Hit-location rolls per the Core Rulebook "Attack Location" chart.
//
// Two simplified facing classes (per system design decision — left/right
// sides of the target are treated as symmetric):
//   - front / back    → Front/Back column
//   - flank / backflank → Flank column (limb side rolled on a d2)
//
// d12 distribution:
//   Front/Back: 1 Head, 2-8 Body, 9 LArm, 10 RArm, 11 LLeg, 12 RLeg
//   Flank:      1 Head, 2-8 Body, 9-10 Arm (L/R d2), 11-12 Leg (L/R d2)

const LOCATION_LABEL = {
    head: "Head",
    body: "Body",
    leftarm: "Left Arm",
    rightarm: "Right Arm",
    leftleg: "Left Leg",
    rightleg: "Right Leg"
};

export function locationLabel(key) {
    return LOCATION_LABEL[key] || key;
}

/**
 * Roll a random hit location given the attacker's facing category on the target.
 * @param {"front"|"back"|"flank"|"backflank"} facing
 * @returns {Promise<{location: string, roll: number, sideRoll?: number, column: string}>}
 */
export async function rollHitLocation(facing) {
    const roll = await new Roll("1d12").evaluate();
    const d12 = roll.total;
    const isFlank = facing === "flank" || facing === "backflank";
    const column = isFlank ? "Flank" : "Front/Back";

    if (d12 === 1) return { location: "head", roll: d12, column };
    if (d12 >= 2 && d12 <= 8) return { location: "body", roll: d12, column };

    if (!isFlank) {
        if (d12 === 9) return { location: "leftarm", roll: d12, column };
        if (d12 === 10) return { location: "rightarm", roll: d12, column };
        if (d12 === 11) return { location: "leftleg", roll: d12, column };
        return { location: "rightleg", roll: d12, column }; // 12
    }

    const sideRoll = await new Roll("1d2").evaluate();
    const leftSide = sideRoll.total === 1;
    if (d12 === 9 || d12 === 10) {
        return { location: leftSide ? "leftarm" : "rightarm", roll: d12, sideRoll: sideRoll.total, column };
    }
    return { location: leftSide ? "leftleg" : "rightleg", roll: d12, sideRoll: sideRoll.total, column };
}
