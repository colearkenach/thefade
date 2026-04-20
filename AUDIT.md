# The Fade (Abyss) — Foundry System Gap Analysis

Source: `The Fade - Abyss.pdf` (554 pages) vs. current worktree code (~8,700 LOC).
Four focus areas audited: Combat, Magic, Skills & Rolls, Character Creation & Progression.

---

## P0 — Critical (breaks or hollows out core gameplay)

| # | Gap | Area | Evidence |
|---|-----|------|----------|
| 1 | **Conditions are inert** — 12 conditions with severity tiers stored as data only. Pain's -6 Avoid, Stunned's action loss, Bleed's per-round damage, Fear's flee, Confusion's self-attacks — none applied. | Combat | [actor.js:170-186](src/actor.js:170) stores `{active, intensity}`; no roll/turn pipeline reads them |
| 2 | **Stances completely missing** — Dodge Stance, Parrying Stance, Brace, Tough it Out, Resolute Will (each costs both Minor Actions, modifies defenses/damage/saves until next turn). Not implemented. | Combat | No `activeStance` field referenced in roll handlers; no UI toggle |
| 3 | **Dark Magic / Sin auto-enforcement missing** — Casting a dark spell does not auto-increment Sin by the spell's DT. No daily reset. No auto-trigger of the Sin-over-Threshold attack vs Grit. Addiction stages never auto-advance; their penalties (-1/-2 Grit, Meltdowns, Sanity Breaks, Terminal Soul-halving) not applied. | Magic | Threshold calc at [actor.js:306-332](src/actor.js:306) is passive; [character-sheet.js:2503-2560](src/character-sheet.js:2503) addiction roll exists but no auto-hook |

## P1 — High (frequent mechanics missing automation)

| # | Gap | Area | Evidence |
|---|-----|------|----------|
| 4 | **Passive Dodge / Parry not integrated into attack resolution** — Calculated and displayed, but attack rolls compare only vs raw DT. | Combat | [actor.js:444-482](src/actor.js:444) computes them; [character-sheet.js:2237-2410](src/character-sheet.js:2237) attack handler ignores them |
| 5 | **Critical hits detected but do nothing** — `criticalThreshold` parsed, `canCritical` set, but `criticalHits/criticalDamage` stubbed to 0; no bonus damage. | Combat | [character-sheet.js:2364-2389](src/character-sheet.js:2364) |
| 6 | **Damage-type effects unimplemented** — Fire/Cold/Acid/etc. listed in the rules as spendable bonus effects. No code spends successes to trigger them. B/S/P are data fields only. | Combat | No switch on `weapon.damageType` in attack flow |
| 7 | **Damage not auto-applied to AP/HP** — AP reduction is fully manual UI. Natural Deflection tracked per body part but user must click to subtract. | Combat | [character-sheet.js:1034-1228](src/character-sheet.js:1034) |
| 8 | **HP state thresholds not automated** — At 0 HP, Unconscious not auto-applied. Dying at negative HP not tracked. Bleed not auto-applied on damage. | Combat | [actor.js:289-299](src/actor.js:289) computes label only |
| 9 | **Mishap tables not rolled** — Severity calculated and displayed as text ("Roll on the Severe Mishap table!"), but the 2d12 tables (Minor/Moderate/Severe/Critical, 24 entries each) are not in code. Dark-magic "one step worse" and Critical→instant-death not applied. | Magic | [character-sheet.js:2685-2703](src/character-sheet.js:2685) |
| 10 | **Bonus successes unspent** — Spells allow extra successes → more damage / longer duration / bonus effects. Calculated at [character-sheet.js:2676](src/character-sheet.js:2676) but never consumed into output. | Magic | Same file |
| 11 | **Opposed rolls unsupported** — Hide vs Sight, Deception vs Insight, Trickery vs Grit, etc. GM must manually roll both sides. High-frequency mechanic. | Skills | No code for two-actor roll workflow |
| 12 | **Point-buy & random attribute generation missing** — No 20-point validator, no max-10 cap, no 1d6×5 exploding roll button. Attributes are free-form inputs. | Creation | [templates/actor/parts/attributes.html:7-82](templates/actor/parts/attributes.html:7) |
| 13 | **Species bonuses not auto-applied** — Selecting a species item does not push `abilityBonuses` into `attributes.X.speciesBonus`. Manual entry required. | Creation | `speciesBonus` field exists ([actor.js:50-72](src/actor.js:50)) but no writer code |
| 14 | **Path abilities & granted skills not applied** — Adding a path does not grant its listed abilities or skill ranks to the character. | Creation | `applyPathSkillModifications` in [helpers.js:414-498](src/helpers.js:414) handles *some* skill grants, but abilities object ([template.json:246](template.json:246)) is inert |
| 15 | **Talent prerequisites never validated** — `prerequisites` is a free-text string. No eligibility dialog or enforcement at level-up. | Creation | [template.json:264](template.json:264) |
| 16 | **Universal Abilities not modeled** — PDF pages 40-50 (~30 abilities: Regeneration, Incorporeal, Darkvision, Flight, Hivemind, etc.). No ability system exists. | Creation | No schema, no data |
| 17 | **Sanity mechanics inert** — Max computed (10 + Mind); no Meltdown at half, no Sanity Break at 0, no disorder tracking, no auto-recovery. Dangerous-encounter triggers don't deal Sanity damage. | Creation/Combat | [actor.js:276-281](src/actor.js:276) |

## P2 — Medium (polish + less-frequent mechanics)

| # | Gap | Area |
|---|-----|------|
| 18 | Weapon qualities beyond Brutish/Agile — Puncture, Deadly, Disarm, Parrying, Pounding, Pushing, Trip, Breach, Balanced, Sunder are display-only. | Combat |
| 19 | Gang-up penalty + "shift-provokes-AOO" not implemented. | Combat |
| 20 | School → Path access restrictions not enforced; any character can cast any spell. | Magic |
| 21 | Staff/wand charges not decremented on use; no daily reset for staves; no +1D bonus when using a known spell through a staff/wand; no wand-strength cap enforcement. | Magic |
| 22 | Ritual casting mechanics (components, extended time) not implemented. | Magic |
| 23 | Dark-school name counterparts (paired name per school) not enumerated. | Magic |
| 24 | DT input dialog lacks difficulty labels (Trivial/Easy/Moderate/Challenging/Hard/Very Hard/Extreme/Legendary). | Skills |
| 25 | Condition → automatic bonus/penalty dice not wired. Users manually edit `miscBonus`. | Skills |
| 26 | Aid Another (+1D from successful helper at Learned+) unsupported. | Skills |
| 27 | Category-wide skill bonuses (e.g. "+1D to all Knowledge") can't be applied — structure ready, no application. | Skills |
| 28 | Tier prerequisites for paths not enforced — player can attach a Tier 3 path at level 1. | Creation |
| 29 | Trait creation-limit (2 at creation) not enforced; no selection UI; no compendium in packs. | Creation |
| 30 | Starting wealth (Level³ × 200 Serpents) not auto-set on creation. | Creation |
| 31 | Species abilities stored as metadata but never apply effects (Darkvision, resistances, natural weapons). | Creation |

## P3 — Low (nice to have)

| # | Gap | Area |
|---|-----|------|
| 32 | Initiative integration with Combat Tracker: verified correct; no known issue. | Combat |
| 33 | Natural Deflection auto-recovery after 8hr rest. | Combat |
| 34 | Acrobatics rank modifier to Passive Dodge not automatically read from skill rank. | Skills |
| 35 | Attribute rolls have no optional DT dialog (intentional?). | Skills |
| 36 | Aging penalties + Infirm (attribute at 0) not modeled. | Creation |
| 37 | Counter-spell / Dispel / Concentration not modeled (Sorcerer Path ability). | Magic |
| 38 | Catalyst consumption for magic-item creation not enforced. | Magic |
| 39 | HP UI breakdown (Species + Path + Physique = Max) not visible. | Creation |
| 40 | Facing shift-provokes-AOO automation. | Combat |

---

## What's already solid (don't touch)

- Core d12 dice pool, rank→bonus dice, untrained halving, success counting (8–11 = 1, 12 = 2): matches rules exactly.
- Skill roll handler incl. DT comparison and chat card: complete.
- Initiative formula (1d12 + avg(Fin, Mind)): correct.
- Defenses base formulas (Resilience/Avoid/Grit = attr/2, min 1): correct.
- Facing penalty math on Avoid: correct; only thing missing is the AOO hook.
- HP & Sanity max calculations: correct per rules.
- Carrying capacity: correct per rules.
- Path skill grant on path-add (via `applyPathSkillModifications`): works for specific/custom/category entries.
- Lore/Perform/Craft custom sub-skill creation: complete.
- Overland movement (movement × 6): correct.

---

## Suggested sequencing

1. **Conditions engine** (P0 #1) — one central "apply effects" pipeline that all rolls pass through. Unblocks #4, #25, #40 and most condition-carrying talents.
2. **Stances** (P0 #2) — smaller, self-contained; follows the conditions engine naturally.
3. **Attack resolution overhaul** (P1 #4, #5, #7, #8) — bundle passive defenses, crit damage, auto-damage-apply, HP-state automation into one coherent attack→damage→condition flow.
4. **Sin / Dark Magic enforcement** (P0 #3) — hook into existing cast handler.
5. **Mishap tables** (P1 #9) — data work, low risk.
6. **Character creation wizard** (P1 #12, #13, #14, #15) — point-buy, species/path auto-apply, talent eligibility. One connected feature.
7. **Universal Abilities + Species Abilities** (P1 #16, #31) — needs a new ability data model; do after conditions engine so they can share effect primitives.
8. **Opposed rolls + Aid Another** (P1 #11, P2 #26) — shared dialog pattern.
9. Remaining P2/P3 polish.

Pick any item above and I'll implement it.
