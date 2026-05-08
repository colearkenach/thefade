// Constants for The Fade Token Action HUD integration.
export const MODULE = {
    ID: "thefade-token-action-hud",
    NAME: "The Fade — Token Action HUD"
};

export const REQUIRED_CORE_MODULE_VERSION = "2.0";

export const ACTION_TYPE = {
    attribute: "attribute",
    skill: "skill",
    weapon: "weapon",
    spell: "spell",
    talent: "talent",
    item: "item",
    utility: "utility"
};

export const GROUP = {
    attributes:  { id: "attributes",  name: "Attributes",  type: "system" },
    skillsCombat:{ id: "skills-combat", name: "Skills · Combat", type: "system" },
    skillsPhys:  { id: "skills-physical", name: "Skills · Physical", type: "system" },
    skillsMental:{ id: "skills-mental", name: "Skills · Mental", type: "system" },
    skillsSocial:{ id: "skills-social", name: "Skills · Social", type: "system" },
    skillsMagic: { id: "skills-magical", name: "Skills · Magical", type: "system" },
    skillsOther: { id: "skills-other", name: "Skills · Other", type: "system" },
    weapons:     { id: "weapons",     name: "Weapons",     type: "system" },
    spells:      { id: "spells",      name: "Spells",      type: "system" },
    talents:     { id: "talents",     name: "Talents",     type: "system" },
    inventory:   { id: "inventory",   name: "Inventory",   type: "system" },
    utility:     { id: "utility",     name: "Utility",     type: "system" }
};

export const ATTRIBUTES = ["physique", "finesse", "mind", "presence", "soul"];
