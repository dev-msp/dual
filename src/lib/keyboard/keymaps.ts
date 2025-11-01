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
export const reviewKeybindings: KeymapConfig = fromKvMapping({
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
 * A - Toggle album mode (when context allows)
 * S - Skip track (when not selecting categories)
 * Enter - Submit categorization
 * Q - Quit/return to home
 * 1-9, 0, a, s, d, f, g, h, j, k, l - Quick select category option
 */
export const categorizeKeybindings: KeymapConfig = fromKvMapping({
  enter: {
    action: "SUBMIT",
    preventDefault: true,
  },
  q: {
    action: "QUIT",
    preventDefault: true,
  },
  "0": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "1": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "2": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "3": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "4": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "5": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "6": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "7": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "8": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  "9": {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  a: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  s: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  d: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  f: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  g: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  h: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  j: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  k: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
  l: {
    action: "SELECTION_KEY",
    preventDefault: true,
  },
});

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
  return (key: string) =>
    keymaps.reduce((xs, x) => {
      const binding = x(key);
      return binding ? binding : xs;
    }, undefined as ReturnType<KeymapConfig>);
}

function fromKvMapping<K extends string, V>(
  obj: Record<K, V>,
): (key: string) => V | undefined {
  return (key: string) => obj[key as K];
}
