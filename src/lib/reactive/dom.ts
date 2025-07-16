import * as rx from "rxjs";
import * as op from "rxjs/operators";

import { makeAccessible, onCleanup$, type AxObs } from "./";

export type ElementToObservable<E extends HTMLElement, T = E> = (
  el: E,
) => rx.Observable<T>;

type Refable<T extends object, E extends Element> = T & {
  ref: (el: E | null) => void;
};

const makeRefable = <T extends object, E extends Element>(
  obj: T,
  ref: (el: E | null) => void,
): Refable<T, E> => {
  Object.defineProperty(obj, "ref", {
    get: () => ref,
  });
  return obj as Refable<T, E>;
};

export function elementStream<E extends HTMLElement, T = E>(
  elementToObservable: ElementToObservable<E, T>,
  defaultValue: T,
  operatorFactory?: (
    etoo: ElementToObservable<E, T>,
  ) => rx.OperatorFunction<E, T>,
  cleanup$ = onCleanup$(),
): Refable<AxObs<T>, E> {
  const element$ = new rx.BehaviorSubject<E | null>(null);

  const operator = operatorFactory
    ? operatorFactory(elementToObservable)
    : op.switchMap(elementToObservable);

  return makeRefable(
    makeAccessible(
      element$.pipe(
        op.filter((el): el is E => el !== null),
        operator,
        op.takeUntil(cleanup$),
        defaultValue !== undefined ? op.startWith(defaultValue) : rx.identity,
        op.shareReplay(1),
      ),
      defaultValue,
    ),
    (el: E | null) => element$.next(el),
  );
}

export const elementResizes = <Elem extends HTMLElement>(el: Elem) =>
  new rx.Observable<{ width: number; height: number }>((subscriber) => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        subscriber.next({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });
