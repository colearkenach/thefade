/* Entry point for The Fade system */
import { registerSystemHooks } from './src/hooks.js';
export { TheFadeActor } from './src/actor.js';
export { TheFadeCharacterSheet } from './src/character-sheet.js';
export { TheFadeItem } from './src/item.js';
export { TheFadeItemSheet } from './src/item-sheet.js';

registerSystemHooks();
