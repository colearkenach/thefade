// Requests that need GM permissions (e.g. a player buying from a GM-owned
// shop) are sent to the active GM, who runs the registered handler.
const CHANNEL = "system.thefade";
const handlers = new Map();
const pending = new Map();

/** Register a handler the active GM runs: `handler(data, userId)` → result. */
export function registerGMHandler(action, handler) {
    handlers.set(action, handler);
}

/**
 * Run a GM handler: locally if this user is the active GM, otherwise via the
 * socket. Resolves with the handler's result; rejects on error or timeout.
 */
export async function requestGM(action, data = {}) {
    if (game.users.activeGM?.isSelf) return handlers.get(action)(data, game.user.id);
    if (!game.users.activeGM) throw new Error(game.i18n.localize("THEFADE.Socket.noGM"));
    const requestId = foundry.utils.randomID();
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pending.delete(requestId);
            reject(new Error(game.i18n.localize("THEFADE.Socket.timeout")));
        }, 15000);
        pending.set(requestId, { resolve, reject, timeout });
        game.socket.emit(CHANNEL, { type: "request", action, data, requestId, userId: game.user.id });
    });
}

export function registerSocket() {
    game.socket.on(CHANNEL, async message => {
        if (message.type === "response") {
            if (message.userId !== game.user.id) return;
            const entry = pending.get(message.requestId);
            if (!entry) return;
            clearTimeout(entry.timeout);
            pending.delete(message.requestId);
            if (message.error) entry.reject(new Error(message.error));
            else entry.resolve(message.result);
            return;
        }
        if (message.type !== "request" || !game.users.activeGM?.isSelf) return;
        const handler = handlers.get(message.action);
        let result = null;
        let error = null;
        try {
            if (!handler) throw new Error(`Unknown request "${message.action}"`);
            result = await handler(message.data, message.userId);
        } catch (err) {
            console.error("The Fade | GM request failed", err);
            error = err.message;
        }
        game.socket.emit(CHANNEL, { type: "response", requestId: message.requestId, userId: message.userId, result, error });
    });
}
