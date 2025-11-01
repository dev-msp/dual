/**
 * Declarative keymap configurations for each page/context
 *
 * Maps physical keys to domain-specific actions.
 * Keymaps are composable and can be merged for layered behavior.
 */

import type { KeymapConfig } from "./index";

/**
 * Review page keybindings
 *
 * Keyboard shortcuts:
 * A - Select Track A (win)
 * B - Select Track B (loss)
 * D - Mark as draw
 * S - Skip comparison
 * Q - Quit/return to home
 * Space - Cycle playback
 * ← - Seek backward 10 seconds
 * → - Seek forward 10 seconds
 */
export const reviewKeybindings: KeymapConfig = {
  a: {
    action: "SELECT_A",
    preventDefault: true,
  },
  b: {
    action: "SELECT_B",
    preventDefault: true,
  },
  d: {
    action: "DRAW",
    preventDefault: true,
  },
  s: {
    action: "SKIP",
    preventDefault: true,
  },
  q: {
    action: "QUIT",
    preventDefault: true,
  },
  " ": {
    action: "CYCLE_PLAYBACK",
    preventDefault: true,
  },
  arrowleft: {
    action: "SEEK_BACKWARD",
    preventDefault: true,
  },
  arrowright: {
    action: "SEEK_FORWARD",
    preventDefault: true,
  },
});

/**
 * Categorize page keybindings
 *
 * Keyboard shortcuts:
 * A - Toggle album mode
 * S - Skip track
 * Enter - Submit categorization
 * Q - Quit/return to home
 * 0-9 - Quick select category option by number
 */
export const categorizeKeybindings: KeymapConfig = {
  a: {
    action: "TOGGLE_ALBUM_MODE",
    preventDefault: true,
    context: "albumMode", // Can be filtered based on UI state
  },
  s: {
    action: "SKIP",
    preventDefault: true,
  },
  enter: {
    action: "SUBMIT",
    preventDefault: true,
  },
  q: {
    action: "QUIT",
    preventDefault: true,
  },
  "0": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "1": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "2": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "3": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "4": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "5": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "6": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "7": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "8": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
  "9": {
    action: "NUMBER_KEY",
    preventDefault: true,
  },
};

/**
 * Compose multiple keymaps
 * Used to layer global + page-specific keybindings
 *
 * @param keymaps - Keymaps to merge (later ones take precedence)
 * @returns Merged keymap configuration
 *
 * @example
 * const reviewKeysWithGlobal = composeKeymaps(globalKeybindings, reviewKeybindings);
 */
export function composeKeymaps(...keymaps: KeymapConfig[]): KeymapConfig {
  return Object.assign({}, ...keymaps);
}
