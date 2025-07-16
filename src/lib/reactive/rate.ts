import {
  SchedulerLike,
  animationFrameScheduler,
  Observable,
  defer,
  interval as rxInterval,
  ObservedValueOf,
} from "rxjs";
import * as op from "rxjs/operators";

export type CursorState = [
  ObservedValueOf<ReturnType<typeof rate>>,
  string,
  boolean,
];

export const rate = (
  perSecond: number,
  interval = 1000 / perSecond,
  scheduler: SchedulerLike = animationFrameScheduler,
): Observable<{ delta: number; total: number }> =>
  defer(() => {
    const startTime = scheduler.now();
    return rxInterval(interval, scheduler).pipe(
      op.map(() =>
        Math.floor(((scheduler.now() - startTime) * perSecond) / 1000),
      ),
      op.startWith(0),
      op.distinctUntilChanged(),
      op.pairwise(),
      op.map(([previous, current]) => ({
        total: previous,
        delta: current - previous,
      })),
    );
  });
