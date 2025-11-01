/**
 * Domain-specific user action types
 *
 * These represent high-level user intents, decoupled from keyboard specifics.
 * Different keymaps can emit the same action via different keys.
 */

/** Review page user actions */
export type ReviewAction =
  | { type: "SELECT_A" }
  | { type: "SELECT_B" }
  | { type: "DRAW" }
  | { type: "SKIP" }
  | { type: "QUIT" }
  | { type: "CYCLE_PLAYBACK" }
  | { type: "SEEK_FORWARD"; seconds: number }
  | { type: "SEEK_BACKWARD"; seconds: number };

/** Categorize page user actions */
export type CategorizeAction =
  | { type: "TOGGLE_ALBUM_MODE" }
  | { type: "SKIP" }
  | { type: "SUBMIT" }
  | { type: "QUIT" }
  | { type: "SELECTION_KEY"; key: string };

/** Global user actions (available across all pages) */
export type GlobalAction = { type: "QUIT" };

/** Union of all possible user actions */
export type UserAction = ReviewAction | CategorizeAction | GlobalAction;

/**
 * Helper to create action objects
 */
export const actions = {
  reviewSelectA: (): ReviewAction => ({ type: "SELECT_A" }),
  reviewSelectB: (): ReviewAction => ({ type: "SELECT_B" }),
  reviewDraw: (): ReviewAction => ({ type: "DRAW" }),
  reviewSkip: (): ReviewAction => ({ type: "SKIP" }),
  reviewQuit: (): ReviewAction => ({ type: "QUIT" }),
  reviewCyclePlayback: (): ReviewAction => ({ type: "CYCLE_PLAYBACK" }),
  reviewSeekForward: (seconds = 10): ReviewAction => ({
    type: "SEEK_FORWARD",
    seconds,
  }),
  reviewSeekBackward: (seconds = 10): ReviewAction => ({
    type: "SEEK_BACKWARD",
    seconds,
  }),

  categorizeToggleAlbumMode: (): CategorizeAction => ({
    type: "TOGGLE_ALBUM_MODE",
  }),
  categorizeSkip: (): CategorizeAction => ({ type: "SKIP" }),
  categorizeSubmit: (): CategorizeAction => ({ type: "SUBMIT" }),
  categorizeQuit: (): CategorizeAction => ({ type: "QUIT" }),
  categorizeSelectionKey: (key: string): CategorizeAction => ({
    type: "SELECTION_KEY",
    key,
  }),

  globalQuit: (): GlobalAction => ({ type: "QUIT" }),
};
