// Resource actions shared by item pages, inventory, and daily rest.
const CONSUMABLES = new Set(["potion", "drug", "poison", "medical", "alchemical"]);
const DAILY_ITEMS = new Set(["staff", "gate", "communication", "talent", "precept"]);
const nonNegative = value => Math.max(0, Number(value) || 0);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function getItemResource(item) {
    const sys = item.system || {};
    if (CONSUMABLES.has(item.type)) return { kind: "quantity", label: "Quantity", current: nonNegative(sys.quantity ?? 1), action: "Use" };
    if (item.type === "wand") return { kind: "charges", label: "Charges", current: nonNegative(sys.charges ?? 20), max: nonNegative(sys.maxCharges ?? 20), action: "Use Wand" };
    if (item.type === "biological") return { kind: "energy", label: "Energy", current: nonNegative(sys.energy), max: nonNegative(sys.maxEnergy), action: "Spend Energy" };
    if (!DAILY_ITEMS.has(item.type)) return null;
    const max = nonNegative(sys.usesPerDay ?? (item.type === "staff" ? 3 : 0));
    // Old actor sheets and item sheets used different counters. Read the
    // furthest-progressed counter and synchronize them on explicit actions.
    const used = item.type === "talent" || item.type === "precept"
        ? nonNegative(sys.currentUses)
        : Math.max(nonNegative(sys.uses), nonNegative(sys.usesToday),
            item.type === "gate" && sys.usesRemaining != null ? Math.max(0, max - nonNegative(sys.usesRemaining)) : 0);
    return { kind: "daily", label: "Uses remaining", current: max ? Math.max(0, max - used) : null, used, max, unlimited: max === 0, action: "Use", canReset: true };
}

export function getItemUseUpdate(item) {
    const resource = getItemResource(item);
    if (!resource) return null;
    if (!resource.unlimited && resource.current <= 0) return null;
    if (resource.kind !== "daily") return { [`system.${resource.kind}`]: resource.current - 1 };
    const used = resource.used + 1;
    if (["talent", "precept"].includes(item.type)) return { "system.currentUses": used };
    return {
        "system.uses": used, "system.usesToday": used,
        ...(item.type === "gate" && resource.max ? { "system.usesRemaining": Math.max(0, resource.max - used) } : {})
    };
}

export function getItemResetUpdate(item) {
    const resource = getItemResource(item);
    if (resource?.kind !== "daily") return null;
    if (["talent", "precept"].includes(item.type)) return { "system.currentUses": 0 };
    return { "system.uses": 0, "system.usesToday": 0,
        ...(item.type === "gate" ? { "system.usesRemaining": resource.max } : {}) };
}

const pending = new WeakSet();
export async function useItemResource(item) {
    if (!item || pending.has(item)) return;
    const update = getItemUseUpdate(item);
    if (!update) return ui.notifications.warn(`${item.name}: no uses remaining.`);
    pending.add(item);
    try {
        await item.update(update);
        const resource = getItemResource(item);
        const effect = item.system.effect || item.system.spellDescription || item.system.spellEffect || item.system.healingAmount || item.system.description || "";
        await ChatMessage.create({
            speaker: item.parent?.documentName === "Actor" ? ChatMessage.getSpeaker({ actor: item.parent }) : undefined,
            content: `<div class="thefade chat-card"><h3>${escape(item.name)}</h3>${effect ? `<div>${effect}</div>` : ""}<p>${resource.unlimited ? "Unlimited uses" : `${resource.label}: ${resource.current}${resource.max ? ` / ${resource.max}` : ""}`}</p></div>`
        });
    } finally { pending.delete(item); }
}

export async function resetItemResource(item) {
    if (!item || pending.has(item)) return;
    const update = getItemResetUpdate(item);
    if (!update) return;
    pending.add(item);
    try { await item.update(update); }
    finally { pending.delete(item); }
}
