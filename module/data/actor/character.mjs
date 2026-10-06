// Character (and legacy NPC) system data: stored schema, legacy migration,
// and the derived-stat pipeline. All derived values are computed here, in
// memory, every time the actor is prepared — sheets never write them back.
import {
    attributeMap, boolean, count, html, integer, number, override, string, toNumber
} from "../fields.mjs";
import {
    BODY_PARTS, COMBAT_DAMAGE_TYPES, COMBAT_IMMUNITY_DAMAGE_TYPES, COMBAT_IMMUNITY_EFFECTS,
    COMBAT_STATUS_IMMUNITIES, UNIVERSAL_ABILITY_CATEGORIES
} from "../../rules/constants.js";
import { aggregateConditionState, summarizeConditionState, CONDITION_EFFECTS, getConditionStatusId } from "../../rules/conditions.js";
import { applyBaseDefenseStances, applyPassiveStances, summarizeStance, getDamageMitigation, STANCES } from "../../rules/stances.js";
import { applyAddictionPenalties, isDarkMagicSpell } from "../../rules/dark-magic.js";
import { applyAbilityEffects, getActiveTemporaryBonusEntries } from "../../rules/abilities.js";
import { applyCreatureRuleEffects } from "../../rules/creature-rules.js";
import { getUniversalAbilityDefinition, normalizeMechanicalBonus, parseMechanicalBonusImmunity } from "../../rules/mechanical-bonuses.js";
import { calculateSkillDice, getAllSkills, getSkill, slugifySkill } from "../../rules/skills.js";
import { countAttunements, isItemPowerActive } from "../../rules/item-power-rules.js";

const { fields } = foundry.data;

const ATTRIBUTES = ["physique", "finesse", "mind", "presence", "soul"];
const NON_LOAD_TYPES = new Set(["mount", "vehicle", "fleshcraft"]);
const WEAPON_SKILLS_FOR_PARRY = ["Sword", "Axe", "Cudgel", "Polearm", "Unarmed"];
const PARRY_BY_RANK = { practiced: 1, adept: 2, experienced: 3, expert: 4, mastered: 6 };
const DODGE_BY_RANK = { adept: 1, experienced: 1, expert: 2, mastered: 3 };

/* -------------------------------------------- */
/*  Schema pieces                               */
/* -------------------------------------------- */

function attributeField() {
    return new fields.SchemaField({
        value: integer(1),
        bonus: integer(0),
        override: override(),
        speciesBonus: integer(0)
    });
}

function deflectionField() {
    return new fields.SchemaField({ current: count(0), max: count(0), stacks: boolean(false) });
}

function skillEntryField() {
    return new fields.SchemaField({
        rank: string("untrained"),
        miscBonus: integer(0),
        attributeUnlocked: boolean(false),
        attribute: string(),
        isCustom: boolean(false),
        name: string(),
        category: string(),
        skillType: string(),
        subtype: string()
    });
}

function flagMap() {
    return new fields.TypedObjectField(new fields.BooleanField());
}

function combatTraitsField() {
    return new fields.SchemaField({
        abilities: new fields.TypedObjectField(flagMap()),
        abilityValues: new fields.TypedObjectField(new fields.TypedObjectField(new fields.NumberField({ nullable: true }))),
        abilityNotes: string(),
        spellResistancePercent: integer(50, { min: 1, max: 100 }),
        resistances: flagMap(),
        immunities: new fields.SchemaField({ damageTypes: flagMap(), statuses: flagMap(), effects: flagMap() }),
        absorption: flagMap(),
        vulnerabilities: flagMap(),
        vulnerabilitySeverity: new fields.TypedObjectField(new fields.StringField()),
        notes: string()
    });
}

function temporaryBonusField() {
    const nullableInt = () => new fields.NumberField({ required: true, nullable: true, integer: true, initial: null });
    return new fields.SchemaField({
        id: string(),
        key: string(),
        source: string(),
        ability: string(),
        bonuses: new fields.ArrayField(new fields.ObjectField()),
        durationRounds: count(1),
        combatId: string(),
        startRound: nullableInt(),
        expiresRound: nullableInt(),
        expiresAt: number(0)
    });
}

function speciesSnapshotField() {
    const capField = () => new fields.NumberField({ required: true, nullable: true, integer: true, initial: null });
    return new fields.SchemaField({
        name: string(),
        manualEntry: boolean(false),
        baseHP: integer(0),
        size: string("medium"),
        creatureType: string("sapient"),
        creatureSubtype: string(),
        creatureSubtypes: new fields.ArrayField(string()),
        languages: string(),
        speciesAbilities: new fields.TypedObjectField(new fields.ObjectField()),
        abilities: string(),
        statCaps: attributeMap(capField),
        attributeSpread: string(),
        averageEL: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
        sizeRuleExample: string(),
        isMonsterSpecies: boolean(false),
        naturalDeflectionRating: string(),
        flexibleBonus: new fields.SchemaField({ value: integer(0), selectedAttribute: string() })
    });
}

/* -------------------------------------------- */
/*  Character data model                        */
/* -------------------------------------------- */

export default class CharacterData extends foundry.abstract.TypeDataModel {
    static LOCALIZATION_PREFIXES = ["THEFADE.ACTOR.character"];

    static defineSchema() {
        const movement = (land) => new fields.SchemaField({
            land: count(land), fly: count(0), swim: count(0), climb: count(0), burrow: count(0)
        });
        return {
            /* Core statistics */
            attributes: new fields.SchemaField(Object.fromEntries(ATTRIBUTES.map(key => [key, attributeField()]))),
            hp: new fields.SchemaField({ value: integer(0) }),
            hpMiscBonus: integer(0),
            sanity: new fields.SchemaField({ value: integer(10), miscBonus: integer(0) }),
            level: count(1, { min: 0 }),
            experience: count(0),
            initiativeBonus: integer(0),
            isMonster: boolean(false),

            /* Species snapshot applied from the species item (or entered manually) */
            species: speciesSnapshotField(),
            movement: movement(4),

            /* Defenses: only manual adjustments are stored; totals are derived */
            defenses: new fields.SchemaField({
                resilienceBonus: integer(0), avoidBonus: integer(0), gritBonus: integer(0),
                resilienceOverride: override(), avoidOverride: override(), gritOverride: override(),
                passiveDodgeBonus: integer(0), passiveParryBonus: integer(0),
                passiveDodgeOverride: override(), passiveParryOverride: override(),
                facing: string("front")
            }),
            naturalDeflection: new fields.SchemaField(Object.fromEntries(BODY_PARTS.map(part => [part, deflectionField()]))),

            /* Combat state (conditions are status effects; see _prepareConditions) */
            activeStance: string("none"),
            temporaryBonuses: new fields.ArrayField(temporaryBonusField()),
            combatTraits: combatTraitsField(),
            injuries: new fields.SchemaField(Object.fromEntries(
                ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"].map(limb => [limb, new fields.SchemaField({ severed: boolean(false) })])
            )),
            mentalDisorders: new fields.ArrayField(new fields.SchemaField({ type: string(), name: string() })),
            anatomy: new fields.SchemaField({ preset: string("humanoid"), notes: string() }),

            /* Skills: core-skill overrides and full custom-skill records, keyed by slug */
            skills: new fields.TypedObjectField(skillEntryField()),

            /* Magic */
            darkMagic: new fields.SchemaField({
                currentSin: count(0),
                sinThresholdBonus: integer(0),
                addictionLevel: string("none")
            }),
            aura: new fields.SchemaField({ color: string(), shape: string(), intensity: string() }),

            /* Resources */
            currency: new fields.SchemaField({ serpents: number(0) }),
            fate: new fields.SchemaField({
                points: count(0),
                motivations: new fields.SchemaField({ personalGoal: string(), drivingForce: string(), personalRelationship: string() })
            }),

            /* Background */
            biography: html(),
            appearance: string(),
            background: string(),
            notes: html(),
            religion: string(),
            language: string(),
            personalDetails: new fields.SchemaField({
                age: count(0), sex: string(), sexuality: string(),
                heightFeet: count(0), heightInches: count(0), weight: count(0),
                hairColor: string(), eyeColor: string(), skinColor: string(),
                xenochild: boolean(false), handedness: string(), birthplace: string(), culture: string(),
                build: string(), distinguishingMarks: string(), voice: string(), socialClass: string(),
                education: string(), occupation: string(), greatestVice: string(), reputation: string(),
                fightingStyle: string()
            }),
            family: new fields.ObjectField(),
            heritage: new fields.SchemaField({
                motherType: string(), fatherType: string(), outcome: string(), outcomeLabel: string(),
                characteristicChanges: count(0), standardMutationRolls: string(), xenochildRolls: count(0),
                isXenochild: boolean(false),
                xenochildModifiers: new fields.SchemaField({
                    designerSculpting: boolean(false), extradimensionalParentage: boolean(false),
                    dragonParent: boolean(false), faeParent: boolean(false), undeadDNA: boolean(false),
                    additionalParents: count(0)
                }),
                notes: string()
            })
        };
    }

    /* -------------------------------------------- */
    /*  Migration                                   */
    /* -------------------------------------------- */

    /** @override */
    static migrateData(source) {
        migrateCharacterSource(source);
        return super.migrateData(source);
    }

    /* -------------------------------------------- */
    /*  Data preparation                            */
    /* -------------------------------------------- */

    /** @override */
    prepareBaseData() {
        // Flexible species bonus is a choice stored on the species snapshot.
        const flex = this.species.flexibleBonus;
        for (const key of ATTRIBUTES) {
            this.attributes[key].flexibleBonus = (flex.value && flex.selectedAttribute === key) ? flex.value : 0;
        }
        this.species.creatureSubtypes = this.species.creatureSubtypes.filter(Boolean);
        normalizeCombatTraits(this.combatTraits);
    }

    /** @override */
    prepareDerivedData() {
        const actor = this.parent;
        this.isNPC = actor.type === "npc";
        this._prepareConditions();
        this._applyBonuses();
        this._computeAttributeTotals();
        this._computeDefenses();
        this._applyStances();
        this._applyConditionState();
        this._applyDefenseOverrides();
        this._computeEncumbrance();
        this._computeVitals();
        applyAbilityEffects(this, actor);
        this._computeSinThreshold();
        applyAddictionPenalties(this);
        if (this.totalGrit < 1) {
            this.defenseExcess.grit += 1 - this.totalGrit;
            this.totalGrit = 1;
        }
        this._computeVitalStates();
        this._computeMovement();
        this._computeSkills();
        this._computeProgression();
        this._computeInitiative();
    }

    /**
     * Conditions are Foundry status effects ("thefade.bleed"); intensity is a
     * flag on the effect. Mirror them here for the rules engine and sheets.
     */
    _prepareConditions() {
        const actor = this.parent;
        this.conditions = {};
        for (const [key, definition] of Object.entries(CONDITION_EFFECTS)) {
            const statusId = getConditionStatusId(key);
            const active = actor.statuses.has(statusId);
            const effect = active ? actor.effects.find(e => e.active && e.statuses.has(statusId)) : null;
            this.conditions[key] = {
                active,
                tiered: definition.tiered === true,
                intensity: effect?.getFlag("thefade", "intensity") ?? "trivial",
                effectId: effect?.id ?? null
            };
        }
    }

    /**
     * Collect mechanical bonuses from creature-type rules, active Items of
     * Power, talents, precepts, passive path/species abilities, and active
     * temporary bonuses into `itemBonuses` (numeric) and `equippedBonuses`
     * (roll-time dice), and fold granted traits into `combatTraits`.
     */
    _applyBonuses() {
        const actor = this.parent;
        const traits = this.combatTraits;
        this.equippedBonuses = { skills: {}, attack: 0, damage: 0, spell: 0 };
        this.itemBonuses = {
            attributes: Object.fromEntries(ATTRIBUTES.map(key => [key, 0])),
            hp: 0, sanity: 0, initiative: 0, sinThreshold: 0,
            avoid: 0, resilience: 0, grit: 0, passiveDodge: 0, passiveParry: 0
        };
        const emptyGrants = () => ({
            abilities: {}, resistances: {}, immunities: { damageTypes: {}, statuses: {}, effects: {} },
            absorption: {}, vulnerabilities: {}
        });
        traits.itemGranted = emptyGrants();
        traits.temporaryGranted = emptyGrants();
        traits.itemGrantedCustomImmunities = [];

        const apply = (bonus, bucket) => applyMechanicalBonus(this, bonus, bucket);

        // Legacy NPCs share this schema, so identity always lives on the species snapshot.
        for (const bonus of applyCreatureRuleEffects(this, "character")) apply(bonus, traits.ruleGranted);

        const attunementRule = game.settings.get("thefade", "itemPowerAttunementRule") ?? "standard";
        const customSeen = new Set();
        for (const item of actor.items) {
            const system = item.system;
            const itemPowerActive = isItemPowerActive(item, attunementRule);
            if (itemPowerActive || ["talent", "precept"].includes(item.type)) {
                for (const bonus of system.bonuses ?? []) apply(bonus, traits.itemGranted);
            }
            if (itemPowerActive) applyTraitGrants(this, item, customSeen);
            const abilities = ["path", "monsterpath"].includes(item.type) ? system.abilities
                : ["species", "monsterspecies"].includes(item.type) ? system.speciesAbilities : null;
            for (const ability of Object.values(abilities ?? {})) {
                if (ability?.activation === "active") continue;
                for (const bonus of ability?.bonuses ?? []) apply(bonus, traits.itemGranted);
            }
        }
        for (const entry of getActiveTemporaryBonusEntries(actor)) {
            for (const bonus of entry.bonuses ?? []) apply(bonus, traits.temporaryGranted);
        }

        traits.granted = foundry.utils.mergeObject(
            foundry.utils.mergeObject(foundry.utils.deepClone(traits.ruleGranted ?? {}), traits.itemGranted, { inplace: true }),
            traits.temporaryGranted, { inplace: true }
        );
        this.regeneration = traits.abilities?.defensive?.regeneration === true
            ? Number(traits.abilityValues?.defensive?.regeneration) || 1
            : 0;
        this.statusImmunityLocks = {};
        const statuses = traits.immunities?.statuses ?? {};
        for (const status of COMBAT_STATUS_IMMUNITIES) {
            if (status.condition) this.statusImmunityLocks[status.condition] = statuses.all === true || statuses[status.key] === true;
        }
    }

    /**
     * Attribute total = override, or value + species + flexible + manual bonus
     * + item bonus; then capped by species/creature caps, minimum 1, unless a
     * creature rule locks it (e.g. Soulless locks Soul at 0).
     */
    _computeAttributeTotals() {
        for (const key of ATTRIBUTES) {
            const a = this.attributes[key];
            const itemBonus = this.itemBonuses.attributes[key] ?? 0;
            const speciesCap = this.species.statCaps?.[key] ?? null;
            const ruleCap = this.creatureRuleAttributeCaps?.[key] ?? null;
            const cap = speciesCap === null ? ruleCap : (ruleCap === null ? speciesCap : Math.min(speciesCap, ruleCap));
            const lock = this.creatureRuleAttributeLocks?.[key];
            const locked = Number.isFinite(lock);
            const unclamped = a.override ?? (a.value + a.speciesBonus + a.flexibleBonus + a.bonus + itemBonus);
            a.itemBonus = itemBonus;
            a.cap = cap;
            a.lockedByCreatureRule = locked;
            a.total = locked ? lock : Math.max(1, cap !== null ? Math.min(unclamped, cap) : unclamped);
            a.infirm = a.total <= 0;
            a.mod = a.total - a.value;
        }
    }

    /** Base defenses are half an attribute (minimum 1); passive defenses come from skill ranks. */
    _computeDefenses() {
        const d = this.defenses;
        const attr = key => this.attributes[key].total;
        d.resilience = Math.max(1, Math.floor(attr("physique") / 2));
        d.avoid = Math.max(1, Math.floor(attr("finesse") / 2));
        d.grit = Math.max(1, Math.floor(attr("mind") / 2));
        this.totalResilience = Math.max(1, d.resilience + d.resilienceBonus + this.itemBonuses.resilience);
        this.totalAvoid = Math.max(1, d.avoid + d.avoidBonus + this.itemBonuses.avoid);
        this.totalGrit = Math.max(1, d.grit + d.gritBonus + this.itemBonuses.grit);

        const actor = this.parent;
        const acrobatics = getSkill(actor, "Acrobatics");
        const acrobaticsDodge = this.isNPC ? 0 : (DODGE_BY_RANK[acrobatics?.rank] ?? 0);
        d.basePassiveDodge = this.isNPC ? 0 : Math.max(acrobaticsDodge, Math.floor(attr("finesse") / 4));
        d.acrobaticsDodgeDice = acrobaticsDodge;
        d.passiveDodge = d.basePassiveDodge + d.passiveDodgeBonus + this.itemBonuses.passiveDodge;

        let parry = 0;
        if (!this.isNPC) {
            for (const name of WEAPON_SKILLS_FOR_PARRY) parry = Math.max(parry, PARRY_BY_RANK[getSkill(actor, name)?.rank] ?? 0);
        }
        d.basePassiveParry = parry;
        d.passiveParry = parry + d.passiveParryBonus + this.itemBonuses.passiveParry;
        d.avoidPenalty = 0;

        const part = (amount, label) => amount ? ` ${amount > 0 ? "+" : "−"} ${Math.abs(amount)} ${label}` : "";
        d.resilienceFormula = `${game.i18n.localize("THEFADE.Attribute.physique")} ${attr("physique")} ÷ 2 = ${d.resilience}${part(d.resilienceBonus, "bonus")}${part(this.itemBonuses.resilience, "item")}`;
        d.avoidFormula = `${game.i18n.localize("THEFADE.Attribute.finesse")} ${attr("finesse")} ÷ 2 = ${d.avoid}${part(d.avoidBonus, "bonus")}${part(this.itemBonuses.avoid, "item")}`;
        d.gritFormula = `${game.i18n.localize("THEFADE.Attribute.mind")} ${attr("mind")} ÷ 2 = ${d.grit}${part(d.gritBonus, "bonus")}${part(this.itemBonuses.grit, "item")}`;
        d.passiveDodgeFormula = `Base ${d.basePassiveDodge}${part(d.passiveDodgeBonus, "bonus")}${part(this.itemBonuses.passiveDodge, "item")}`;
        d.passiveParryFormula = `Base ${d.basePassiveParry}${part(d.passiveParryBonus, "bonus")}${part(this.itemBonuses.passiveParry, "item")}`;
    }

    _applyStances() {
        if (!STANCES[this.activeStance]) this.activeStance = "none";
        applyBaseDefenseStances(this);
        applyPassiveStances(this, this.defenses.acrobaticsDodgeDice);
        this.totalAvoid = Math.max(0, this.totalAvoid);
        this.stanceSummary = summarizeStance(this);
        this.damageMitigation = getDamageMitigation(this.activeStance);
    }

    /** Passive deltas from active conditions (immune conditions are ignored). */
    _applyConditionState() {
        const effective = Object.fromEntries(Object.entries(this.conditions)
            .filter(([key]) => this.statusImmunityLocks[key] !== true));
        const state = aggregateConditionState(effective);
        this.conditionState = state;
        this.conditionSummary = summarizeConditionState(state);
        // Defenses never drop below 1; each point a penalty would take them
        // under 1 instead grants attackers +1D (Core p. 12).
        this.defenseExcess = {};
        for (const [key, totalKey, delta] of [
            ["avoid", "totalAvoid", state.avoidDelta], ["grit", "totalGrit", state.gritDelta], ["resilience", "totalResilience", state.resilienceDelta]
        ]) {
            const raw = this[totalKey] + (delta || 0);
            this.defenseExcess[key] = Math.max(0, 1 - raw);
            this[totalKey] = Math.max(1, raw);
        }
        this.speedMultiplier = state.immobile ? 0 : state.speedMultiplier;
    }

    /** Manual overrides replace computed values outright. */
    _applyDefenseOverrides() {
        const d = this.defenses;
        for (const [overrideKey, totalKey, formulaKey, onDefenses] of [
            ["resilienceOverride", "totalResilience", "resilienceFormula", false],
            ["avoidOverride", "totalAvoid", "avoidFormula", false],
            ["gritOverride", "totalGrit", "gritFormula", false],
            ["passiveDodgeOverride", "passiveDodge", "passiveDodgeFormula", true],
            ["passiveParryOverride", "passiveParry", "passiveParryFormula", true]
        ]) {
            const value = d[overrideKey];
            if (value === null || value === undefined) continue;
            if (onDefenses) d[totalKey] = value;
            else this[totalKey] = value;
            d[formulaKey] = game.i18n.format("THEFADE.Defense.overridden", { value });
        }
    }

    /** Carrying capacity bands (Core p. 32) and current load from carried items. */
    _computeEncumbrance() {
        const physique = this.attributes.physique.total || 1;
        const heavy = (5 + physique) * 30;
        const capacity = {
            light: (5 + physique) * 10,
            medium: (5 + physique) * 20,
            heavy,
            overHead: Math.floor(heavy * 1.5),
            offGround: heavy * 3,
            pushOrDrag: heavy * 5
        };
        let load = 0;
        for (const item of this.parent.items) {
            if (NON_LOAD_TYPES.has(item.type)) continue;
            load += Number(item.system.carriedWeight) || 0;
        }
        load = Math.round(load * 100) / 100;
        const bands = [["light", capacity.light], ["medium", capacity.medium], ["heavy", capacity.heavy],
            ["overHead", capacity.overHead], ["offGround", capacity.offGround]];
        let tier = load <= 0 ? "none" : "pushOrDrag";
        if (load > 0) for (const [key, max] of bands) { if (load <= max) { tier = key; break; } }
        capacity.currentTier = tier;
        capacity.currentTierLabel = game.i18n.localize(`THEFADE.Encumbrance.${tier}`);
        capacity.load = load;
        capacity.pct = Math.min(100, Math.round((load / capacity.light) * 100));
        this.carryingCapacity = capacity;
    }

    /** Maximum HP and Sanity. */
    _computeVitals() {
        const actor = this.parent;
        const paths = actor.items.filter(item => ["path", "monsterpath"].includes(item.type));
        const pathHP = paths.reduce((sum, path) => sum + (path.system.baseHP || 0), 0);
        const highestTier = paths.reduce((max, path) => Math.max(max, path.system.tier || 0), 0);
        const physique = this.attributes.physique.total;
        const level = Math.max(1, this.level);

        // Optional "More HP" rule: +1 HP per level from 5 with a Tier 2 path, +2 per level from 10 with Tier 3.
        let levelHP = 0;
        if (game.settings.get("thefade", "moreHPScaling")) {
            if (highestTier >= 2) levelHP += Math.max(0, (highestTier >= 3 ? Math.min(level, 9) : level) - 4);
            if (highestTier >= 3 && level >= 10) levelHP += (level - 9) * 2;
        }

        const speciesHP = this.species.baseHP;
        const misc = this.hpMiscBonus;
        const itemHP = this.itemBonuses.hp;
        this.hp.max = Math.max(1, speciesHP + pathHP + physique + misc + itemHP + levelHP);
        const parts = [`Species ${speciesHP}`, `Path ${pathHP}`, `Physique ${physique}`];
        if (misc) parts.push(`${misc} misc`);
        if (itemHP) parts.push(`${itemHP} item`);
        if (levelHP) parts.push(`${levelHP} level`);
        this.hp.formula = `${parts.join(" + ")} = ${this.hp.max}`;
        this.hp.deathThreshold = -2 * this.hp.max;

        const mind = this.attributes.mind.total;
        this.sanity.max = Math.max(1, 10 + mind + this.sanity.miscBonus + this.itemBonuses.sanity);
        this.sanity.formula = `10 + Mind ${mind}${this.sanity.miscBonus ? ` + ${this.sanity.miscBonus} misc` : ""}${this.itemBonuses.sanity ? ` + ${this.itemBonuses.sanity} item` : ""} = ${this.sanity.max}`;
        this.sanity.meltdown = Math.floor(this.sanity.max / 2);
    }

    /** HP state ladder and meter percentages, after abilities may have raised maximums. */
    _computeVitalStates() {
        this.hp.deathThreshold = -2 * this.hp.max;
        const hp = this.hp.value;
        const max = this.hp.max;
        this.hp.state = hp >= max ? "healthy" : hp > max / 2 ? "bloodied" : hp > 0 ? "wounded"
            : hp === 0 ? "unconscious" : hp > this.hp.deathThreshold ? "dying" : "dead";
        this.hp.stateLabel = game.i18n.localize(`THEFADE.HPState.${this.hp.state}`);
        this.hp.pct = Math.max(0, Math.min(100, Math.round((Math.max(0, hp) / max) * 100)));
        this.sanity.pct = Math.max(0, Math.min(100, Math.round((Math.max(0, this.sanity.value) / this.sanity.max) * 100)));
    }

    /** Sin Threshold = Soul − dark spells known + bonuses (minimum 1). */
    _computeSinThreshold() {
        const dark = this.parent.items.filter(item => item.type === "spell" && isDarkMagicSpell(item)).length;
        this.darkMagic.spellsLearnedCount = dark;
        this.darkMagic.sinThreshold = Math.max(1,
            this.attributes.soul.total - dark + this.darkMagic.sinThresholdBonus + this.itemBonuses.sinThreshold);
    }

    /** Effective movement (conditions applied) and overland travel (hexes × 6). */
    _computeMovement() {
        this.effectiveMovement = {};
        this.overland = {};
        for (const [mode, hexes] of Object.entries(this.movement)) {
            this.effectiveMovement[mode] = Math.floor(hexes * this.speedMultiplier);
            this.overland[mode] = hexes * 6;
        }
    }

    /** Every skill with its current dice pool, keyed by slug and grouped by category. */
    _computeSkills() {
        const actor = this.parent;
        const list = getAllSkills(actor).filter(Boolean).map(skill => ({ ...skill, dice: calculateSkillDice(actor, skill) }));
        this.skillPools = Object.fromEntries(list.map(skill => [skill.key, skill]));
        this.skillCategories = {};
        for (const skill of list.sort((a, b) => a.name.localeCompare(b.name))) {
            (this.skillCategories[skill.category] ??= []).push(skill);
        }
    }

    /** Level-derived progression: tiers, paths allowed, talents, attunements, point buy. */
    _computeProgression() {
        const actor = this.parent;
        const level = Math.max(1, this.level);
        const hasMonsterOrigin = actor.items.some(item => ["monsterspecies", "monsterpath"].includes(item.type));
        this.isMonsterCreature = this.isMonster || hasMonsterOrigin;
        this.progression = {
            tierLevels: [level, Math.max(0, level - 4), Math.max(0, level - 9)],
            maxTier: level >= 10 ? 3 : level >= 5 ? 2 : 1,
            pathsAllowed: this.isMonsterCreature ? 0 : 1 + Math.floor((level - 1) / 5),
            pathsTaken: actor.items.filter(item => item.type === "path").length,
            talentsAllowed: Math.ceil(level / 2),
            talentsTaken: actor.items.filter(item => item.type === "talent").length,
            traitsTaken: actor.items.filter(item => item.type === "trait").length,
            experienceToLevel: 10
        };
        const rule = game.settings.get("thefade", "itemPowerAttunementRule") ?? "standard";
        this.attunement = {
            current: countAttunements(actor.items.contents, rule),
            max: Math.max(0, Math.floor(level / 4) + this.attributes.soul.total),
            enabled: rule !== "removed"
        };
        // Point buy: attributes start at 1, max 10, 20 points to spend (Core p. 7).
        let spent = 0;
        let capExceeded = false;
        for (const key of ATTRIBUTES) {
            spent += Math.max(0, this.attributes[key].value - 1);
            if (this.attributes[key].value > 10) capExceeded = true;
        }
        this.pointBuy = { spent, budget: 20, remaining: 20 - spent, over: spent > 20, capExceeded };
    }

    /** Initiative modifier = average of Finesse and Mind + bonuses (Core p. 18). */
    _computeInitiative() {
        const average = Math.floor((this.attributes.finesse.total + this.attributes.mind.total) / 2);
        const mod = average + this.initiativeBonus + this.itemBonuses.initiative;
        this.initiative = { average, mod, formula: `1d12 + ${mod}` };
    }

    /* -------------------------------------------- */
    /*  Roll data                                   */
    /* -------------------------------------------- */

    /** Shortcuts for formulas: @phy, @fin, @mind, @pre, @soul, @level, @initiative. */
    getRollData() {
        const data = {};
        for (const key of ATTRIBUTES) data[key] = this.attributes[key].total;
        Object.assign(data, {
            phy: data.physique, fin: data.finesse, mnd: data.mind, pre: data.presence, sol: data.soul,
            level: this.level,
            initiative: this.initiative?.mod ?? 0
        });
        return data;
    }
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** Clamp universal-ability values and keep only known trait keys meaningful. */
function normalizeCombatTraits(traits) {
    for (const category of UNIVERSAL_ABILITY_CATEGORIES) {
        traits.abilities[category.key] ??= {};
        traits.abilityValues[category.key] ??= {};
        for (const ability of category.abilities) {
            if (!ability.amount || ability.key === "spellResistance") continue;
            const raw = traits.abilityValues[category.key][ability.key];
            let amount = Number.isFinite(raw) ? raw : ability.amount.default;
            if (ability.amount.min !== undefined) amount = Math.max(ability.amount.min, amount);
            if (ability.amount.max !== undefined) amount = Math.min(ability.amount.max, amount);
            traits.abilityValues[category.key][ability.key] = amount;
        }
    }
    for (const type of COMBAT_DAMAGE_TYPES) {
        if (!["minor", "moderate", "severe"].includes(traits.vulnerabilitySeverity[type.key])) traits.vulnerabilitySeverity[type.key] = "minor";
    }
}

/** Apply one normalized mechanical bonus to the prepared system data. */
function applyMechanicalBonus(system, bonus, bucket) {
    const traits = system.combatTraits;
    const normalized = normalizeMechanicalBonus(bonus);
    const value = Number(normalized.value) || 0;
    const target = String(normalized.target || "").trim();
    const lower = target.toLowerCase();
    const mark = (group, key, sub) => {
        if (!bucket) return;
        if (sub) ((bucket[group] ??= {})[sub] ??= {})[key] = true;
        else (bucket[group] ??= {})[key] = true;
    };

    switch (normalized.type) {
        case "stat":
            if (target in system.itemBonuses.attributes) system.itemBonuses.attributes[target] += value;
            else if (["hp", "sanity", "initiative", "sinThreshold"].includes(target)) system.itemBonuses[target] += value;
            break;
        case "defense":
            if (target in system.itemBonuses) system.itemBonuses[target] += value;
            break;
        case "skill": {
            const key = slugifySkill(lower) || "all";
            system.equippedBonuses.skills[key] = (system.equippedBonuses.skills[key] || 0) + value;
            break;
        }
        case "attack":
        case "damage": {
            const key = (!lower || lower === "all") ? normalized.type : `${normalized.type}_${lower}`;
            system.equippedBonuses[key] = (system.equippedBonuses[key] || 0) + value;
            break;
        }
        case "spell":
            system.equippedBonuses.spell += value;
            break;
        case "resistance": {
            const type = COMBAT_DAMAGE_TYPES.find(t => t.key.toLowerCase() === lower || t.label.toLowerCase() === lower);
            if (!type) break;
            traits.resistances[type.key] = true;
            mark("resistances", type.key);
            break;
        }
        case "immunity": {
            const { group, key } = parseMechanicalBonusImmunity(target);
            const traitGroup = group === "damage" ? "damageTypes" : group === "status" ? "statuses" : "effects";
            if (!key) break;
            traits.immunities[traitGroup][key] = true;
            mark("immunities", key, traitGroup);
            break;
        }
        case "absorption":
            if (!COMBAT_IMMUNITY_DAMAGE_TYPES.some(t => t.key === target)) break;
            traits.absorption[target] = true;
            mark("absorption", target);
            break;
        case "vulnerability": {
            if (!COMBAT_DAMAGE_TYPES.some(t => t.key === target)) break;
            const rank = { minor: 1, moderate: 2, severe: 3 };
            const already = traits.vulnerabilities[target] === true;
            const current = traits.vulnerabilitySeverity[target] || "minor";
            traits.vulnerabilities[target] = true;
            traits.vulnerabilitySeverity[target] = already && rank[current] > rank[normalized.severity] ? current : normalized.severity;
            mark("vulnerabilities", target);
            break;
        }
        case "universalAbility": {
            const definition = getUniversalAbilityDefinition(target);
            if (!definition) break;
            const { category, ability } = definition;
            const already = traits.abilities[category.key]?.[ability.key] === true;
            if (ability.amount) {
                let amount = value || ability.amount.default || 1;
                if (ability.amount.min !== undefined) amount = Math.max(ability.amount.min, amount);
                if (ability.amount.max !== undefined) amount = Math.min(ability.amount.max, amount);
                if (ability.key === "spellResistance") {
                    traits.spellResistancePercent = already ? Math.max(traits.spellResistancePercent, amount) : amount;
                } else {
                    const currentAmount = Number(traits.abilityValues[category.key]?.[ability.key]) || ability.amount.default || 1;
                    (traits.abilityValues[category.key] ??= {})[ability.key] = already ? Math.max(currentAmount, amount) : amount;
                }
            }
            (traits.abilities[category.key] ??= {})[ability.key] = true;
            mark("abilities", ability.key, category.key);
            break;
        }
    }
}

/** Fold an active Item of Power's trait grants into combat traits. */
function applyTraitGrants(system, item, customSeen) {
    const traits = system.combatTraits;
    const grants = item.system.traitGrants;
    if (!grants) return;
    const granted = traits.itemGranted;
    for (const category of UNIVERSAL_ABILITY_CATEGORIES) {
        for (const ability of category.abilities) {
            if (grants.abilities?.[category.key]?.[ability.key] !== true) continue;
            if (category.key === "defensive" && ability.key === "spellResistance") {
                const already = traits.abilities.defensive?.spellResistance === true;
                const percent = Math.min(100, Math.max(1, grants.spellResistancePercent || 50));
                traits.spellResistancePercent = already ? Math.max(traits.spellResistancePercent, percent) : percent;
            }
            (traits.abilities[category.key] ??= {})[ability.key] = true;
            (granted.abilities[category.key] ??= {})[ability.key] = true;
        }
    }
    for (const type of COMBAT_DAMAGE_TYPES) {
        if (grants.resistances?.[type.key]) traits.resistances[type.key] = granted.resistances[type.key] = true;
    }
    for (const [group, list] of [["damageTypes", COMBAT_IMMUNITY_DAMAGE_TYPES], ["statuses", COMBAT_STATUS_IMMUNITIES], ["effects", COMBAT_IMMUNITY_EFFECTS]]) {
        for (const entry of list) {
            if (grants.immunities?.[group]?.[entry.key]) traits.immunities[group][entry.key] = granted.immunities[group][entry.key] = true;
        }
    }
    for (const label of String(grants.customImmunities || "").split(/[;,\n]+/).map(v => v.trim()).filter(Boolean)) {
        const key = label.toLowerCase();
        if (customSeen.has(key)) continue;
        customSeen.add(key);
        traits.itemGrantedCustomImmunities.push({ label, source: item.name });
    }
}

/* -------------------------------------------- */
/*  Legacy migration                            */
/* -------------------------------------------- */

/** Keys earlier sheets saved onto actors that are derived or obsolete. */
const OBSOLETE_ACTOR_KEYS = [
    "overland-movement", "tier1tl", "tier2tl", "tier3tl", "initiative", "currentAttunements", "maxAttunements",
    "currentLoad", "magicItems", "totalAvoid", "totalGrit", "totalResilience", "rank", "miscBonus", "currentAP",
    "otherLimbAP", "quantity", "tolerance", "uses", "maxTier", "talentsFromLevel", "talentsBonus", "talentsTotal",
    "spellsLearnedBase", "spellsLearnedFromLevel", "spellsLearnedTotal", "pathsAllowed", "currentTalents",
    "currentTraits", "pointBuy", "creationMode", "maxHP", "maxSanity", "itemBonuses", "equippedBonuses",
    "carryingCapacity", "conditionState", "conditionSummary", "effectiveMovement", "stanceSummary",
    "damageMitigation", "statusImmunityLocks", "regeneration", "creatureRuleAttributeLocks",
    "creatureRuleAttributeCaps", "creatureRuleSources", "abilityEffects", "vision", "itemsOfPower",
    "equippedItemsOfPower", "unequippedItemsOfPower", "equippedArmor", "unequippedArmor", "potions", "drugs"
];

export function migrateCharacterSource(source) {
    for (const key of OBSOLETE_ACTOR_KEYS) delete source[key];

    // Attributes: numeric coercion; drop derived totals.
    if (source.attributes && typeof source.attributes === "object") {
        for (const key of ATTRIBUTES) {
            const a = source.attributes[key];
            if (!a || typeof a !== "object") continue;
            if ("value" in a && typeof a.value !== "number") a.value = Math.trunc(toNumber(a.value, 1));
            for (const field of ["bonus", "speciesBonus"]) {
                if (field in a && typeof a[field] !== "number") a[field] = Math.trunc(toNumber(a[field], 0));
            }
            if ("override" in a && a.override !== null && typeof a.override !== "number") {
                a.override = (a.override === "" || a.override === undefined) ? null : Math.trunc(toNumber(a.override, 0));
            }
            for (const derived of ["total", "flexibleBonus", "displayValue", "cap", "lockedByCreatureRule", "itemBonus"]) delete a[derived];
        }
    }

    for (const key of ["hpMiscBonus", "initiativeBonus"]) {
        if (key in source && typeof source[key] !== "number") source[key] = Math.trunc(toNumber(source[key], 0));
    }
    if (source.hp && typeof source.hp === "object") {
        if ("value" in source.hp && typeof source.hp.value !== "number") source.hp.value = Math.trunc(toNumber(source.hp.value, 0));
        for (const derived of ["max", "formula", "state", "stateLabel"]) delete source.hp[derived];
    }
    if (source.sanity && typeof source.sanity === "object") {
        if ("miscBonus" in source.sanity && typeof source.sanity.miscBonus !== "number") source.sanity.miscBonus = Math.trunc(toNumber(source.sanity.miscBonus, 0));
        for (const derived of ["max", "formula"]) delete source.sanity[derived];
    }

    if (source.defenses && typeof source.defenses === "object") {
        for (const derived of ["resilience", "avoid", "grit", "passiveDodge", "passiveParry", "basePassiveDodge",
            "basePassiveParry", "avoidPenalty", "acrobaticsDodgeDice", "dodgeStanceBonus", "resilienceFormula",
            "avoidFormula", "gritFormula", "passiveDodgeFormula", "passiveParryFormula"]) delete source.defenses[derived];
        for (const [key, value] of Object.entries(source.defenses)) {
            if (key.endsWith("Override") && value !== null && typeof value !== "number") {
                source.defenses[key] = value === "" ? null : Math.trunc(toNumber(value, 0));
            } else if (key.endsWith("Bonus") && typeof value !== "number") {
                source.defenses[key] = Math.trunc(toNumber(value, 0));
            }
        }
    }

    if (source.darkMagic && typeof source.darkMagic === "object") {
        for (const derived of ["sinThreshold", "spellsLearnedCount", "stageSummary", "spellsLearned"]) delete source.darkMagic[derived];
    }

    if (source.species && typeof source.species === "object") {
        const species = source.species;
        if ("baseHP" in species && typeof species.baseHP !== "number") species.baseHP = Math.trunc(toNumber(species.baseHP, 0));
        if (species.statCaps && typeof species.statCaps === "object") {
            for (const [key, value] of Object.entries(species.statCaps)) {
                species.statCaps[key] = (value === "" || value === null || value === undefined) ? null : Math.trunc(toNumber(value, 0));
            }
        }
        if ("averageEL" in species && species.averageEL !== null && typeof species.averageEL !== "number") {
            species.averageEL = species.averageEL === "" ? null : Math.trunc(toNumber(species.averageEL, 0));
        }
        if (species.speciesAbilities && (typeof species.speciesAbilities !== "object" || Array.isArray(species.speciesAbilities))) species.speciesAbilities = {};
    }

    if (Array.isArray(source.mentalDisorders)) {
        source.mentalDisorders = source.mentalDisorders.filter(entry => entry && typeof entry === "object");
    }

    if (source.currency && "serpents" in source.currency && typeof source.currency.serpents !== "number") {
        source.currency.serpents = toNumber(source.currency.serpents, 0);
    }

    if (source.skills && typeof source.skills === "object") {
        for (const entry of Object.values(source.skills)) {
            if (!entry || typeof entry !== "object") continue;
            if ("miscBonus" in entry && typeof entry.miscBonus !== "number") entry.miscBonus = Math.trunc(toNumber(entry.miscBonus, 0));
            for (const key of ["skillType", "subtype"]) if (entry[key] === null) entry[key] = "";
        }
    }

    // Fold any NPC-only top-level identity fields into the species snapshot.
    for (const key of ["creatureType", "creatureSubtype", "creatureSubtypes", "size"]) {
        if (!(key in source)) continue;
        source.species ??= {};
        if (source.species[key] === undefined || source.species[key] === "" || (Array.isArray(source.species[key]) && !source.species[key].length)) {
            source.species[key] = source[key];
        }
        delete source[key];
    }
}
