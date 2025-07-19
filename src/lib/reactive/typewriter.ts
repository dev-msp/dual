import {
  pipe,
  Observable,
  animationFrameScheduler,
  EMPTY,
  type MonoTypeOperatorFunction,
  type OperatorFunction,
} from "rxjs";
import * as op from "rxjs/operators";

import { rate } from "./rate";

/**
 * Waits for the provided source observable to emit a value, which is suppressed.
 *
 * This operator is useful for delaying the subscription to the source
 * observable until the signal emits.
 *
 * @param signal - The observable that acts as a signal to wait for.
 * @returns An operator function that waits for the signal before subscribing to the source observable.
 */
export const waitFor =
  <T>(signal: Observable<unknown>): MonoTypeOperatorFunction<T> =>
  (source) =>
    signal.pipe(
      op.take(1),
      op.concatMap(() => EMPTY),
      op.concatWith(source),
    );

const cursorWithSource = <T>(
  cursor: Observable<T>,
  initialValue: T,
): OperatorFunction<string, [T, string, boolean]> => {
  return (source: Observable<string>) => {
    const sharedSource = source.pipe(op.shareReplay(1));
    const sharedSourceComplete = sharedSource.pipe(
      op.concatMap(() => EMPTY),
      op.startWith(false),
      op.endWith(true),
    );
    return cursor.pipe(
      waitFor(sharedSource),
      op.withLatestFrom(sharedSource, sharedSourceComplete),
      op.startWith([initialValue, "", false] as [T, string, boolean]),
    );
  };
};

export const buildMulticursor = (buffer: string, charsRead: number) => {
  const output =
    charsRead <= 0
      ? ""
      : buffer.split("\n").reduce((acc, line, i) => {
          const offset = 4 * i * Math.log(i + 1);
          const actual = charsRead - offset;
          if (actual < 0) return acc;
          if (actual >= line.length) return `${acc}${line}\n`;
          return `${acc}${line.slice(0, actual)}\n`;
        }, "");

  return {
    output: output.trimEnd(),
    charsRead: output.length,
    charCount: buffer.length,
  };
};

export const basicLineBuilder: LineBuilder = (
  buffer: string,
  charsRead: number,
) => ({
  output: charsRead <= 0 ? "" : buffer.slice(0, charsRead),
  charsRead,
  charCount: buffer.length,
});

interface LineBuilder {
  (
    buffer: string,
    charsRead: number,
    doneStreaming: boolean,
  ): { output: string; charsRead: number; charCount: number };
}

export const typewriter = (
  lineBuilder: LineBuilder = basicLineBuilder,
  scheduler = animationFrameScheduler,
): MonoTypeOperatorFunction<string> =>
  pipe(
    (source: Observable<string>) => {
      const cursor$ = rate(30, 1e3 / 60, scheduler);
      return source.pipe(
        cursorWithSource(cursor$, { total: 0, delta: 0 }),
        op.map(([{ total }, buffer, doneStreaming]) => ({
          ...lineBuilder(buffer, total, doneStreaming),
          doneStreaming,
        })),
        op.takeWhile(
          ({ charsRead, charCount, doneStreaming }) =>
            !doneStreaming || charsRead < charCount,
          true,
        ),
        op.map(({ output }) => output),
      );
    },
    op.catchError((err) => {
      console.error("Error in multiTypewriter:", err);
      return EMPTY;
    }),
    op.tap({
      subscribe: () => console.log("MultiTypewriter started"),
      complete: () => console.log("MultiTypewriter completed"),
    }),
  );
