export function openCompendiumBrowser(itemType, actor, compendiumName = null) {
    // Determine which compendium to use based on item type if not specified
    if (!compendiumName) {
        switch (itemType) {
            case "skill": compendiumName = "skills"; break;
            case "path": compendiumName = "paths"; break;
            case "species": compendiumName = "species"; break;
            case "weapon": compendiumName = "weapons"; break;
            case "spell": compendiumName = "spells"; break;
            case "talent": compendiumName = "talents"; break;
            case "trait": compendiumName = "talents"; break;
            case "precept": compendiumName = "talents"; break;
            case "armor": compendiumName = "armor"; break;
            case "magicitem": compendiumName = "magic-item"; break;
            case "potion": compendiumName = "magic-item"; break;
            case "medical": compendiumName = "mundane-item"; break;
            case "travel": compendiumName = "mundane-item"; break;
            case "biological": compendiumName = "mundane-item"; break;
            case "musical": compendiumName = "mundane-item"; break;
            case "drug": compendiumName = "mundane-item"; break;
            case "poison": compendiumName = "mundane-item"; break;
            case "clothing": compendiumName = "mundane-item"; break;
            case "communication": compendiumName = "mundane-item"; break;
            case "containment": compendiumName = "mundane-item"; break;
            case "dream": compendiumName = "mundane-item"; break;
            case "staff": compendiumName = "magic-item"; break;
            case "wand": compendiumName = "magic-item"; break;
            case "gate": compendiumName = "magic-item"; break;
            case "mount": compendiumName = "mundane-item"; break;
            case "vehicle": compendiumName = "mundane-item"; break;
            case "fleshcraft": compendiumName = "mundane-item"; break;
            default: compendiumName = itemType + "s"; // Fallback to pluralized name
        }
    }

    // Find the appropriate compendium pack
    const packs = game.packs.filter(p => p.metadata.name === compendiumName);
    const pack = packs.length > 0 ? packs[0] : null;

    if (!pack) {
        ui.notifications.warn(`${compendiumName} compendium not found. Ensure you have a compendium named '${compendiumName}'.`);
        return;
    }

    // Open the compendium
    pack.render(true);

    // Set up a one-time context menu for adding items from the compendium
    Hooks.once("renderCompendium", (app, html) => {
        if (app.collection.metadata.name === compendiumName) {
            // Create a new context menu
            const contextMenu = new ContextMenu(html, ".directory-item", [
                {
                    name: `Add to ${actor ? "Character" : "Sheet"}`,
                    icon: '<i class="fas fa-plus"></i>',
                    callback: async (li) => {
                        try {
                            const entryId = li.data("document-id");
                            const item = await pack.getDocument(entryId);

                            if (item) {
                                if (actor) {
                                    const exists = actor.items.some(i => i.name === item.name && i.type === item.type);

                                    if (!exists) {
                                        // Convert old item types to new types
                                        let itemData = item.toObject();
                                        itemData = convertLegacyItemType(itemData, itemType);

                                        await actor.createEmbeddedDocuments("Item", [itemData]);
                                        ui.notifications.info(`Added ${item.name} to ${actor.name}.`);
                                    } else {
                                        ui.notifications.warn(`${item.name} is already added to this character.`);
                                    }
                                } else {
                                    ui.notifications.info(`Selected ${item.name} from compendium.`);
                                    const event = new CustomEvent("compendiumSelection", {
                                        detail: { item: item }
                                    });
                                    document.dispatchEvent(event);
                                }
                            }
                        } catch (err) {
                            console.error(`Error adding ${itemType} from compendium:`, err);
                            ui.notifications.error(`Could not add ${itemType} from compendium.`);
                        }
                    }
                }
            ]);
        }
    });

    function convertLegacyItemType(itemData, expectedType) {
        // If the item is already the correct type, return as-is
        if (itemData.type === expectedType) {
            return itemData;
        }

        // If it's an old "item" type, convert based on itemCategory or expected type
        if (itemData.type === "item") {
            const itemCategory = itemData.system?.itemCategory;

            // Convert based on itemCategory first
            if (itemCategory === "magicitem") {
                itemData.type = "magicitem";
            } else if (itemCategory === "potion") {
                itemData.type = "potion";
            } else if (itemCategory === "drug") {
                itemData.type = "drug";
            } else if (itemCategory === "poison") {
                itemData.type = "poison";
            } else if (itemCategory === "biological") {
                itemData.type = "biological";
            } else if (itemCategory === "medical") {
                itemData.type = "medical";
            } else if (itemCategory === "travel") {
                itemData.type = "travel";
            } else if (itemCategory === "musical") {
                itemData.type = "musical";
            } else if (itemCategory === "clothing") {
                itemData.type = "clothing";
            } else if (itemCategory === "communication") {
                itemData.type = "communication";
            } else if (itemCategory === "containment") {
                itemData.type = "containment";
            } else if (itemCategory === "dream") {
                itemData.type = "dream";
            } else if (itemCategory === "staff") {
                itemData.type = "staff";
            } else if (itemCategory === "wand") {
                itemData.type = "wand";
            } else if (itemCategory === "gate") {
                itemData.type = "gate";
            } else if (itemCategory === "mount") {
                itemData.type = "mount";
            } else if (itemCategory === "vehicle") {
                itemData.type = "vehicle";
            } else if (itemCategory === "fleshcraft") {
                itemData.type = "fleshcraft";
            } else {
                // No specific category, use the expected type
                itemData.type = expectedType;
            }

            // Remove the old itemCategory since we're now using specific types
            if (itemData.system && itemData.system.itemCategory) {
                delete itemData.system.itemCategory;
            }
        }

        return itemData;
    }
}
