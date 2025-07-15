import { EMPTY, from, Observable, of, Subject, timer } from "rxjs";
import * as op from "rxjs/operators";
import z from "zod/v4";

import { randomItem } from "../db/item_queries";

import {
  type TaskResult,
  type Json,
  type JsonRecord,
  taskSchema,
  type Task,
} from "./schemas";

export type WorkerEvent<
  P extends JsonRecord = JsonRecord,
  T extends Json = Json,
> =
  | { type: "start" }
  | { type: "progress"; data?: P }
  | ({ type: "complete" } & TaskResult<T>)
  | { type: "error"; error: string; data?: P };

const rawTasks$ = new Subject<unknown>();

export const enqueueTask = (task: unknown) => {
  rawTasks$.next(task);
};

export const tasks$: Observable<z.infer<typeof taskSchema>> = rawTasks$
  .asObservable()
  .pipe(
    op.mergeMap(
      (task): Observable<z.infer<typeof taskSchema>> =>
        from(taskSchema.safeParseAsync(task)).pipe(
          op.concatMap((parsed) => {
            if (parsed.success) {
              return of(parsed.data);
            } else {
              console.error("Invalid task:", parsed.error);
              return EMPTY;
            }
          }),
        ),
    ),
    op.tap({
      next: (task) => {
        console.log(`Received task: ${task.id} of type ${task.type}`);
      },
      error: (err) => {
        console.error("Error processing task:", err);
      },
    }),
  );

timer(1e3)
  .pipe(
    op.repeat(4),
    op.concatMap((): Observable<Task> => {
      const randomId = randomItem()?.id;
      if (!randomId) {
        console.warn("No items found in the database.");
        return EMPTY;
      }
      return of({
        id: Bun.randomUUIDv7(),
        type: "load_art",
        payload: { trackId: randomId },
      });
    }),
  )
  .subscribe((t) => enqueueTask(t));

export type Job<
  P extends JsonRecord = JsonRecord,
  T extends Record<string, Json> = Record<string, Json>,
> = Observable<WorkerEvent<P, T>>;
