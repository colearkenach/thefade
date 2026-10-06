// Daily-use resets shared by the daily rest and item sheets.
// Spending a resource is TheFadeItem#use; resources are described by each
// item model's `resource` getter.

/**
 * Update data that resets an item's daily uses, or null if nothing to reset.
 * @param {Item} item
 */
export function getItemResetUpdate(item) {
    const resource = item.system?.resource;
    if (resource?.kind !== "daily" || !resource.used) return null;
    return { "system.usesToday": 0 };
}
