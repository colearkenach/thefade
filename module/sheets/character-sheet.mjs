// The character sheet (also used by legacy NPC actors).
import TheFadeActorSheet from "./base-actor-sheet.mjs";
import { buildProtectionView, reduceProtection, resetProtection } from "../rules/protection.js";
import { buildWeaponDamageProfile, getWeaponCriticalDamageBonus } from "../rules/weapon-rules.js";
import { organizeItemsOfPower, canEquipItemPower } from "../rules/item-power-rules.js";
import { buildCombatTraitSummary } from "../rules/sheet-summaries.js";
import { buildCreatureSubtypeSelector, getCreatureRuleSources } from "../rules/creature-rules.js";
import { activateAbility } from "../rules/abilities.js";
import { STANCES } from "../rules/stances.js";
import { CONDITION_EFFECTS } from "../rules/conditions.js";
import { createCustomSkill } from "../rules/path-skills.mjs";
import { rollHitLocation, locationLabel } from "../rules/hit-location.js";
import { getIgnitionStatus } from "../rules/ignition.mjs";

const { DialogV2 } = foundry.applications.api;
const ATTRIBUTES = ["physique", "finesse", "mind", "presence", "soul"];
const INVENTORY_FAMILIES = ["equipment", "gear", "consumables", "devices", "companions"];

export default class TheFadeCharacterSheet extends TheFadeActorSheet {

    static DEFAULT_OPTIONS = {
        classes: ["character"],
        position: { width: 860, height: 900 },
        actions: {
            rollAttribute: TheFadeCharacterSheet.#onRollAttribute,
            rollSkill: TheFadeCharacterSheet.#onRollSkill,
            rollAttack: TheFadeCharacterSheet.#onRollAttack,
            rollInitiative: TheFadeCharacterSheet.#onRollInitiative,
            rollPool: TheFadeCharacterSheet.#onRollPool,
            castSpell: TheFadeCharacterSheet.#onCastSpell,
            setStance: TheFadeCharacterSheet.#onSetStance,
            toggleCondition: TheFadeCharacterSheet.#onToggleCondition,
            setIntensity: TheFadeCharacterSheet.#onSetIntensity,
            clearCombatState: TheFadeCharacterSheet.#onClearCombatState,
            damageLocation: TheFadeCharacterSheet.#onDamageLocation,
            restoreLocation: TheFadeCharacterSheet.#onRestoreLocation,
            rollHitLocation: TheFadeCharacterSheet.#onRollHitLocation,
            addCustomSkill: TheFadeCharacterSheet.#onAddCustomSkill,
            deleteSkill: TheFadeCharacterSheet.#onDeleteSkill,
            useAbility: TheFadeCharacterSheet.#onUseAbility,
            removeTemporaryBonus: TheFadeCharacterSheet.#onRemoveTemporaryBonus,
            takeRest: TheFadeCharacterSheet.#onTakeRest,
            restDaily: TheFadeCharacterSheet.#onRestDaily,
            rollAddiction: TheFadeCharacterSheet.#onRollAddiction,
            addDisorder: TheFadeCharacterSheet.#onAddDisorder,
            removeDisorder: TheFadeCharacterSheet.#onRemoveDisorder,
            attune: TheFadeCharacterSheet.#onAttune,
            opposedRoll: TheFadeCharacterSheet.#onOpposedRoll,
            aidAnother: TheFadeCharacterSheet.#onAidAnother,
            rollAttributes: TheFadeCharacterSheet.#onRollAttributes,
            fate: TheFadeCharacterSheet.#onFate,
            ignite: TheFadeCharacterSheet.#onIgnite,
            heritage: TheFadeCharacterSheet.#onHeritage,
            rollMutation: TheFadeCharacterSheet.#onRollMutation,
            downtimeProgress: TheFadeCharacterSheet.#onDowntimeProgress
        }
    };

    static PARTS = {
        header: { template: "systems/thefade/templates/actor/character/header.hbs" },
        tabs: { template: "systems/thefade/templates/actor/character/tabs.hbs" },
        overview: { template: "systems/thefade/templates/actor/character/overview.hbs", scrollable: [""] },
        skills: { template: "systems/thefade/templates/actor/character/skills.hbs", scrollable: [""] },
        combat: { template: "systems/thefade/templates/actor/character/combat.hbs", scrollable: [""] },
        inventory: { template: "systems/thefade/templates/actor/character/inventory.hbs", scrollable: [""] },
        abilities: { template: "systems/thefade/templates/actor/character/abilities.hbs", scrollable: [""] },
        magic: { template: "systems/thefade/templates/actor/character/magic.hbs", scrollable: [""] },
        biography: { template: "systems/thefade/templates/actor/character/biography.hbs", scrollable: [""] }
    };

    static TABS = {
        primary: {
            tabs: [
                { id: "overview", icon: "fa-solid fa-chart-simple" },
                { id: "skills", icon: "fa-solid fa-list-check" },
                { id: "combat", icon: "fa-solid fa-shield-halved" },
                { id: "inventory", icon: "fa-solid fa-sack" },
                { id: "abilities", icon: "fa-solid fa-star" },
                { id: "magic", icon: "fa-solid fa-wand-magic-sparkles" },
                { id: "biography", icon: "fa-solid fa-book-open" }
            ],
            initial: "overview",
            labelPrefix: "THEFADE.Sheet.Tab"
        }
    };

    /** Skill-list filter text, kept across renders. */
    _skillFilter = "";

    /* -------------------------------------------- */
    /*  Context                                     */
    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.document;
        const system = actor.system;
        const paths = actor.itemTypes.path.concat(actor.itemTypes.monsterpath).sort((a, b) => (a.system.tier - b.system.tier) || a.name.localeCompare(b.name));
        const speciesItems = actor.itemTypes.species.concat(actor.itemTypes.monsterspecies);
        context.header = {
            subtitle: [system.species.name, game.i18n.localize(CONFIG.THEFADE.creatureTypes[system.species.creatureType] ?? system.species.creatureType),
                CONFIG.THEFADE.sizes[system.species.size]].filter(Boolean),
            paths: paths.map(path => ({ id: path.id, name: path.name, tier: path.system.tier, monster: path.type === "monsterpath" })),
            speciesItem: speciesItems[0] ?? null,
            multipleSpecies: speciesItems.length > 1,
            sin: { value: system.darkMagic.currentSin, threshold: system.darkMagic.sinThreshold, over: system.darkMagic.currentSin > system.darkMagic.sinThreshold },
            fateEnabled: game.settings.get("thefade", "fatePointsEnabled")
        };
        context.tabs = this._prepareTabs("primary");
        return context;
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (context.tabs?.[partId]) context.tab = context.tabs[partId];
        switch (partId) {
            case "overview": await this._prepareOverview(context); break;
            case "skills": this._prepareSkills(context); break;
            case "combat": await this._prepareCombat(context); break;
            case "inventory": await this._prepareInventory(context); break;
            case "abilities": await this._prepareAbilities(context); break;
            case "magic": await this._prepareMagic(context); break;
            case "biography": await this._prepareBiography(context); break;
        }
        return context;
    }

    async _prepareOverview(context) {
        const actor = this.document;
        const system = actor.system;
        context.attributes = ATTRIBUTES.map(key => {
            const a = system.attributes[key];
            const parts = [];
            if (a.speciesBonus) parts.push(`${a.speciesBonus > 0 ? "+" : ""}${a.speciesBonus} ${game.i18n.localize("THEFADE.Attribute.species")}`);
            if (a.flexibleBonus) parts.push(`+${a.flexibleBonus} ${game.i18n.localize("THEFADE.Attribute.flexible")}`);
            if (a.bonus) parts.push(`${a.bonus > 0 ? "+" : ""}${a.bonus} ${game.i18n.localize("THEFADE.Attribute.bonus")}`);
            if (a.itemBonus) parts.push(`${a.itemBonus > 0 ? "+" : ""}${a.itemBonus} ${game.i18n.localize("THEFADE.Attribute.item")}`);
            return {
                key,
                label: game.i18n.localize(CONFIG.THEFADE.attributes[key].label),
                abbr: game.i18n.localize(CONFIG.THEFADE.attributes[key].abbreviation),
                value: a.value,
                total: a.total,
                breakdown: a.override !== null ? game.i18n.format("THEFADE.Attribute.overridden", { value: a.override })
                    : parts.length ? `${a.value} ${parts.join(" ")}` : game.i18n.format("THEFADE.Attribute.base", { value: a.value }),
                infirm: a.infirm,
                locked: a.lockedByCreatureRule,
                source: context.source.attributes[key],
                flexibleTarget: system.species.flexibleBonus.value > 0
            };
        });
        context.flexible = {
            value: system.species.flexibleBonus.value,
            selected: system.species.flexibleBonus.selectedAttribute,
            options: Object.fromEntries(ATTRIBUTES.map(key => [key, game.i18n.localize(CONFIG.THEFADE.attributes[key].label)]))
        };
        context.creationMode = game.settings.get("thefade", "characterCreationMode");
        context.defenses = [
            { key: "resilience", label: "THEFADE.Defense.resilience", value: system.totalResilience, formula: system.defenses.resilienceFormula, bonus: "resilienceBonus", override: "resilienceOverride" },
            { key: "avoid", label: "THEFADE.Defense.avoid", value: system.totalAvoid, formula: system.defenses.avoidFormula, bonus: "avoidBonus", override: "avoidOverride" },
            { key: "grit", label: "THEFADE.Defense.grit", value: system.totalGrit, formula: system.defenses.gritFormula, bonus: "gritBonus", override: "gritOverride" },
            { key: "passiveDodge", label: "THEFADE.Defense.passiveDodge", value: system.defenses.passiveDodge, formula: system.defenses.passiveDodgeFormula, bonus: "passiveDodgeBonus", override: "passiveDodgeOverride" },
            { key: "passiveParry", label: "THEFADE.Defense.passiveParry", value: system.defenses.passiveParry, formula: system.defenses.passiveParryFormula, bonus: "passiveParryBonus", override: "passiveParryOverride" }
        ].map(d => ({ ...d, sourceBonus: context.source.defenses[d.bonus], sourceOverride: context.source.defenses[d.override] }));
        context.protection = this._prepareProtection();
        // Every weapon is listed (older characters never marked weapons as equipped); ready ones come first.
        context.attacks = this._prepareAttacks(actor.itemTypes.weapon)
            .sort((a, b) => Number(b.ready) - Number(a.ready));
        context.stances = this._prepareStances();
        context.activeConditions = Object.entries(system.conditions).filter(([, c]) => c.active).map(([key, c]) => ({
            key, label: CONDITION_EFFECTS[key].label, intensity: c.tiered ? game.i18n.localize(`THEFADE.Intensity.${c.intensity}`) : ""
        }));
        context.movement = Object.entries(system.movement).map(([mode, hexes]) => ({
            mode, label: game.i18n.localize(`THEFADE.Movement.${mode}`), hexes, effective: system.effectiveMovement[mode],
            overland: system.overland[mode], source: context.source.movement[mode]
        })).filter(m => m.hexes > 0 || this.isEditMode);
        context.encumbrance = system.carryingCapacity;
    }

    /** Body-location protection: armor + Natural Deflection per location. */
    _prepareProtection() {
        const preset = game.settings.get("thefade", "alternateAnatomyEnabled") ? this.document.system.anatomy.preset : "humanoid";
        const rows = buildProtectionView(this.document, preset).filter(row => row.isPrimaryPool);
        const byLocation = Object.fromEntries(rows.map(row => [row.location, row]));
        const cell = location => {
            const row = byLocation[location];
            if (!row) return null;
            return {
                location,
                label: game.i18n.localize(CONFIG.THEFADE.bodyParts[location]),
                total: row.total.current, max: row.total.max,
                armor: row.armor, natural: row.natural,
                pct: row.total.max ? Math.round((row.total.current / row.total.max) * 100) : 0,
                damaged: row.total.current < row.total.max,
                source: this.document._source.system.naturalDeflection[location]
            };
        };
        return {
            doll: [null, cell("head"), null, cell("leftarm"), cell("body"), cell("rightarm"), cell("leftleg"), null, cell("rightleg")],
            rows: rows.map(row => cell(row.location)).filter(Boolean),
            anatomy: preset
        };
    }

    /** Attack rows for weapons. */
    _prepareAttacks(weapons) {
        return weapons.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name)).map(weapon => {
            const attack = this.document.getWeaponAttackDice(weapon);
            const damage = buildWeaponDamageProfile(this.document, weapon.system);
            return {
                id: weapon.id, name: weapon.name, img: weapon.img, item: weapon,
                dice: attack.dice,
                skill: weapon.system.skill,
                untrained: attack.untrained,
                attributeSource: attack.attributeSource,
                damage: damage.display,
                critical: weapon.system.critical,
                criticalBonus: getWeaponCriticalDamageBonus(weapon.system),
                range: weapon.system.range,
                qualities: weapon.system.qualityLabel,
                equipped: weapon.system.equipped,
                ready: weapon.system.equipped || weapon.system.isNatural,
                natural: weapon.system.isNatural
            };
        });
    }

    _prepareStances() {
        const active = this.document.system.activeStance;
        return Object.values(STANCES).map(stance => ({ ...stance, active: stance.key === active }));
    }

    _prepareSkills(context) {
        const system = this.document.system;
        const filter = this._skillFilter.toLowerCase();
        context.skillFilter = this._skillFilter;
        context.rankOptions = Object.fromEntries(Object.entries(CONFIG.THEFADE.skillRanks).map(([k, v]) => [k, game.i18n.localize(v.label)]));
        context.attributeOptions = Object.fromEntries(Object.entries(CONFIG.THEFADE.skillAttributes).map(([k, v]) => [k, game.i18n.localize(v)]));
        context.skillGroups = Object.keys(CONFIG.THEFADE.skillCategories).map(category => {
            const skills = (system.skillCategories[category] ?? []).filter(skill => !filter
                || skill.name.toLowerCase().includes(filter)
                || game.i18n.localize(CONFIG.THEFADE.skillRanks[skill.rank]?.label).toLowerCase().includes(filter));
            return {
                category,
                label: game.i18n.localize(CONFIG.THEFADE.skillCategories[category]),
                trained: skills.filter(s => s.rank !== "untrained"),
                untrained: skills.filter(s => s.rank === "untrained"),
                count: skills.length,
                trainedCount: skills.filter(s => s.rank !== "untrained").length
            };
        }).filter(group => group.count).map(group => ({
            ...group,
            skills: [...group.trained, ...group.untrained].map(skill => ({
                ...skill,
                rankLabel: game.i18n.localize(CONFIG.THEFADE.skillRanks[skill.rank]?.label ?? skill.rank),
                attributeLabel: String(skill.attribute || "").split("_")
                    .map(key => game.i18n.localize(CONFIG.THEFADE.attributes[key]?.abbreviation ?? key)).join("/"),
                attributeName: game.i18n.localize(CONFIG.THEFADE.skillAttributes[skill.attribute] ?? skill.attribute),
                trained: skill.rank !== "untrained",
                source: context.source.skills[skill.key] ?? {}
            }))
        }));
    }

    async _prepareCombat(context) {
        const actor = this.document;
        const system = actor.system;
        context.attacks = this._prepareAttacks(actor.itemTypes.weapon);
        context.armor = await Promise.all(actor.itemTypes.armor.concat(actor.itemTypes.magicitem.filter(i => i.system.conflictsArmor))
            .sort((a, b) => a.name.localeCompare(b.name)).map(item => this._prepareItem(item)));
        context.protection = this._prepareProtection();
        context.anatomyOptions = CONFIG.THEFADE.anatomyPresets;
        context.alternateAnatomy = game.settings.get("thefade", "alternateAnatomyEnabled");
        context.stances = this._prepareStances();
        context.stanceSummary = system.stanceSummary;
        context.conditions = Object.entries(CONDITION_EFFECTS).map(([key, definition]) => {
            const state = system.conditions[key];
            return {
                key, label: definition.label, tiered: definition.tiered, active: state.active,
                intensity: state.intensity, immune: system.statusImmunityLocks?.[key] === true,
                img: CONFIG.THEFADE.conditionIcons[key],
                intensities: definition.tiered ? ["trivial", "moderate", "severe"].map(level => ({ level, label: game.i18n.localize(`THEFADE.Intensity.${level}`), active: state.active && state.intensity === level })) : []
            };
        });
        context.conditionSummary = system.conditionSummary;
        context.traitSummary = buildCombatTraitSummary(system);
        context.traitEditor = this.isEditMode ? this._prepareTraitEditor() : null;
        context.injuries = Object.entries(CONFIG.THEFADE.injuryLimbs).map(([key, label]) => ({ key, label, severed: system.injuries[key].severed }));
        context.disorders = system.mentalDisorders.map((d, index) => ({ ...d, index }));
        context.afflictions = await Promise.all(actor.itemTypes.disease.map(item => this._prepareItem(item)));
    }

    /** Universal abilities, resistances, and immunities with grant sources. */
    _prepareTraitEditor() {
        const traits = this.document._source.system.combatTraits;
        const granted = this.document.system.combatTraits.granted ?? {};
        const config = CONFIG.THEFADE;
        return {
            abilities: config.universalAbilities.map(category => ({
                key: category.key, label: category.label,
                abilities: category.abilities.map(ability => ({
                    ...ability, checked: traits.abilities?.[category.key]?.[ability.key] === true,
                    granted: granted.abilities?.[category.key]?.[ability.key] === true,
                    value: traits.abilityValues?.[category.key]?.[ability.key] ?? ability.amount?.default
                }))
            })),
            resistances: config.combatDamageTypes.map(t => ({ ...t, checked: traits.resistances?.[t.key] === true, granted: granted.resistances?.[t.key] === true })),
            damageImmunities: config.combatImmunityDamageTypes.map(t => ({ ...t, checked: traits.immunities?.damageTypes?.[t.key] === true, granted: granted.immunities?.damageTypes?.[t.key] === true })),
            statusImmunities: config.statusImmunities.map(t => ({ ...t, checked: traits.immunities?.statuses?.[t.key] === true, granted: granted.immunities?.statuses?.[t.key] === true })),
            effectImmunities: config.effectImmunities.map(t => ({ ...t, checked: traits.immunities?.effects?.[t.key] === true, granted: granted.immunities?.effects?.[t.key] === true })),
            absorption: config.combatImmunityDamageTypes.map(t => ({ ...t, checked: traits.absorption?.[t.key] === true, granted: granted.absorption?.[t.key] === true })),
            vulnerabilities: config.combatDamageTypes.map(t => ({
                ...t, checked: traits.vulnerabilities?.[t.key] === true, granted: granted.vulnerabilities?.[t.key] === true,
                severity: traits.vulnerabilitySeverity?.[t.key] ?? "minor"
            })),
            severityOptions: config.vulnerabilitySeverities,
            spellResistancePercent: traits.spellResistancePercent,
            notes: traits.notes,
            abilityNotes: traits.abilityNotes
        };
    }

    async _prepareInventory(context) {
        const actor = this.document;
        const families = CONFIG.THEFADE.itemFamilies;
        const powers = actor.itemTypes.magicitem;
        const slotRule = game.settings.get("thefade", "itemPowerSlotRule");
        const organized = organizeItemsOfPower(powers, slotRule);
        context.itemsOfPower = {
            slots: await Promise.all(organized.slots.map(async slot => ({
                ...slot,
                label: game.i18n.localize(`THEFADE.ItemOfPower.slot.${slot.key}`),
                items: await Promise.all(slot.items.map(item => this._prepareItem(item)))
            }))),
            unequipped: await Promise.all(organized.unequipped.map(item => this._prepareItem(item))),
            attunement: actor.system.attunement,
            count: powers.length
        };
        context.inventory = [];
        for (const key of INVENTORY_FAMILIES) {
            const types = families[key].types.filter(type => type !== "magicitem");
            const items = actor.items.filter(item => types.includes(item.type)).sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
            context.inventory.push({
                key, label: game.i18n.localize(families[key].label), types: types.join(","),
                items: await Promise.all(items.map(item => this._prepareItem(item))),
                weight: Math.round(items.reduce((sum, item) => sum + (item.system.carriedWeight || 0), 0) * 100) / 100
            });
        }
        context.encumbrance = actor.system.carryingCapacity;
        context.currency = actor.system.currency;
    }

    async _prepareAbilities(context) {
        const actor = this.document;
        const system = actor.system;
        const abilityList = (item, map, kind) => Object.entries(map ?? {}).map(([id, ability]) => ({
            id, sourceId: item.id, kind, ...ability, active: ability.activation === "active",
            bonusCount: ability.bonuses?.length ?? 0
        }));
        const paths = actor.itemTypes.path.concat(actor.itemTypes.monsterpath).sort((a, b) => a.system.tier - b.system.tier);
        context.paths = await Promise.all(paths.map(async path => ({
            ...(await this._prepareItem(path)),
            abilities: abilityList(path, path.system.abilities, "path")
        })));
        const species = actor.itemTypes.species.concat(actor.itemTypes.monsterspecies);
        context.species = await Promise.all(species.map(async item => ({
            ...(await this._prepareItem(item)),
            abilities: abilityList(item, item.system.speciesAbilities, "species")
        })));
        context.speciesManual = system.species.manualEntry || !species.length;
        context.creatureTypeOptions = CONFIG.THEFADE.creatureTypes;
        context.sizeOptions = CONFIG.THEFADE.sizes;
        context.subtypeSelector = buildCreatureSubtypeSelector(system, "character");
        context.creatureRules = getCreatureRuleSources(system, "character");
        context.talents = await Promise.all(actor.itemTypes.talent.map(item => this._prepareItem(item)));
        context.traits = await Promise.all(actor.itemTypes.trait.map(item => this._prepareItem(item)));
        context.precepts = await Promise.all(actor.itemTypes.precept.map(item => this._prepareItem(item)));
        context.temporaryBonuses = system.temporaryBonuses;
        context.progression = system.progression;
    }

    async _prepareMagic(context) {
        const actor = this.document;
        const system = actor.system;
        context.ignition = getIgnitionStatus(actor);
        const spells = actor.itemTypes.spell.sort((a, b) => a.name.localeCompare(b.name));
        const schools = new Map();
        for (const spell of spells) {
            const key = spell.system.schoolLabel;
            if (!schools.has(key)) schools.set(key, { label: key, dark: spell.system.isDark, spells: [] });
            schools.get(key).spells.push(await this._prepareItem(spell));
        }
        context.spellSchools = [...schools.values()];
        context.spellCount = spells.length;
        const spellcasting = system.skillPools.spellcasting;
        context.spellcasting = spellcasting ? { dice: spellcasting.dice, rank: game.i18n.localize(CONFIG.THEFADE.skillRanks[spellcasting.rank].label) } : null;
        context.darkMagic = {
            ...system.darkMagic,
            stage: game.i18n.localize(CONFIG.THEFADE.addictionStages[system.darkMagic.addictionLevel] ?? "THEFADE.Addiction.none"),
            over: system.darkMagic.currentSin > system.darkMagic.sinThreshold,
            pct: Math.min(100, Math.round((system.darkMagic.currentSin / Math.max(1, system.darkMagic.sinThreshold)) * 100))
        };
        context.addictionOptions = Object.fromEntries(Object.entries(CONFIG.THEFADE.addictionStages).map(([k, v]) => [k, game.i18n.localize(v)]));
        context.aura = system.aura;
        context.auraOptions = CONFIG.THEFADE.aura;
        context.staves = await Promise.all(actor.items.filter(i => ["staff", "wand"].includes(i.type)).map(item => this._prepareItem(item)));
    }

    async _prepareBiography(context) {
        const actor = this.document;
        const system = actor.system;
        context.enrichedBiography = await this._enrich(system.biography);
        context.enrichedNotes = await this._enrich(system.notes);
        context.fateEnabled = game.settings.get("thefade", "fatePointsEnabled");
        context.mutations = await Promise.all(actor.itemTypes.mutation.map(item => this._prepareItem(item)));
        context.heritages = await Promise.all(actor.itemTypes.heritage.map(item => this._prepareItem(item)));
        context.downtime = await Promise.all(actor.itemTypes.downtime.map(item => this._prepareItem(item)));
        context.details = system.personalDetails;
        context.sexOptions = { "": "—", male: game.i18n.localize("THEFADE.Bio.male"), female: game.i18n.localize("THEFADE.Bio.female"), other: game.i18n.localize("THEFADE.Bio.other") };
    }

    /* -------------------------------------------- */
    /*  Rendering hooks                             */
    /* -------------------------------------------- */

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        // Skill filter (text box): live filtering without re-render.
        const filter = this.element.querySelector("input[data-skill-filter]");
        filter?.addEventListener("input", event => {
            this._skillFilter = event.currentTarget.value;
            const query = this._skillFilter.toLowerCase();
            for (const row of this.element.querySelectorAll(".skill-row[data-skill-name]")) {
                row.hidden = !!query && !row.dataset.skillName.toLowerCase().includes(query) && !row.dataset.rank.toLowerCase().includes(query);
            }
            for (const group of this.element.querySelectorAll(".skill-group")) {
                group.hidden = ![...group.querySelectorAll(".skill-row")].some(row => !row.hidden);
            }
        });
    }

    /** Items of Power respect slot capacity when equipped. @override */
    async _toggleEquipped(item) {
        if (item.type === "magicitem" && !item.system.equipped) {
            const check = canEquipItemPower(this.document.itemTypes.magicitem, item, game.settings.get("thefade", "itemPowerSlotRule"));
            if (!check.allowed) return ui.notifications.warn(check.reason);
        }
        const update = { "system.equipped": !item.system.equipped };
        if (item.type === "magicitem" && item.system.equipped) update["system.attunement"] = false;
        return item.update(update);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static #onRollAttribute(event, target) {
        return this.document.rollAttribute(target.dataset.attribute, { event });
    }

    static #onRollSkill(event, target) {
        return this.document.rollSkill(target.closest("[data-skill]").dataset.skill, { event });
    }

    static #onRollAttack(event, target) {
        const item = this._getItem(target);
        return item ? this.document.rollAttack(item, { event }) : null;
    }

    static #onRollInitiative(event) {
        return this.document.rollInitiative({ createCombatants: true, rerollInitiative: event.shiftKey });
    }

    static #onRollPool(event, target) {
        const input = this.element.querySelector("input[name=poolDice]");
        const dice = Math.max(1, Number(input?.value) || 1);
        return this.document.rollPool(dice, { event });
    }

    static #onCastSpell(event, target) {
        const item = this._getItem(target);
        return item ? this.document.castSpell(item, { event }) : null;
    }

    static #onSetStance(event, target) {
        if (!this.isEditable) return;
        const stance = target.dataset.stance;
        return this.document.update({ "system.activeStance": this.document.system.activeStance === stance ? "none" : stance });
    }

    static #onToggleCondition(event, target) {
        if (!this.isEditable) return;
        return this.document.setCondition(target.dataset.condition);
    }

    static #onSetIntensity(event, target) {
        if (!this.isEditable) return;
        const { condition, intensity } = target.dataset;
        const state = this.document.system.conditions[condition];
        if (state.active && state.intensity === intensity) return this.document.setCondition(condition, { active: false });
        return this.document.setCondition(condition, { active: true, intensity });
    }

    static async #onClearCombatState() {
        if (!this.isEditable) return;
        return this.document.clearCombatState();
    }

    static async #onDamageLocation(event, target) {
        if (!this.isEditable) return;
        const location = target.dataset.location;
        const amount = event.shiftKey ? 1 : await DialogV2.prompt({
            window: { title: game.i18n.format("THEFADE.Protection.damageTitle", { location: locationLabel(location) }) },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Protection.amount")}</label><div class="form-fields"><input type="number" name="amount" value="1" min="1" autofocus></div></div>`,
            ok: { label: "THEFADE.Protection.apply", callback: (ev, button) => Math.max(0, Number(button.form.elements.amount.value) || 0) },
            rejectClose: false
        });
        if (!amount) return;
        const absorbed = await reduceProtection(this.document, location, amount);
        if (absorbed < amount) ui.notifications.info(game.i18n.format("THEFADE.Protection.overflow", { overflow: amount - absorbed }));
    }

    static #onRestoreLocation(event, target) {
        if (!this.isEditable) return;
        return resetProtection(this.document, target.dataset.location || null);
    }

    static async #onRollHitLocation(event) {
        const preset = game.settings.get("thefade", "alternateAnatomyEnabled") ? this.document.system.anatomy.preset : "humanoid";
        const result = await rollHitLocation("front", preset);
        await ChatMessage.implementation.create({
            speaker: ChatMessage.implementation.getSpeaker({ actor: this.document }),
            content: `<div class="thefade chat-note"><p>${game.i18n.format("THEFADE.Protection.hitLocation", { roll: result.roll, location: result.label ?? locationLabel(result.location) })}</p></div>`,
            rolls: result.rolls ?? []
        });
    }

    static async #onAddCustomSkill(event, target) {
        const type = target.dataset.type;
        const name = await DialogV2.prompt({
            window: { title: game.i18n.format("THEFADE.Skill.addTitle", { type: game.i18n.localize(`THEFADE.Skill.type.${type}`) }) },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Skill.subtype")}</label><div class="form-fields"><input type="text" name="subtype" autofocus></div></div>`,
            ok: { label: "THEFADE.Skill.add", callback: (ev, button) => button.form.elements.subtype.value.trim() },
            rejectClose: false
        });
        if (name) await createCustomSkill(this.document, type, name, "untrained");
    }

    static async #onDeleteSkill(event, target) {
        const key = target.closest("[data-skill]").dataset.skill;
        const skill = this.document.system.skillPools[key];
        if (!skill?.isCustom) return;
        const confirmed = event.shiftKey || await DialogV2.confirm({
            window: { title: game.i18n.format("THEFADE.Skill.deleteTitle", { name: skill.name }) },
            content: `<p>${game.i18n.format("THEFADE.Skill.deleteConfirm", { name: foundry.utils.escapeHTML(skill.name) })}</p>`,
            classes: ["thefade"], rejectClose: false
        });
        if (confirmed) await this.document.update({ [`system.skills.-=${key}`]: null });
    }

    static async #onUseAbility(event, target) {
        const { sourceId, abilityId, kind } = target.closest("[data-ability-id]").dataset;
        if (kind === "rule") {
            const source = this.document.system.creatureRuleSources?.find(s => s.id === sourceId);
            const ability = source?.abilities.find(a => a.id === abilityId);
            if (ability) return activateAbility(this.document, ability, { id: source.id, label: source.label, kind: source.kind });
            return;
        }
        const item = this.document.items.get(sourceId);
        const map = kind === "path" ? item?.system.abilities : item?.system.speciesAbilities;
        const ability = map?.[abilityId];
        if (ability) return activateAbility(this.document, { id: abilityId, ...ability }, { id: item.id, label: item.name, kind: item.typeLabel });
    }

    static #onRemoveTemporaryBonus(event, target) {
        const id = target.dataset.bonusId;
        return this.document.update({ "system.temporaryBonuses": this.document._source.system.temporaryBonuses.filter(b => b.id !== id) });
    }

    static #onTakeRest() {
        return this.document.takeRest();
    }

    static async #onRestDaily(event) {
        const confirmed = event.shiftKey || await DialogV2.confirm({
            window: { title: game.i18n.localize("THEFADE.Rest.dailyTitle") },
            content: `<p>${game.i18n.localize("THEFADE.Rest.dailyConfirm")}</p>`,
            classes: ["thefade"], rejectClose: false
        });
        if (confirmed) return this.document.restDaily();
    }

    static #onRollAddiction(event) {
        return this.document.rollAddictionCheck({ event });
    }

    static async #onAddDisorder() {
        const result = await DialogV2.input({
            window: { title: game.i18n.localize("THEFADE.Injury.addDisorder") },
            classes: ["thefade"],
            content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Injury.disorderType")}</label><div class="form-fields">
                <select name="type"><option value="minor">${game.i18n.localize("THEFADE.Injury.minor")}</option><option value="major">${game.i18n.localize("THEFADE.Injury.major")}</option></select></div></div>
                <div class="form-group"><label>${game.i18n.localize("THEFADE.Injury.disorderName")}</label><div class="form-fields"><input type="text" name="name" autofocus></div></div>`,
            ok: { label: "THEFADE.Injury.add" },
            rejectClose: false
        });
        if (!result?.name) return;
        return this.document.update({ "system.mentalDisorders": [...this.document._source.system.mentalDisorders, { type: result.type, name: result.name }] });
    }

    static #onRemoveDisorder(event, target) {
        const index = Number(target.dataset.index);
        const list = [...this.document._source.system.mentalDisorders];
        list.splice(index, 1);
        return this.document.update({ "system.mentalDisorders": list });
    }

    static async #onAttune(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        const attuning = !item.system.attunement;
        const { current, max } = this.document.system.attunement;
        if (attuning && current >= max) return ui.notifications.warn(game.i18n.format("THEFADE.ItemOfPower.attunementFull", { max }));
        return item.update({ "system.attunement": attuning });
    }

    static async #onOpposedRoll() {
        const { openOpposedRollDialog } = await import("../rolls/opposed.mjs");
        return openOpposedRollDialog(this.document);
    }

    static async #onAidAnother() {
        const { openAidAnotherDialog } = await import("../rolls/opposed.mjs");
        return openAidAnotherDialog(this.document);
    }

    static async #onRollAttributes() {
        const { rollAttributeArray } = await import("../rolls/creation.mjs");
        return rollAttributeArray(this.document);
    }

    static #onFate(event, target) {
        const delta = Number(target.dataset.delta) || 0;
        if (delta > 0 && !game.user.isGM) return;
        const points = Math.max(0, this.document.system.fate.points + delta);
        return this.document.update({ "system.fate.points": points });
    }

    static async #onIgnite(event, target) {
        const { startIgnition, endIgnition } = await import("../rules/ignition.mjs");
        return target.dataset.end ? endIgnition(this.document) : startIgnition(this.document);
    }

    static async #onHeritage() {
        const { calculateHeritage } = await import("../rolls/creation.mjs");
        return calculateHeritage(this.document);
    }

    static async #onRollMutation(event, target) {
        const { rollMutationForActor } = await import("../rolls/creation.mjs");
        return rollMutationForActor(this.document, target.dataset.severity || "minor");
    }

    static #onDowntimeProgress(event, target) {
        const item = this._getItem(target);
        if (!item) return;
        const delta = Number(target.dataset.delta) || 1;
        return item.update({ "system.progress": Math.max(0, Math.min(item.system.target, item.system.progress + delta)) });
    }
}
