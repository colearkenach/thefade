// Default category/group layout for The Fade in Token Action HUD.
import { GROUP } from "./constants.js";

export function buildDefaults() {
    const groups = Object.values(GROUP).map(g => ({ ...g, listName: g.name }));
    const groupsById = Object.fromEntries(groups.map(g => [g.id, g]));

    const cat = (id, name, groupIds) => ({
        nestId: id,
        id,
        name,
        groups: groupIds.map(gid => ({
            ...groupsById[gid],
            nestId: `${id}_${gid}`
        }))
    });

    return {
        layout: [
            cat("attributes", "Attributes", ["attributes"]),
            cat("skills",     "Skills",     [
                "skills-combat", "skills-physical", "skills-mental",
                "skills-social", "skills-magical", "skills-other"
            ]),
            cat("combat",     "Combat",     ["weapons"]),
            cat("magic",      "Magic",      ["spells"]),
            cat("talents",    "Talents",    ["talents"]),
            cat("inventory",  "Inventory",  ["inventory"]),
            cat("utility",    "Utility",    ["utility"])
        ],
        groups
    };
}
