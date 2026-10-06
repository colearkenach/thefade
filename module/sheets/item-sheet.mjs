// One item sheet for every item type: a shared header, a Details tab
// (hand-built for rich types, generated from the data model for simple
// ones), a Description tab, and type-specific tabs where needed.
import { MECHANICAL_BONUS_TYPE_OPTIONS, MECHANICAL_BONUS_STAT_OPTIONS, MECHANICAL_BONUS_DEFENSE_OPTIONS,
    MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS, MECHANICAL_BONUS_IMMUNITY_OPTIONS, MECHANICAL_BONUS_ABSORPTION_OPTIONS,
    MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS, MECHANICAL_BONUS_VULNERABILITY_SEVERITY_OPTIONS, getMechanicalBonusAmountConfig,
    normalizeMechanicalBonus } from "../rules/mechanical-bonuses.js";
import { buildWeaponQualitySelector, buildWeaponDamageProfile } from "../rules/weapon-rules.js";
import { getCreatureRuleSources, buildCreatureSubtypeSelector } from "../rules/creature-rules.js";
import { getItemPowerSlotOptions } from "../rules/item-power-rules.js";
import { SPELL_STATUS_OPTIONS, SPELL_STATUS_INTENSITY_OPTIONS } from "../rules/spell-rules.js";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

/** Types with a hand-built Details template; everything else is generated from the schema. */
const DETAILS_TEMPLATES = {
    weapon: "weapon", armor: "armor", spell: "spell", magicitem: "magicitem",
    path: "path", monsterpath: "path", species: "species", monsterspecies: "species",
    talent: "feature", trait: "feature", precept: "feature", skill: "skill",
    disease: "disease", trap: "hazard", hazard: "hazard", downtime: "downtime", fleshcraft: "fleshcraft"
};

/** Extra tabs per type: [id, icon]. */
const EXTRA_TABS = {
    weapon: [["enhancements", "fa-solid fa-gem"]],
    armor: [["enhancements", "fa-solid fa-gem"]],
    spell: [["outcomes", "fa-solid fa-burst"]],
    path: [["abilities", "fa-solid fa-star"], ["skills", "fa-solid fa-list-check"]],
    monsterpath: [["abilities", "fa-solid fa-star"], ["skills", "fa-solid fa-list-check"]],
    species: [["abilities", "fa-solid fa-star"], ["lore", "fa-solid fa-feather"]],
    monsterspecies: [["abilities", "fa-solid fa-star"], ["monster", "fa-solid fa-dragon"], ["lore", "fa-solid fa-feather"]],
    magicitem: [["powers", "fa-solid fa-gem"]],
    talent: [["powers", "fa-solid fa-gem"]],
    precept: [["powers", "fa-solid fa-gem"]]
};

/** Select options for string fields of generated forms, keyed by type then field. */
function generatedChoices(type) {
    const c = CONFIG.THEFADE;
    return {
        clothing: { clothingType: c.clothing.types, protectionLevel: c.clothing.protectionLevels, quality: c.clothing.qualities, wornLocation: c.clothing.locations },
        poison: { poisonType: c.poison.administration, onset: c.poison.onset, category: c.poison.categories },
        communication: { complexity: c.communicationComplexity },
        alchemical: { skill: c.alchemicalSkills },
        dream: { dreamType: c.dreamTypes },
        mount: { size: c.sizes },
        vehicle: { size: c.sizes, vehicleType: c.vehicleTypes },
        mutation: { severity: c.mutationSeverities },
        heritage: { heritageType: c.heritageTypes }
    }[type] ?? {};
}

/** Schema fields shown in the physical strip rather than the generated form. */
const PHYSICAL_KEYS = ["weight", "price", "quantity", "equipped", "technological", "technologyAttunement"];
const HIDDEN_KEYS = new Set(["description", "source", ...PHYSICAL_KEYS]);

/**
 * Rebuild submitted index-keyed array rows on top of the stored rows,
 * recursing through schema, typed-object, and array fields. Mechanical bonus
 * rows are normalized so a changed type never keeps a stale target.
 */
function mergeArrayRows(submitted, stored, field) {
    const { ArrayField, SchemaField, TypedObjectField } = foundry.data.fields;
    if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) return submitted;
    if (field instanceof ArrayField) {
        const rows = foundry.utils.deepClone(Array.isArray(stored) ? stored : []);
        for (const [key, value] of Object.entries(submitted)) {
            const index = Number(key);
            if (!Number.isInteger(index)) continue;
            const merged = mergeArrayRows(value, rows[index], field.element);
            rows[index] = merged && typeof merged === "object" && !Array.isArray(merged)
                ? foundry.utils.mergeObject(rows[index] ?? {}, merged, { inplace: false })
                : merged;
        }
        const element = field.element;
        if (element instanceof SchemaField && element.fields.severity && element.fields.target) {
            return rows.map(row => row && normalizeMechanicalBonus(row));
        }
        return rows;
    }
    if (field instanceof SchemaField || field?.fields) {
        const fields = field.fields ?? {};
        for (const [key, value] of Object.entries(submitted)) {
            if (fields[key]) submitted[key] = mergeArrayRows(value, stored?.[key], fields[key]);
        }
        return submitted;
    }
    if (field instanceof TypedObjectField) {
        for (const [key, value] of Object.entries(submitted)) {
            submitted[key] = mergeArrayRows(value, stored?.[key], field.element);
        }
    }
    return submitted;
}

export default class TheFadeItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["thefade", "item"],
        position: { width: 620, height: 680 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            addRow: TheFadeItemSheet.#onAddRow,
            removeRow: TheFadeItemSheet.#onRemoveRow,
            addAbility: TheFadeItemSheet.#onAddAbility,
            removeAbility: TheFadeItemSheet.#onRemoveAbility,
            addQuality: TheFadeItemSheet.#onAddQuality,
            removeQuality: TheFadeItemSheet.#onRemoveQuality,
            removeSubtype: TheFadeItemSheet.#onRemoveSubtype,
            addSubtype: TheFadeItemSheet.#onAddSubtype,
            removeAttackWeapon: TheFadeItemSheet.#onRemoveAttackWeapon,
            use: TheFadeItemSheet.#onUse,
            resetUses: TheFadeItemSheet.#onResetUses,
            toChat: TheFadeItemSheet.#onToChat,
            rollHazard: TheFadeItemSheet.#onRollHazard,
            craft: TheFadeItemSheet.#onCraft
        }
    };

    static PARTS = {
        header: { template: "systems/thefade/templates/item/header.hbs" },
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        details: { template: "systems/thefade/templates/item/details.hbs", scrollable: [""] },
        description: { template: "systems/thefade/templates/item/description.hbs", scrollable: [""] },
        enhancements: { template: "systems/thefade/templates/item/tabs/enhancements.hbs", scrollable: [""] },
        outcomes: { template: "systems/thefade/templates/item/tabs/outcomes.hbs", scrollable: [""] },
        abilities: { template: "systems/thefade/templates/item/tabs/abilities.hbs", scrollable: [""] },
        skills: { template: "systems/thefade/templates/item/tabs/path-skills.hbs", scrollable: [""] },
        monster: { template: "systems/thefade/templates/item/tabs/monster.hbs", scrollable: [""] },
        lore: { template: "systems/thefade/templates/item/tabs/species-lore.hbs", scrollable: [""] },
        powers: { template: "systems/thefade/templates/item/tabs/powers.hbs", scrollable: [""] }
    };

    /** @override */
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        const allowed = new Set(["header", "tabs", "details", "description", ...(EXTRA_TABS[this.document.type] ?? []).map(([id]) => id)]);
        for (const key of Object.keys(parts)) if (!allowed.has(key)) delete parts[key];
        return parts;
    }

    /** @override */
    _getTabsConfig(group) {
        if (group !== "primary") return super._getTabsConfig(group);
        const extra = (EXTRA_TABS[this.document.type] ?? []).map(([id, icon]) => ({ id, icon }));
        return {
            tabs: [{ id: "details", icon: "fa-solid fa-sliders" }, ...extra, { id: "description", icon: "fa-solid fa-feather-pointed" }],
            initial: "details",
            labelPrefix: "THEFADE.ItemSheet.Tab"
        };
    }

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const item = this.document;
        Object.assign(context, {
            item,
            system: item.system,
            source: item._source.system,
            systemFields: item.system.schema.fields,
            config: CONFIG.THEFADE,
            type: item.type,
            typeLabel: item.typeLabel,
            familyLabel: this.#familyLabel(),
            chips: item.chips,
            physical: item.system.isPhysical,
            owned: !!item.actor,
            tabs: this._prepareTabs("primary"),
            resource: item.resource,
            techAttunement: game.settings.get("thefade", "itemPowerAttunementRule") === "technology",
            bonusTypeOptions: MECHANICAL_BONUS_TYPE_OPTIONS,
            severityOptions: MECHANICAL_BONUS_VULNERABILITY_SEVERITY_OPTIONS
        });
        return context;
    }

    /** Enchantment, strengthening and modification data for weapons and armor. */
    #prepareEnhancements() {
        const item = this.document;
        const system = item.system;
        const source = item._source.system;
        const isWeapon = item.type === "weapon";
        const config = CONFIG.THEFADE;
        const slotsUsed = source.modifications.length;
        return {
            natural: isWeapon && system.isNatural,
            increaseKey: isWeapon ? "damageIncrease" : "apIncrease",
            increaseValue: isWeapon ? source.damageIncrease : source.apIncrease,
            increaseOptions: isWeapon ? config.weaponStrengthening : config.armorStrengthening,
            basePrice: isWeapon ? (config.weaponEnchantBasePrices[source.skill] ?? config.weaponEnchantBasePrices.default) : config.armorEnchantBasePrice,
            radiationImmune: isWeapon && ["Bow", "Firearm", "Heavy Weaponry"].includes(source.skill),
            totalCost: (Number(source.enchantmentPrice) || 0) + (Number(source.strengtheningPrice) || 0),
            slotsMax: system.modSlots,
            slotsUsed,
            overCapacity: slotsUsed > system.modSlots,
            powers: source.enchantmentPowers.map((row, index) => ({ ...row, index })),
            mods: source.modifications.map((row, index) => ({ ...row, index }))
        };
    }

    #familyLabel() {
        const family = Object.values(CONFIG.THEFADE.itemFamilies).find(f => f.types.includes(this.document.type));
        return family ? game.i18n.localize(family.label) : "";
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (context.tabs?.[partId]) context.tab = context.tabs[partId];
        const item = this.document;
        switch (partId) {
            case "details":
                context.detailsTemplate = `systems/thefade/templates/item/details/${DETAILS_TEMPLATES[item.type] ?? "generated"}.hbs`;
                context.generatedFields = DETAILS_TEMPLATES[item.type] ? [] : this.#generatedFields();
                await this.#prepareDetails(context);
                break;
            case "description":
                context.enrichedDescription = await TextEditor.enrichHTML(item.system.description, { relativeTo: item, secrets: item.isOwner });
                break;
            case "enhancements":
                context.enhance = this.#prepareEnhancements();
                break;
            case "outcomes":
                context.statusRows = context.source.statusEffects.map((row, index) => ({ ...row, index }));
                context.buffRows = context.source.buffEffects.map((row, index) => ({ ...row, index }));
                context.statusOptions = SPELL_STATUS_OPTIONS;
                context.intensityOptions = SPELL_STATUS_INTENSITY_OPTIONS;
                context.attackEffectRows = item.system.attackTargets.map(key => ({
                    key, label: game.i18n.localize(CONFIG.THEFADE.spellDefenses[key] ?? key), value: context.source.attackEffects[key] ?? ""
                }));
                break;
            case "abilities":
                context.abilities = this.#prepareAbilities();
                break;
            case "skills": {
                const config = CONFIG.THEFADE;
                context.pathSkills = this.#preparePathSkills();
                context.entryTypeOptions = Object.fromEntries(Object.values(config.pathSkillTypes).map(v => [v, `THEFADE.PathSkill.entry.${v}`]));
                context.customTypeOptions = { craft: "THEFADE.PathSkill.craft", lore: "THEFADE.PathSkill.lore", perform: "THEFADE.PathSkill.perform" };
                context.rankOptions = Object.fromEntries(Object.entries(config.skillRanks).filter(([k]) => k !== "untrained").map(([k, v]) => [k, v.label]));
                context.skillNames = config.coreSkills.map(s => s.name).sort((a, b) => a.localeCompare(b));
                break;
            }
            case "monster":
                context.sizeRows = Object.entries(CONFIG.THEFADE.sizes).map(([key, label]) => ({ key, label, rule: context.source.sizeRules[key] }));
                context.attacks = context.source.standardAttacks.map((entry, index) => ({ ...entry, index }));
                context.ndRows = Object.entries(CONFIG.THEFADE.naturalDeflectionRatings).map(([key, label]) => {
                    const rule = context.source.naturalDeflectionTypes[key];
                    return { key, label, rule, parts: ["head", "body", "arms", "legs"].map(part => ({ part, value: rule.parts[part] })) };
                });
                break;
            case "powers":
                context.bonuses = this.#prepareBonuses(context.source.bonuses ?? [], "system.bonuses");
                if (item.type === "magicitem") context.grants = this.#prepareGrants();
                break;
        }
        return context;
    }

    /** Form groups generated from the data model for simple item types. */
    #generatedFields() {
        const item = this.document;
        const choices = generatedChoices(item.type);
        const fields = item.system.schema.fields;
        return Object.entries(fields).filter(([key, field]) => !HIDDEN_KEYS.has(key) && !(field instanceof foundry.data.fields.SchemaField)
            && !(field instanceof foundry.data.fields.ArrayField) && !(field instanceof foundry.data.fields.ObjectField)).map(([key, field]) => {
            const value = item._source.system[key];
            const options = choices[key] ? { ...choices[key] } : null;
            if (options && value && !(value in options)) options[value] = value;
            const long = field instanceof foundry.data.fields.StringField && ["effect", "specialAbilities", "specialFeatures", "magicalProperties",
                "sideEffects", "overdose", "addiction", "specialEffect", "naturalWeapons", "spellDescription", "creaturesAffected", "specialProperties"].includes(key);
            return { key, field, value, options, long, wide: long };
        });
    }

    async #prepareDetails(context) {
        const item = this.document;
        const system = item.system;
        switch (item.type) {
            case "weapon": {
                context.qualities = buildWeaponQualitySelector(system);
                context.damageTypeOptions = CONFIG.THEFADE.damageTypes;
                context.damageRows = context.source.damageComponents.map((row, index) => ({ ...row, index }));
                if (item.actor) {
                    const profile = buildWeaponDamageProfile(item.actor, system);
                    const attack = item.actor.getWeaponAttackDice(item);
                    context.wielded = { damage: profile.display, total: profile.total, dice: attack.dice, attributeBonus: profile.attributeBonus, attributeSource: profile.attributeSource };
                }
                break;
            }
            case "spell":
                context.damageTypeOptions = Object.fromEntries(Object.entries(CONFIG.THEFADE.damageTypes).filter(([k]) => !["BoP", "BP", "SP", "SoP", "SoB"].includes(k)));
                context.damageRows = context.source.damageComponents.map((row, index) => ({ ...row, index }));
                context.attackFlags = Object.keys(CONFIG.THEFADE.spellDefenses).map(key => ({
                    key, label: game.i18n.localize(CONFIG.THEFADE.spellDefenses[key]), checked: system.attackTargets.includes(key)
                }));
                break;
            case "species":
            case "monsterspecies":
                context.subtypeSelector = buildCreatureSubtypeSelector(system, "species");
                context.ruleSources = getCreatureRuleSources(system, "species");
                context.visionOptions = { normal: "THEFADE.Vision.normal", enhanced: "THEFADE.Vision.enhanced", darkvision: "THEFADE.Vision.darkvision" };
                context.movementKeys = ["land", "fly", "swim", "climb", "burrow"];
                break;
            case "magicitem":
                context.slotOptions = getItemPowerSlotOptions(game.settings.get("thefade", "itemPowerSlotRule"), system.slot);
                context.attunementEnabled = game.settings.get("thefade", "itemPowerAttunementRule") !== "removed";
                break;
            case "alchemical":
                context.canCraft = !!item.actor;
                break;
            case "trap":
            case "hazard":
                context.canRoll = game.user.isGM;
                break;
        }
    }

    /** Path and species abilities, keyed by id, with their bonus rows. */
    #prepareAbilities() {
        const item = this.document;
        const key = ["species", "monsterspecies"].includes(item.type) ? "speciesAbilities" : "abilities";
        const map = item._source.system[key] ?? {};
        return Object.entries(map).map(([id, ability]) => ({
            id, ...ability, path: `system.${key}.${id}`,
            bonuses: this.#prepareBonuses(ability.bonuses ?? [], `system.${key}.${id}.bonuses`)
        }));
    }

    #preparePathSkills() {
        return this.document._source.system.pathSkills.map((entry, index) => ({
            ...entry, index,
            isChoice: (entry.system.entryType ?? "specific").startsWith("choose"),
            isCategory: entry.system.entryType === "choose-category",
            isCustom: entry.system.entryType === "specific-custom"
        }));
    }

    /** Bonus rows with only the target control their type needs. */
    #prepareBonuses(rows, basePath) {
        const targets = {
            stat: MECHANICAL_BONUS_STAT_OPTIONS, defense: MECHANICAL_BONUS_DEFENSE_OPTIONS,
            resistance: MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS, vulnerability: MECHANICAL_BONUS_DAMAGE_TYPE_OPTIONS,
            immunity: MECHANICAL_BONUS_IMMUNITY_OPTIONS, absorption: MECHANICAL_BONUS_ABSORPTION_OPTIONS,
            universalAbility: MECHANICAL_BONUS_UNIVERSAL_ABILITY_OPTIONS
        };
        return rows.map((row, index) => {
            const bonus = normalizeMechanicalBonus(row);
            const amount = getMechanicalBonusAmountConfig(bonus);
            return {
                ...bonus, index, path: `${basePath}.${index}`,
                targetOptions: targets[bonus.type] ?? null,
                textTarget: ["skill", "attack", "damage"].includes(bonus.type),
                hasValue: !!amount,
                amount,
                isVulnerability: bonus.type === "vulnerability"
            };
        });
    }

    #prepareGrants() {
        const grants = this.document._source.system.traitGrants;
        const config = CONFIG.THEFADE;
        return {
            abilities: config.universalAbilities.map(category => ({
                key: category.key, label: category.label,
                abilities: category.abilities.map(a => ({ ...a, checked: grants.abilities?.[category.key]?.[a.key] === true }))
            })),
            resistances: config.combatDamageTypes.map(t => ({ ...t, checked: grants.resistances?.[t.key] === true })),
            damageImmunities: config.combatImmunityDamageTypes.map(t => ({ ...t, checked: grants.immunities?.damageTypes?.[t.key] === true })),
            statusImmunities: config.statusImmunities.map(t => ({ ...t, checked: grants.immunities?.statuses?.[t.key] === true })),
            effectImmunities: config.effectImmunities.map(t => ({ ...t, checked: grants.immunities?.effects?.[t.key] === true })),
            spellResistancePercent: grants.spellResistancePercent,
            customImmunities: grants.customImmunities,
            notes: grants.notes
        };
    }

    /** Shared option tables for templates. */
    static get bonusTypeOptions() {
        return MECHANICAL_BONUS_TYPE_OPTIONS;
    }

    /**
     * Forms submit array rows as index-keyed objects holding only the inputs
     * shown; merge them over the stored rows so hidden row fields survive.
     * @override
     */
    _processFormData(event, form, formData) {
        const data = super._processFormData(event, form, formData);
        if (data.system) data.system = mergeArrayRows(data.system, this.document._source.system, this.document.system.schema);
        return data;
    }

    /** @override */
    _prepareSubmitData(event, form, formData, updateData) {
        const data = super._prepareSubmitData(event, form, formData, updateData);
        const type = this.document.type;
        if ((type === "weapon" || type === "armor") && data.system) {
            const system = data.system;
            const stored = this.document._source.system;
            const config = CONFIG.THEFADE;
            // Enchanting suggests the base price (Core pp. 230–231); strengthening is priced by its size.
            if (system.isEnchanted === true && !stored.isEnchanted && !stored.enchantmentPrice && !Number(system.enchantmentPrice)) {
                system.enchantmentPrice = type === "weapon"
                    ? (config.weaponEnchantBasePrices[stored.skill] ?? config.weaponEnchantBasePrices.default)
                    : config.armorEnchantBasePrice;
            }
            const key = type === "weapon" ? "damageIncrease" : "apIncrease";
            if (key in system && Number(system[key]) !== stored[key]) {
                const increase = Number(system[key]) || 0;
                system.strengtheningPrice = type === "weapon" ? increase * increase * 1000 : increase * 500;
                if (type === "armor") system.currentAP = (Number(system.ap ?? stored.ap) || 0) + increase;
            }
        }
        // Spell attack defenses are edited as checkboxes; store them pipe-delimited.
        if (this.document.type === "spell" && form.querySelector("[data-attack-flags]")) {
            const flags = [...form.querySelectorAll("[data-attack-flag]")].filter(input => input.checked).map(input => input.dataset.attackFlag);
            foundry.utils.setProperty(data, "system.attack", flags.join("|"));
        }
        return data;
    }

    /* -------------------------------------------- */
    /*  Drag & drop                                 */
    /* -------------------------------------------- */

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        if (data.type !== "Item") return;
        const dropped = await Item.implementation.fromDropData(data);
        if (!dropped || !this.isEditable) return;
        const item = this.document;
        // Paths: dropping a skill adds it as a granted skill.
        if (["path", "monsterpath"].includes(item.type) && dropped.type === "skill") {
            const entries = item.system.toObject().pathSkills;
            entries.push({ _id: foundry.utils.randomID(16), name: dropped.name, type: "skill", system: { rank: "learned", category: dropped.system.category, attribute: dropped.system.attribute, entryType: "specific" } });
            return item.update({ "system.pathSkills": entries });
        }
        // Monster species: dropping a weapon adds it as a standard attack.
        if (item.type === "monsterspecies" && dropped.type === "weapon") {
            const attacks = item.system.toObject().standardAttacks;
            attacks.push({ id: foundry.utils.randomID(16), mode: "grant", weapons: [{ ...dropped.toObject(), _id: undefined, id: foundry.utils.randomID(16) }] });
            return item.update({ "system.standardAttacks": attacks });
        }
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        new foundry.applications.ux.DragDrop.implementation({
            dropSelector: null,
            permissions: { drop: () => this.isEditable },
            callbacks: { drop: this._onDrop.bind(this) }
        }).bind(this.element);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    /** Add a row to an array field: data-path="system.damageComponents" data-template="damage". */
    static async #onAddRow(event, target) {
        const { path, template } = target.dataset;
        const rows = foundry.utils.deepClone(foundry.utils.getProperty(this.document._source, path) ?? []);
        const defaults = {
            damage: { id: foundry.utils.randomID(16), amount: 0, type: this.document.type === "spell" ? "Ut" : "S" },
            bonus: { id: foundry.utils.randomID(16), type: "skill", target: "", value: 1, severity: "minor" },
            status: { id: foundry.utils.randomID(16), status: "pain", intensity: "trivial", duration: "", notes: "" },
            buff: { id: foundry.utils.randomID(16), name: "", target: "", duration: "", description: "" },
            power: { id: foundry.utils.randomID(16), name: "", description: "", isDarkMagic: false },
            mod: { id: foundry.utils.randomID(16), name: "", description: "", price: 0 },
            pathSkill: { _id: foundry.utils.randomID(16), name: "", type: "skill", system: { rank: "learned", entryType: "specific", chooseCount: 1 } },
            attack: { id: foundry.utils.randomID(16), mode: "grant", weapons: [] }
        };
        rows.push(defaults[template] ?? {});
        return this.document.update({ [path]: rows });
    }

    static async #onRemoveRow(event, target) {
        const { path, index } = target.dataset;
        const rows = foundry.utils.deepClone(foundry.utils.getProperty(this.document._source, path) ?? []);
        rows.splice(Number(index), 1);
        return this.document.update({ [path]: rows });
    }

    static async #onAddAbility() {
        const key = ["species", "monsterspecies"].includes(this.document.type) ? "speciesAbilities" : "abilities";
        const id = foundry.utils.randomID(16);
        return this.document.update({ [`system.${key}.${id}`]: { name: game.i18n.localize("THEFADE.Abilities.newAbility"), description: "", activation: "passive", actionCost: "", durationRounds: 1, bonuses: [] } });
    }

    static async #onRemoveAbility(event, target) {
        const key = ["species", "monsterspecies"].includes(this.document.type) ? "speciesAbilities" : "abilities";
        const id = target.closest("[data-ability-id]").dataset.abilityId;
        const name = this.document.system[key][id]?.name ?? "";
        const confirmed = event.shiftKey || await DialogV2.confirm({
            window: { title: game.i18n.format("THEFADE.Abilities.deleteTitle", { name }) },
            content: `<p>${game.i18n.format("THEFADE.Abilities.deleteConfirm", { name: foundry.utils.escapeHTML(name) })}</p>`,
            classes: ["thefade"], rejectClose: false
        });
        if (confirmed) return this.document.update({ [`system.${key}.-=${id}`]: null });
    }

    static async #onAddQuality() {
        const select = this.element.querySelector("select[data-add-quality]");
        const id = select?.value;
        if (!id) return;
        const ids = [...new Set([...this.document.system.qualityIds, id])];
        return this.document.update({ "system.qualityIds": ids });
    }

    static async #onRemoveQuality(event, target) {
        const id = target.dataset.quality;
        return this.document.update({ "system.qualityIds": this.document.system.qualityIds.filter(q => q !== id) });
    }

    static async #onAddSubtype() {
        const select = this.element.querySelector("select[data-add-subtype]");
        if (!select?.value) return;
        const ids = [...new Set([...this.document._source.system.creatureSubtypes, select.value])];
        return this.document.update({ "system.creatureSubtypes": ids });
    }

    static async #onRemoveSubtype(event, target) {
        const id = target.dataset.subtype;
        return this.document.update({ "system.creatureSubtypes": this.document._source.system.creatureSubtypes.filter(s => s !== id) });
    }

    static async #onRemoveAttackWeapon(event, target) {
        const { index, weapon } = target.dataset;
        const attacks = this.document.system.toObject().standardAttacks;
        attacks[Number(index)]?.weapons.splice(Number(weapon), 1);
        return this.document.update({ "system.standardAttacks": attacks });
    }

    static #onUse() {
        return this.document.use();
    }

    static #onResetUses() {
        return this.document.resetUses();
    }

    static #onToChat() {
        return this.document.toChat();
    }

    static async #onRollHazard() {
        const { rollHazard } = await import("../rolls/hazard.mjs");
        return rollHazard(this.document);
    }

    static async #onCraft() {
        const { craftAlchemicalItem } = await import("../rules/alchemy-rules.js");
        if (this.document.actor) return craftAlchemicalItem(this.document.actor, this.document);
    }
}
