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
}

/**
 * Hook to handle keyboard shortcuts for review flow
 * a - Select track A
 * b - Select track B
 * d - Mark as draw
 * n - Skip comparison
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
        handlers.onSelectA?.();
        break;
      case "b":
        e.preventDefault();
        handlers.onSelectB?.();
        break;
      case "d":
        e.preventDefault();
        handlers.onDraw?.();
        break;
      case "n":
        e.preventDefault();
        handlers.onSkip?.();
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
