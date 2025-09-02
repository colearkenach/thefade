// Utility helpers for chat message bonus option handling

import { DEBUG } from './constants.js';

/**
 * Bind bonus option buttons in chat messages
 * @param {JQuery} html - chat message HTML
 * @param {Object} config
 * @param {string} config.buttonSelector - selector for clickable options
 * @param {string} config.remainingSelector - selector for remaining successes element
 * @param {string} config.appliedSelector - selector for applied effects container
 * @param {Object<string,Function>} config.handlers - mapping of option -> async handler
 */
export function bindBonusHandlers(html, { buttonSelector, remainingSelector, appliedSelector, handlers }) {
    const bonusOptions = html.find(buttonSelector);
    if (!bonusOptions.length) return;

    const appliedEffects = html.find(appliedSelector);
    let remaining = parseInt(html.find(remainingSelector).text());
    const usedEffects = new Set();
    const counters = {};

    bonusOptions.on('click', async (event) => {
        const button = event.currentTarget;
        const option = button.dataset.option;
        const cost = parseInt(button.dataset.cost);

        if (usedEffects.has(option) && option !== 'critical') {
            ui.notifications?.warn(`This effect has already been applied.`);
            return;
        }

        if (remaining < cost) {
            ui.notifications?.warn(`Not enough bonus successes remaining.`);
            return;
        }

        remaining -= cost;
        html.find(remainingSelector).text(remaining);

        const handler = handlers[option];
        let effectHTML = "";
        if (handler) {
            effectHTML = await handler(button, { cost, counters });
        } else if (DEBUG) {
            console.debug(`No handler for option ${option}`);
        }

        if (effectHTML) {
            appliedEffects.append(effectHTML);
            usedEffects.add(option);
        }

        bonusOptions.each((i, btn) => {
            if (parseInt(btn.dataset.cost) > remaining) {
                $(btn).prop('disabled', true).addClass('disabled');
            }
        });
    });
}

// Handlers for general bonus options
export const bonusOptionHandlers = {
    critical: async (button) => {
        const critDamage = parseInt(button.dataset.damage);
        return `<p><strong>Critical Hit:</strong> +${critDamage} damage - Additional damage from a powerful strike</p>`;
    },
    fire: async (button, { cost }) => {
        const fireDuration = await new Roll("1d6").evaluate({ async: true });
        const fireRounds = fireDuration.total + (cost - 2);
        return `<p><strong>Fire:</strong> Target catches fire for ${fireRounds} rounds - 1d6 fire damage per round until extinguished</p>`;
    },
    cold: async (button, { cost }) => {
        return `<p><strong>Cold:</strong> Fatigue (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to physical actions</p>`;
    },
    acid: async (button, { cost }) => {
        return `<p><strong>Acid:</strong> Pain (Low Intensity) for ${cost - 1} rounds - Target suffers penalties to concentration</p>`;
    },
    electricity: async () => {
        return `<p><strong>Electricity:</strong> Chain lightning - Attack chains to adjacent target for half damage</p>`;
    },
    sonic: async (button) => {
        const halfDamage = parseInt(button.dataset.damage || 1);
        return `<p><strong>Sonic:</strong> Deafness for ${halfDamage} rounds - Target cannot hear and has disadvantage on awareness checks</p>`;
    },
    smiting: async () => {
        const fearDuration = await new Roll("1d6").evaluate({ async: true });
        return `<p><strong>Smiting:</strong> Fear (Moderate) for ${fearDuration.total} rounds - Target must make a Grit check to take aggressive actions</p>`;
    },
    expel: async () => {
        const stunDuration = await new Roll("1d6").evaluate({ async: true });
        return `<p><strong>Expel:</strong> Stunned (Moderate) for ${stunDuration.total} rounds - Target can take only one action per turn</p>`;
    },
    "psychokinetic-damage": async () => {
        return `<p><strong>Psychokinetic (Sanity):</strong> Deal half damage to target's sanity as well as HP</p>`;
    },
    "psychokinetic-confusion": async () => {
        const confusionDuration = await new Roll("1d6").evaluate({ async: true });
        return `<p><strong>Psychokinetic (Confusion):</strong> Confusion for ${confusionDuration.total} rounds - Target has trouble determining friend from foe</p>`;
    },
    corruption: async () => {
        return `<p><strong>Corruption:</strong> Half damage unhealable for 24 hours - Wounds resist magical and natural healing</p>`;
    }
};

// Handlers for spell bonus options
export const spellBonusHandlers = {
    critical: async (button) => {
        const critDamage = parseInt(button.dataset.damage);
        return `<p><strong>Critical Hit:</strong> +${critDamage} damage - Additional damage from a powerful magical strike</p>`;
    },
    increasedamage: async (button, { counters }) => {
        counters.damageIncrease = (counters.damageIncrease || 0) + 1;
        return `<p><strong>Increased Damage:</strong> +${counters.damageIncrease} to base damage</p>`;
    },
    increaserange: async (button, { counters }) => {
        counters.rangeIncrease = (counters.rangeIncrease || 0) + 1;
        return `<p><strong>Increased Range:</strong> +${counters.rangeIncrease} hex to spell range</p>`;
    },
    increaseduration: async (button, { counters }) => {
        counters.durationIncrease = (counters.durationIncrease || 0) + 1;
        return `<p><strong>Increased Duration:</strong> +${counters.durationIncrease} time increment</p>`;
    },
    spellbonus: async () => {
        return `<p><strong>Enhanced Effect:</strong> Spell potency increased</p>`;
    },
    custombonus: async (button) => {
        return `<p><strong>Bonus Effect:</strong> ${button.textContent.trim()}</p>`;
    }
};

export const attackBonusHandlers = { ...bonusOptionHandlers };

/**
 * Apply all chat bonus handlers to a rendered chat message
 * @param {JQuery} html
 */
export function applyBonusHandlers(html) {
    bindBonusHandlers(html, {
        buttonSelector: '.bonus-option',
        remainingSelector: '.remaining-successes',
        appliedSelector: '.applied-effects',
        handlers: bonusOptionHandlers
    });

    bindBonusHandlers(html, {
        buttonSelector: '.spell-bonus, .spell-custom-bonus',
        remainingSelector: '.remaining-successes',
        appliedSelector: '.applied-effects',
        handlers: spellBonusHandlers
    });

    bindBonusHandlers(html, {
        buttonSelector: '.attack-bonus',
        remainingSelector: '.attack-remaining-successes',
        appliedSelector: '.attack-applied-effects',
        handlers: attackBonusHandlers
    });
}

