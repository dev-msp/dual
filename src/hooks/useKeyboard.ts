import { onMount, onCleanup } from "solid-js";

export interface KeyboardHandlers {
  onSelectA?: () => void;
  onSelectB?: () => void;
  onDraw?: () => void;
  onSkip?: () => void;
  onQuit?: () => void;
  onCyclePlayback?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onSubmit?: () => void;
  onAlbumMode?: () => void;
}

/**
 * @deprecated Use `useKeyboardAction` from `../lib/keyboard/solid-integration` instead
 *
 * This hook has been superseded by an RxJS-based event stream architecture.
 * The new system provides:
 * - Declarative, composable keymaps
 * - Type-safe domain-specific actions
 * - Middleware support (debouncing, filtering, etc.)
 * - Better separation of concerns
 *
 * Migration example:
 * ```
 * // Old
 * useKeyboard({
 *   onSelectA: () => { ... },
 *   onSkip: () => { ... },
 * });
 *
 * // New
 * useKeyboardAction({
 *   keymap: reviewKeybindings,
 *   handlers: {
 *     SELECT_A: () => { ... },
 *     SKIP: () => { ... },
 *   }
 * });
 * ```
 *
 * This hook will be removed in the next major version.
 *
 * Hook to handle keyboard shortcuts for review flow
 * a - Select track A / Toggle album mode (categorization)
 * b - Select track B
 * d - Mark as draw
 * x - Skip comparison / Skip track (categorization)
 * q - Quit/return to home
 * space - Cycle playback (paused → A → B → paused)
 * left arrow - Seek backward 10 seconds
 * right arrow - Seek forward 10 seconds
 */
export function useKeyboard(handlers: KeyboardHandlers) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if user is typing in an input/textarea/select
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    ) {
      return;
    }

    // Normalize key to lowercase
    const key = e.key.toLowerCase();

    switch (key) {
      case "a":
        e.preventDefault();
        // For categorization context, prefer onAlbumMode; for review, use onSelectA
        if (handlers.onAlbumMode) {
          handlers.onAlbumMode();
        } else {
          handlers.onSelectA?.();
        }
        break;
      case "b":
        e.preventDefault();
        handlers.onSelectB?.();
        break;
      case "d":
        e.preventDefault();
        handlers.onDraw?.();
        break;
      case "x":
        e.preventDefault();
        handlers.onSkip?.();
        break;
      case "enter":
        e.preventDefault();
        handlers.onSubmit?.();
        break;
      case "q":
        e.preventDefault();
        handlers.onQuit?.();
        break;
      case " ":
        e.preventDefault();
        handlers.onCyclePlayback?.();
        break;
      case "arrowleft":
        e.preventDefault();
        handlers.onSeekBackward?.();
        break;
      case "arrowright":
        e.preventDefault();
        handlers.onSeekForward?.();
        break;
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
}
