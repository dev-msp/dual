/**
 * Solid.js integration for keyboard action streams
 *
 * Provides:
 * - useKeyboardAction: Subscribe to action streams and attach handlers
 * - Automatic cleanup via Solid.js onCleanup lifecycle
 * - Composable, layered keyboard handling
 */

import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { createEffect, onCleanup } from "solid-js";

import {
  createKeyboardSource,
  createActionStreams,
  type KeymapConfig,
} from "./index";

/**
 * Handler for a specific keyboard action
 */
export type ActionHandler = (action: unknown) => void | Promise<void>;

/**
 * Handlers map: action type → handler function
 */
export interface ActionHandlers {
  [actionType: string]: ActionHandler;
}

/**
 * Configuration for useKeyboardAction hook
 */
export interface UseKeyboardActionConfig {
  keymap: KeymapConfig;
  handlers: ActionHandlers;
  skipFormElements?: boolean;
  contextCheck?: (context: string | undefined) => boolean;
  enabled?: () => boolean; // Optional predicate to enable/disable
}

/**
 * Solid.js hook for keyboard action handling
 *
 * Creates action streams from a keymap and subscribes to handlers.
 * Automatically cleans up subscriptions on component unmount.
 *
 * @param config - Configuration object
 *
 * @example
 * const reviewKeymap = { 'a': { action: 'SELECT_A' }, ... };
 * const handlers = {
 *   SELECT_A: () => selectTrack('A'),
 *   SELECT_B: () => selectTrack('B'),
 * };
 *
 * useKeyboardAction({ keymap: reviewKeymap, handlers });
 */
export function useKeyboardAction(config: UseKeyboardActionConfig): void {
  const { keymap, handlers, skipFormElements = true, contextCheck, enabled } =
    config;

  // Create or reuse the global keyboard source
  const keyboard$ = createKeyboardSource();

  // Create action streams from keymap
  const actionStreams = createActionStreams({
    keymap,
    skipFormElements,
    keyboardEvent$: keyboard$,
    contextCheck,
  });

  // Subscribe to each action stream and call corresponding handler
  createEffect(() => {
    const subscriptions: rx.Subscription[] = [];

    Object.entries(actionStreams).forEach(([actionType, actionStream$]) => {
      if (!handlers[actionType]) return; // Skip if no handler

      // Filter by enabled() if provided
      const stream = enabled
        ? actionStream$.pipe(op.filter(() => enabled()))
        : actionStream$;

      const subscription = stream.subscribe({
        next: (action) => {
          handlers[actionType](action);
        },
        error: (err) => {
          console.error(`Keyboard action error for ${actionType}:`, err);
        },
      });

      subscriptions.push(subscription);
    });

    // Cleanup subscriptions on component unmount
    onCleanup(() => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    });
  });
}

/**
 * Create an action emitter for dispatch-based action handling
 *
 * Useful when you want to collect actions and dispatch them
 * to a central reducer or state management system.
 *
 * @returns Object with:
 *   - action$: Observable of all actions
 *   - getHandler: Get a handler that emits to the observable
 *
 * @example
 * const { action$, getHandler } = createActionDispatcher();
 *
 * action$.pipe(
 *   tap(action => console.log('Action:', action))
 * ).subscribe();
 *
 * useKeyboardAction({
 *   keymap: reviewKeymap,
 *   handlers: {
 *     SELECT_A: getHandler('SELECT_A'),
 *     SELECT_B: getHandler('SELECT_B'),
 *   }
 * });
 */
export function createActionDispatcher() {
  const action$ = new rx.Subject<unknown>();

  return {
    action$: action$.asObservable(),
    getHandler: (actionType: string) => (action: unknown) => {
      if (typeof action === "object" && action !== null) {
        action$.next({ ...(action as Record<string, unknown>), type: actionType });
      } else {
        action$.next({ type: actionType });
      }
    },
  };
}
