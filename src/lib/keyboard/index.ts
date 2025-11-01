/**
 * RxJS-based keyboard event system
 *
 * Architecture:
 * DOM KeyboardEvent → keyboard$ Observable → Keymap routing → Action streams
 *
 * This module provides:
 * - keyboard$: Core observable emitting normalized keyboard events
 * - createActionStreams: Creates type-safe action streams from declarative keymaps
 * - Composable, layered approach with middleware support
 */

import * as rx from "rxjs";
import * as op from "rxjs/operators";

/**
 * Normalized keyboard event from the DOM
 * - Includes key normalization and context guards
 */
export interface NormalizedKeyboardEvent {
  key: string; // lowercase
  originalEvent: KeyboardEvent;
  isFormElement: boolean;
  timestamp: number;
}

/**
 * Create the core keyboard$ observable
 *
 * Applies:
 * - Key normalization (lowercase)
 * - Form element detection
 * - Debouncing and deduplication
 */
export function createKeyboardSource(): rx.Observable<NormalizedKeyboardEvent> {
  return new rx.Observable<NormalizedKeyboardEvent>((subscriber) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFormElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";

      subscriber.next({
        key: e.key.toLowerCase(),
        originalEvent: e,
        isFormElement,
        timestamp: Date.now(),
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }).pipe(op.share()); // Share single listener across all subscribers
}

/**
 * Keymap configuration: maps keys to actions
 */
export interface KeymapConfig {
  [key: string]: {
    action: string;
    context?: string; // Optional context filter
    preventDefault?: boolean;
  };
}

/**
 * Configuration for action stream routing
 */
export interface ActionStreamConfig {
  keymap: KeymapConfig;
  skipFormElements?: boolean;
  keyboardEvent$: rx.Observable<NormalizedKeyboardEvent>;
  contextCheck?: (context: string | undefined) => boolean;
}

/**
 * Create typed action streams from a keymap
 *
 * Returns an object with a stream for each action type in the keymap
 *
 * @param config - Action stream configuration
 * @returns Record mapping action names to observables
 *
 * @example
 * const keymap = {
 *   'a': { action: 'SELECT_A', preventDefault: true },
 *   'b': { action: 'SELECT_B', preventDefault: true },
 * };
 *
 * const actionStreams = createActionStreams({
 *   keymap,
 *   keyboardEvent$,
 * });
 *
 * actionStreams['SELECT_A'].subscribe(() => {
 *   // Handle SELECT_A action
 * });
 */
export function createActionStreams(
  config: ActionStreamConfig,
): Record<string, rx.Observable<KeyboardAction>> {
  const {
    keymap,
    skipFormElements = true,
    keyboardEvent$,
    contextCheck,
  } = config;

  // Build action streams by grouping keybindings by action type
  const actionMap = new Map<string, rx.Observable<KeyboardAction>>();

  Object.entries(keymap).forEach(([key, binding]) => {
    const keyStream = keyboardEvent$.pipe(
      // Filter by key
      op.filter((e) => e.key === key),
      // Filter out form elements if configured
      op.filter((e) => !skipFormElements || !e.isFormElement),
      // Apply context filter if provided
      op.filter((e) => {
        if (binding.context && contextCheck) {
          return contextCheck(binding.context);
        }
        return true;
      }),
      // Prevent default if configured
      op.tap((e) => {
        if (binding.preventDefault) {
          e.originalEvent.preventDefault();
        }
      }),
      // Convert to action
      op.map(
        (e): KeyboardAction => ({
          type: binding.action,
          key,
          timestamp: e.timestamp,
        }),
      ),
    );

    // Merge with existing action stream or create new one
    if (actionMap.has(binding.action)) {
      const existing = actionMap.get(binding.action)!;
      actionMap.set(binding.action, rx.merge(existing, keyStream));
    } else {
      actionMap.set(binding.action, keyStream);
    }
  });

  // Convert map to object and add shareReplay for multi-subscription efficiency
  return Object.fromEntries(
    Array.from(actionMap.entries()).map(([action, stream]) => [
      action,
      stream.pipe(op.shareReplay(0)), // Share without buffering
    ]),
  );
}

/**
 * Hook to attach keyboard event listener and return cleanup function
 * Used internally by solid-js integration
 */
export function attachKeyboardListener(
  handler: (e: NormalizedKeyboardEvent) => void,
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isFormElement =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT";

    handler({
      key: e.key.toLowerCase(),
      originalEvent: e,
      isFormElement,
      timestamp: Date.now(),
    });
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}
