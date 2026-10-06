// Applying a species (or monster species) to a character: identity
// snapshot, attribute bonuses, movement, monster sizing, Natural Deflection,
// and standard attacks. Used both when a species is added and when an
// embedded species set to "sync" is edited.

const { DialogV2 } = foundry.applications.api;
const ATTRIBUTES = ["physique", "finesse", "mind", "presence", "soul"];
const escape = foundry.utils.escapeHTML;

/**
 * @param {Actor} actor
 * @param {Item} species
 * @param {object} [options]
 * @param {boolean} [options.interactive=true]  Prompt for choices (flexible bonus, ND rating, attacks).
 */
export async function applySpeciesToActor(actor, species, { interactive = true } = {}) {
    if (!actor || actor.type !== "character") return;
    const system = species.system;
    const isMonster = species.type === "monsterspecies";
    const previous = actor.system.species;
    const sameSpecies = previous.name === species.name;

    // Monster size rules add HP, land speed, attribute bonuses and caps.
    const sizeRule = isMonster ? system.sizeRules?.[system.size] ?? null : null;
    const sizeHP = Number(sizeRule?.bonusHP) || 0;
    const sizeLand = Number(sizeRule?.movement?.land) || 0;
    const caps = Object.fromEntries(ATTRIBUTES.map(key => [key, sizeRule?.caps?.[key] ?? null]));

    // Flexible bonus: keep the earlier choice when re-syncing the same species.
    const flexValue = Number(system.flexibleBonus?.value) || 0;
    let flexChoice = sameSpecies ? previous.flexibleBonus?.selectedAttribute ?? "" : "";
    if (interactive && flexValue > 0 && !flexChoice) flexChoice = await chooseFlexibleAttribute(species, flexValue);

    // Natural Deflection rating for monster species.
    let ndRating = isMonster ? (sameSpecies ? previous.naturalDeflectionRating : "") : "";
    if (isMonster && !ndRating) ndRating = interactive ? await chooseDeflectionRating(species) : "average";

    const attributes = {};
    for (const key of ATTRIBUTES) {
        const current = actor._source.system.attributes[key];
        let value = current.value;
        if (isMonster && !sameSpecies) {
            const set = Number(system.attributeSet?.[key]);
            if (Number.isFinite(set) && set > 0) value = set;
        }
        if (caps[key] !== null) value = Math.min(value, caps[key]);
        attributes[key] = {
            value,
            speciesBonus: (Number(system.abilityBonuses?.[key]) || 0) + (Number(sizeRule?.bonuses?.[key]) || 0)
        };
    }

    const updates = {
        "system.attributes": attributes,
        "system.species": {
            name: species.name,
            manualEntry: false,
            baseHP: (Number(system.baseHP) || 0) + sizeHP,
            size: system.size,
            creatureType: system.creatureType || "sapient",
            creatureSubtype: system.creatureSubtype || "",
            creatureSubtypes: foundry.utils.deepClone(system.creatureSubtypes ?? []),
            languages: system.languages || previous.languages || "",
            speciesAbilities: foundry.utils.deepClone(system.speciesAbilities ?? {}),
            statCaps: caps,
            attributeSpread: system.attributeSpread ?? "",
            averageEL: sizeRule?.averageEL ?? null,
            sizeRuleExample: sizeRule?.example ?? "",
            isMonsterSpecies: isMonster,
            naturalDeflectionRating: ndRating || "",
            flexibleBonus: { value: flexValue, selectedAttribute: flexValue ? flexChoice : "" }
        },
        "system.movement": {
            land: (Number(system.movement?.land) || 4) + sizeLand,
            fly: Number(system.movement?.fly) || 0,
            swim: Number(system.movement?.swim) || 0,
            climb: Number(system.movement?.climb) || 0,
            burrow: Number(system.movement?.burrow) || 0
        }
    };
    if (isMonster) updates["system.isMonster"] = true;
    if (isMonster && ndRating) Object.assign(updates, deflectionUpdates(actor, species, attributes, caps, ndRating));

    await actor.update(updates);
    if (isMonster && interactive && !sameSpecies) await grantStandardAttacks(actor, species);
    if (interactive) ui.notifications.info(game.i18n.format("THEFADE.Species.applied", { species: species.name, actor: actor.name }));
}

/** Natural Deflection pools from a monster species' rating, keeping damage taken where possible. */
function deflectionUpdates(actor, species, attributes, caps, rating) {
    const config = species.system.naturalDeflectionTypes?.[rating];
    if (!config) return {};
    const physiqueRaw = attributes.physique.value + attributes.physique.speciesBonus + (actor._source.system.attributes.physique.bonus || 0);
    const physique = Math.max(1, caps.physique !== null ? Math.min(physiqueRaw, caps.physique) : physiqueRaw);
    const base = physique * (Number(config.baseMultiplier) || 0);
    const parts = config.parts ?? {};
    const portion = part => Math.max(0, Math.floor(base * (Number(parts[part]) || 0)));
    const values = {
        head: portion("head"), body: portion("body"),
        leftarm: portion("arms"), rightarm: portion("arms"),
        leftleg: portion("legs"), rightleg: portion("legs")
    };
    const updates = {};
    for (const [part, max] of Object.entries(values)) {
        const prior = actor.system.naturalDeflection[part];
        const wasFull = prior.current >= prior.max;
        updates[`system.naturalDeflection.${part}`] = {
            max,
            current: wasFull ? max : Math.min(prior.current, max),
            stacks: prior.stacks
        };
    }
    return updates;
}

/** Create a monster species' standard attacks as weapons, prompting for choices. */
async function grantStandardAttacks(actor, species) {
    const weapons = [];
    for (const entry of species.system.standardAttacks ?? []) {
        let options = entry.weapons ?? [];
        if (entry.mode === "choice" && options.length > 1) {
            const pick = await chooseStandardAttack(species, options);
            options = pick ? [pick] : [];
        }
        for (const weapon of options) {
            if (!weapon?.name || actor.items.some(item => item.type === "weapon" && item.name === weapon.name)) continue;
            weapons.push({
                name: weapon.name,
                type: "weapon",
                img: weapon.img || "icons/svg/sword.svg",
                system: { ...foundry.utils.deepClone(weapon.system ?? {}), equipped: true }
            });
        }
    }
    if (weapons.length) await actor.createEmbeddedDocuments("Item", weapons, { thefadeSkipApply: true });
}

async function chooseFlexibleAttribute(species, value) {
    const options = ATTRIBUTES.map(key => `<option value="${key}">${escape(game.i18n.localize(CONFIG.THEFADE.attributes[key].label))}</option>`).join("");
    const result = await DialogV2.wait({
        window: { title: game.i18n.format("THEFADE.Species.flexibleTitle", { species: species.name }) },
        classes: ["thefade"],
        content: `<p>${game.i18n.format("THEFADE.Species.flexibleHint", { value, species: escape(species.name) })}</p>
            <div class="form-group"><label>${game.i18n.localize("THEFADE.Species.flexibleAttribute")}</label>
            <div class="form-fields"><select name="attribute">${options}</select></div></div>`,
        buttons: [{
            action: "apply", label: "THEFADE.Path.apply", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => button.form.elements.attribute.value
        }, { action: "later", label: "THEFADE.Species.chooseLater" }]
    });
    return ATTRIBUTES.includes(result) ? result : "";
}

async function chooseDeflectionRating(species) {
    const types = species.system.naturalDeflectionTypes ?? {};
    const available = ["fragile", "average", "tough"].filter(key => types[key]);
    if (available.length <= 1) return available[0] ?? "average";
    const options = available.map(key => `<option value="${key}" ${key === "average" ? "selected" : ""}>${escape(CONFIG.THEFADE.naturalDeflectionRatings[key])}</option>`).join("");
    const result = await DialogV2.wait({
        window: { title: game.i18n.format("THEFADE.Species.deflectionTitle", { species: species.name }) },
        classes: ["thefade"],
        content: `<div class="form-group"><label>${game.i18n.localize("THEFADE.Species.deflectionRating")}</label>
            <div class="form-fields"><select name="rating">${options}</select></div></div>`,
        buttons: [{
            action: "apply", label: "THEFADE.Path.apply", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => button.form.elements.rating.value
        }]
    });
    return available.includes(result) ? result : "average";
}

async function chooseStandardAttack(species, weapons) {
    const options = weapons.map((weapon, index) =>
        `<label class="checkbox"><input type="radio" name="attack" value="${index}" ${index === 0 ? "checked" : ""}> ${escape(weapon.name)}</label>`).join("");
    const result = await DialogV2.wait({
        window: { title: game.i18n.format("THEFADE.Species.attackTitle", { species: species.name }) },
        classes: ["thefade"],
        content: `<p>${game.i18n.localize("THEFADE.Species.attackHint")}</p><div class="thefade-choice-grid">${options}</div>`,
        buttons: [{
            action: "apply", label: "THEFADE.Path.apply", icon: "fa-solid fa-check", default: true,
            callback: (event, button) => Number(button.form.querySelector("input[name=attack]:checked")?.value ?? 0)
        }]
    });
    return Number.isInteger(result) ? weapons[result] : weapons[0];
}
