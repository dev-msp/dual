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

export interface ActionBinding {
  action: string;
  context?: string;
  preventDefault?: boolean;
}

export interface KeyboardAction {
  event: NormalizedKeyboardEvent;
  binding: ActionBinding;
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
export type KeymapConfig = (key: string) =>
  | {
      action: string;
      context?: string;
      preventDefault?: boolean;
    }
  | undefined;

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
): rx.OperatorFunction<NormalizedKeyboardEvent, KeyboardAction> {
  const { keymap, skipFormElements = true, contextCheck } = config;

  return rx.pipe(
    op.map((e: NormalizedKeyboardEvent) => {
      const binding = keymap(e.key);
      return binding ? { event: e, binding } : null;
    }),
    op.filter((x): x is KeyboardAction => x !== null),
    // Filter out form elements if configured
    op.filter(({ event }) => !skipFormElements || !event.isFormElement),
    // Apply context filter if provided
    op.filter(({ binding }) => contextCheck?.(binding.context) ?? true),
    // Prevent default if configured
    op.tap(({ event, binding }) => {
      if (binding.preventDefault) {
        event.originalEvent.preventDefault();
      }
    }),
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

export function normalizeKeyboardEvent(
  e: KeyboardEvent,
): NormalizedKeyboardEvent {
  const target = e.target as HTMLElement;
  const isFormElement =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT";

  return {
    key: e.key.toLowerCase(),
    originalEvent: e,
    isFormElement,
    timestamp: Date.now(),
  };
}
