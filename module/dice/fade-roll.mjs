// The Fade's d12 success-pool roll (Core p. 12): roll N d12s; each 8–11 is
// one success and each 12 is two. Meeting or beating the Difficulty
// Threshold (DT) succeeds. Implemented as a real Roll so Dice So Nice,
// roll modes, and chat tooltips all work.

/** Successes contributed by one d12 face. */
export function successesForFace(face) {
    return face >= 12 ? 2 : face >= 8 ? 1 : 0;
}

/**
 * Register the `fs` ("fade successes") dice modifier: `6d12fs` totals the
 * successes rolled rather than the faces.
 */
export function registerDiceModifier() {
    const Die = foundry.dice.terms.Die;
    Die.MODIFIERS.fs = function fadeSuccesses() {
        for (const result of this.results) {
            if (!result.active) continue;
            result.count = successesForFace(result.result);
            result.success = result.count > 0;
        }
    };
}

/**
 * A d12 success pool.
 *
 * Options:
 *  - dt        {number|null}  Difficulty Threshold to meet or beat.
 *  - label     {string}       What is being rolled ("Sword", "Physique").
 *  - autoFail  {boolean}      Rolled nothing; the check fails (e.g. Infirm, blinded Sight check).
 */
export default class FadeRoll extends Roll {
    static CHAT_TEMPLATE = "systems/thefade/templates/chat/fade-roll.hbs";

    /**
     * Build a pool of `dice` d12s.
     * @param {number} dice
     * @param {object} [options]
     * @returns {FadeRoll}
     */
    static pool(dice, options = {}) {
        const count = Math.max(0, Math.trunc(Number(dice) || 0));
        return new this(count > 0 ? `${count}d12fs` : "0", {}, options);
    }

    /** Number of dice in the pool. */
    get poolSize() {
        return this.dice.reduce((sum, die) => sum + (die.number || 0), 0);
    }

    /** Total successes. */
    get successes() {
        return this._evaluated ? Math.max(0, Number(this.total) || 0) : null;
    }

    get dt() {
        const dt = Number(this.options.dt);
        return Number.isFinite(dt) && dt > 0 ? dt : null;
    }

    /** True/false when a DT is set; null otherwise. */
    get isSuccess() {
        if (!this._evaluated) return null;
        if (this.options.autoFail) return false;
        return this.dt === null ? null : this.successes >= this.dt;
    }

    /** Successes beyond the DT (spendable on bonus effects). */
    get excess() {
        if (!this._evaluated || this.dt === null) return 0;
        return Math.max(0, this.successes - this.dt);
    }

    /** Every d12 face with its success value, for rendering. */
    get faces() {
        const faces = [];
        for (const die of this.dice) {
            for (const result of die.results) {
                if (!result.active) continue;
                const value = successesForFace(result.result);
                faces.push({ face: result.result, value, cls: value === 2 ? "crit" : value ? "hit" : "miss" });
            }
        }
        return faces;
    }

    /** @override */
    async render({ flavor, template = this.constructor.CHAT_TEMPLATE, isPrivate = false } = {}) {
        if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate });
        const context = {
            label: isPrivate ? "???" : (this.options.label ?? ""),
            flavor: isPrivate ? null : (flavor ?? this.options.flavor),
            isPrivate,
            poolSize: this.poolSize,
            successes: isPrivate ? "?" : this.successes,
            dt: this.dt,
            outcome: isPrivate ? null : this.outcome,
            faces: isPrivate ? [] : this.faces,
            notes: isPrivate ? [] : (this.options.notes ?? []),
            tooltip: isPrivate ? "" : await this.getTooltip()
        };
        return foundry.applications.handlebars.renderTemplate(template, context);
    }

    /** Outcome descriptor for chat cards. */
    get outcome() {
        if (!this._evaluated) return null;
        if (this.options.autoFail) return { key: "failure", label: game.i18n.localize("THEFADE.Roll.autoFail") };
        if (this.dt === null) return null;
        return this.isSuccess
            ? { key: "success", label: game.i18n.localize("THEFADE.Roll.success") }
            : { key: "failure", label: game.i18n.localize("THEFADE.Roll.failure") };
    }
}
