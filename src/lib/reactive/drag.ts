import { fromEvent, merge, Observable } from "rxjs";
import { map, switchMap, takeUntil, filter, tap, share } from "rxjs/operators";

export interface DragDelta {
  deltaX: number;
  deltaY: number;
}

interface PointerCoords {
  clientX: number;
  clientY: number;
}

const isTouchEvent = (event: Event): event is TouchEvent => {
  return "touches" in event;
};

const getCoords = (event: MouseEvent | TouchEvent): PointerCoords => {
  return isTouchEvent(event) ? event.touches[0] : event;
};

const isPrimaryMouseDown = (event: MouseEvent): boolean => event.button === 0;
const isPrimaryTouch = (event: TouchEvent): boolean =>
  event.touches.length === 1;

const pointerMove$: Observable<MouseEvent | TouchEvent> = merge(
  fromEvent<MouseEvent>(document, "mousemove"),
  fromEvent<TouchEvent>(document, "touchmove", { passive: true }),
).pipe(share());

const pointerUp$: Observable<MouseEvent | TouchEvent> = merge(
  fromEvent<MouseEvent>(document, "mouseup"),
  fromEvent<TouchEvent>(document, "touchend"),
  fromEvent<TouchEvent>(document, "touchcancel"),
).pipe(share());

export function createDragStream(element: HTMLElement): Observable<DragDelta> {
  const mouseDown$ = fromEvent<MouseEvent>(element, "mousedown").pipe(
    filter(isPrimaryMouseDown),
  );

  const touchStart$ = fromEvent<TouchEvent>(element, "touchstart").pipe(
    filter(isPrimaryTouch),
  );

  const pointerDown$ = merge(mouseDown$, touchStart$).pipe(
    tap((e) => e.preventDefault()),
  );

  return pointerDown$.pipe(
    switchMap((startEvent) => {
      const { clientX: startX, clientY: startY } = getCoords(startEvent);

      return pointerMove$.pipe(
        map((moveEvent) => {
          const { clientX: moveX, clientY: moveY } = getCoords(moveEvent);
          return { deltaX: moveX - startX, deltaY: moveY - startY };
        }),
        takeUntil(pointerUp$),
      );
    }),
  );
}
