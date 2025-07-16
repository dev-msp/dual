import * as rx from "rxjs";
import * as op from "rxjs/operators";

import { onCleanup$ } from "./";

export type ElementToObservable<E extends HTMLElement, T = E> = (
  el: E,
) => rx.Observable<T>;

export function elementStream<E extends HTMLElement, T = E>(
  elementToObservable: ElementToObservable<E, T>,
  operatorFactory?: (
    etoo: ElementToObservable<E, T>,
  ) => rx.OperatorFunction<E, T>,
  defaultValue?: T,
  cleanup$ = onCleanup$(),
) {
  const element$ = new rx.BehaviorSubject<E | null>(null);

  const operator = operatorFactory
    ? operatorFactory(elementToObservable)
    : op.switchMap(elementToObservable);

  const value = element$.pipe(
    op.filter((el): el is E => el !== null),
    operator,
    op.takeUntil(cleanup$),
    defaultValue !== undefined ? op.startWith(defaultValue) : rx.identity,
    op.shareReplay(1),
  );

  return [value, (el: E | null) => element$.next(el)] as const;
}
