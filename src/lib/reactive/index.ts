import * as rx from "rxjs";
import * as op from "rxjs/operators";
import {
  type Accessor,
  onCleanup,
  observable as solidObservable,
} from "solid-js";

export { from as accessor } from "solid-js";

export const observable = <T>(ax: Accessor<T>): rx.Observable<T> =>
  rx.from(solidObservable(ax));

export const filterMap = <T, R extends Exclude<unknown, null | undefined>>(
  fn: (a: T) => R | null | undefined,
): rx.OperatorFunction<T, R> =>
  op.concatMap((x) => {
    const result = fn(x);
    if (result === null || typeof result === "undefined") {
      return rx.EMPTY;
    }
    return rx.of(result);
  });

export const debugTap =
  (name: string) =>
  <T>(obs: rx.Observable<T>) =>
    obs.pipe(
      op.tap({
        next: (v) => console.log(`${name}`, v),
        subscribe: () => console.log(`${name} subscribe`),
        complete: () => console.log(`${name} complete`),
        unsubscribe: () => console.log(`${name} unsubscribe`),
      }),
    );

/** Returns an observable that emits once when a component is cleaned up */
export function onCleanup$() {
  const obs = new rx.Subject<void>();

  onCleanup(() => {
    obs.next();
    obs.complete();
  });

  return obs.asObservable();
}

type TrailingOptions<T> = {
  fillWith?: T;
};
export const trailing = <T>(
  count: number,
  { fillWith }: TrailingOptions<T> = {},
): rx.OperatorFunction<T, T[]> =>
  rx.pipe(
    op.scan(
      (acc, value) =>
        (fillWith !== undefined
          ? [
              ...Array.from({ length: count }).map(() => fillWith),
              ...acc,
              value,
            ]
          : [...acc, value].slice(-count)
        ).slice(-count),
      [] as T[],
    ),
  );
