// Sheet registration.
import TheFadeCharacterSheet from "./character-sheet.mjs";
import TheFadePartySheet from "./party-sheet.mjs";
import TheFadeShopSheet from "./shop-sheet.mjs";
import TheFadeItemSheet from "./item-sheet.mjs";

export { TheFadeCharacterSheet, TheFadePartySheet, TheFadeShopSheet, TheFadeItemSheet };

export function registerSheets() {
    const { DocumentSheetConfig } = foundry.applications.apps;
    const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
    const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

    DocumentSheetConfig.unregisterSheet(Actor, "core", ActorSheet);
    DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet);
    // Keep the core V2 sheets out of the picker too.
    for (const [cls, sheet] of [[Actor, ActorSheetV2], [Item, ItemSheetV2]]) {
        try { DocumentSheetConfig.unregisterSheet(cls, "core", sheet); } catch { /* not registered */ }
    }

    DocumentSheetConfig.registerSheet(Actor, "thefade", TheFadeCharacterSheet, {
        types: ["character", "npc"], makeDefault: true, label: "THEFADE.SheetLabel.character"
    });
    DocumentSheetConfig.registerSheet(Actor, "thefade", TheFadePartySheet, {
        types: ["party"], makeDefault: true, label: "THEFADE.SheetLabel.party"
    });
    DocumentSheetConfig.registerSheet(Actor, "thefade", TheFadeShopSheet, {
        types: ["shop"], makeDefault: true, label: "THEFADE.SheetLabel.shop"
    });
    DocumentSheetConfig.registerSheet(Item, "thefade", TheFadeItemSheet, {
        makeDefault: true, label: "THEFADE.SheetLabel.item"
    });
}
