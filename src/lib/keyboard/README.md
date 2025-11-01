# RxJS Event Stream Keyboard System

A declarative, composable keyboard handling system built on RxJS observables.

## Architecture Overview

```
Physical KeyboardEvent (DOM)
    ↓
NormalizedKeyboardEvent$ Observable
    ├─ Key normalization (lowercase)
    ├─ Form element detection
    └─ Single shared listener
    ↓
Keymap Configuration (declarative)
    ├─ Maps keys to domain-specific actions
    └─ Optional context & preventDefault
    ↓
Action Streams (per-action observables)
    ├─ SELECT_A$
    ├─ SKIP$
    ├─ CYCLE_PLAYBACK$
    └─ ... (composable, type-safe)
    ↓
Handler Functions (your business logic)
```

## Design Principles

✅ **Declarative**: Keymaps are data, not logic
✅ **Layered**: Capture → Normalize → Route → Act
✅ **No low-level handler specification**: Actions are domain-specific, not key-specific
✅ **RxJS-native**: Full support for operators, middleware, composition
✅ **Type-safe**: TypeScript action types prevent misconfigurations

## Core Concepts

### 1. `NormalizedKeyboardEvent`

Raw DOM events normalized and enriched:

```typescript
interface NormalizedKeyboardEvent {
  key: string;              // lowercase, normalized
  originalEvent: KeyboardEvent;
  isFormElement: boolean;   // True if in INPUT/TEXTAREA/SELECT
  timestamp: number;
}
```

### 2. `KeymapConfig`

Declarative key-to-action mapping:

```typescript
interface KeymapConfig {
  [key: string]: {
    action: string;           // Domain-specific action name
    context?: string;         // Optional context filter
    preventDefault?: boolean;  // Prevent default browser behavior
  };
}
```

### 3. `UserAction`

Domain-specific action types (type-safe unions):

```typescript
type ReviewAction =
  | { type: "SELECT_A" }
  | { type: "SELECT_B" }
  | { type: "SKIP" }
  | { type: "CYCLE_PLAYBACK" }
  | { type: "SEEK_FORWARD"; seconds: number }
  // ...

type CategorizeAction =
  | { type: "TOGGLE_ALBUM_MODE" }
  | { type: "SUBMIT" }
  // ...
```

## Usage

### Basic Setup (Review Page)

```typescript
import { useKeyboardAction } from "../lib/keyboard/solid-integration";
import { reviewKeybindings } from "../lib/keyboard/keymaps";

export const Review = () => {
  const handleSelectA = () => { /* ... */ };
  const handleSkip = () => { /* ... */ };

  // Set up keyboard action handlers
  useKeyboardAction({
    keymap: reviewKeybindings,
    handlers: {
      SELECT_A: handleSelectA,
      SKIP: handleSkip,
      // ... other actions
    },
  });

  return <div>{/* Component JSX */}</div>;
};
```

### With Context Filtering

```typescript
useKeyboardAction({
  keymap: categorizeKeybindings,
  handlers: {
    TOGGLE_ALBUM_MODE: () => setAlbumMode(!albumMode()),
    SUBMIT: submitCategorization,
    SKIP: handleSkip,
  },
  // Only allow TOGGLE_ALBUM_MODE in specific UI context
  contextCheck: (context) =>
    context === "albumMode" ? isInAlbumMode() : true,
  // Disable all keyboard handling until session starts
  enabled: () => sessionStarted(),
});
```

### Composing Keymaps

```typescript
import { composeKeymaps } from "../lib/keyboard/keymaps";

const baseBindings = {
  q: { action: "QUIT", preventDefault: true },
};

const pageBindings = {
  a: { action: "SELECT_A", preventDefault: true },
  s: { action: "SKIP", preventDefault: true },
};

const merged = composeKeymaps(baseBindings, pageBindings);
// Later keymaps take precedence on duplicate keys
```

## Defining Custom Keymaps

Create page-specific keymaps in `keymaps.ts`:

```typescript
export const myPageKeybindings: KeymapConfig = {
  'x': {
    action: 'MY_ACTION',
    preventDefault: true,
  },
  'y': {
    action: 'MY_OTHER_ACTION',
    context: 'myContext',  // Optional
    preventDefault: false,
  },
};
```

Define corresponding action types in `actions.ts`:

```typescript
export type MyPageAction =
  | { type: "MY_ACTION" }
  | { type: "MY_OTHER_ACTION" };
```

## Advanced: Direct Observable Access

For complex workflows, subscribe to action streams directly:

```typescript
import { createKeyboardSource, createActionStreams } from "../lib/keyboard";
import * as rx from "rxjs";
import * as op from "rxjs/operators";

const keyboard$ = createKeyboardSource();

const actionStreams = createActionStreams({
  keymap: reviewKeybindings,
  keyboardEvent$: keyboard$,
  skipFormElements: true,
});

// Subscribe to specific action with operators
actionStreams['SKIP']
  .pipe(
    op.debounceTime(300),        // Debounce rapid inputs
    op.switchMap(() => fetchNextTrack()),
  )
  .subscribe(
    (result) => console.log('Track fetched:', result),
    (error) => console.error('Fetch failed:', error),
  );
```

## Migration from Old System

### Before (Deprecated)

```typescript
import { useKeyboard } from "../hooks/useKeyboard";

useKeyboard({
  onSelectA: handleSelectA,
  onSelectB: handleSelectB,
  onSkip: handleSkip,
  onQuit: handleQuit,
});
```

### After (New)

```typescript
import { useKeyboardAction } from "../lib/keyboard/solid-integration";
import { reviewKeybindings } from "../lib/keyboard/keymaps";

useKeyboardAction({
  keymap: reviewKeybindings,
  handlers: {
    SELECT_A: handleSelectA,
    SELECT_B: handleSelectB,
    SKIP: handleSkip,
    QUIT: handleQuit,
  },
});
```

## Benefits Over Old System

| Aspect | Old | New |
|--------|-----|-----|
| **Configuration** | Implicit in switch statement | Declarative keymap objects |
| **Type Safety** | String handler names | Type-safe action unions |
| **Composability** | Limited merging | Full RxJS operator support |
| **Context Filtering** | Hardcoded conditional | Configurable contextCheck |
| **Middleware** | Not possible | Native (debounce, throttle, etc.) |
| **Separation of Concerns** | Mixed | Clean layers |
| **Testability** | Tight coupling | Decoupled from DOM |

## Lifecycle

1. **Creation**: `createKeyboardSource()` creates single shared DOM listener
2. **Routing**: `createActionStreams()` maps keys to action observables
3. **Subscription**: `useKeyboardAction()` attaches handlers via Solid.js effects
4. **Cleanup**: Automatic on component unmount via `onCleanup()`

## Performance Considerations

- **Single listener**: `createKeyboardSource()` uses `op.share()` to attach only one DOM listener
- **Lazy evaluation**: Action streams only process when subscribed
- **No memory leaks**: Solid.js `onCleanup()` automatically unsubscribes
- **Efficient routing**: Keymap is checked once per key event

## Testing

Action streams are decoupled from the DOM, making them testable:

```typescript
import { createActionStreams } from "../lib/keyboard";
import * as rx from "rxjs";

const testKeyboardEvent$ = rx.of({
  key: "a",
  isFormElement: false,
  timestamp: Date.now(),
});

const actionStreams = createActionStreams({
  keymap: { a: { action: "TEST_ACTION" } },
  keyboardEvent$: testKeyboardEvent$,
});

actionStreams['TEST_ACTION'].subscribe((action) => {
  expect(action.type).toBe('TEST_ACTION');
});
```

## Files

- `index.ts` - Core keyboard stream creation and routing
- `actions.ts` - Domain-specific action type definitions
- `keymaps.ts` - Page-specific keymap configurations
- `solid-integration.ts` - Solid.js hook integration
- `README.md` - This documentation
