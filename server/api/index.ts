import { eq, sql } from "drizzle-orm";
import { EMPTY, from, Observable, of, Subject, timer } from "rxjs";
import * as op from "rxjs/operators";
import z from "zod/v4";

import { db } from "../db";
import { albums, items } from "../db/schema";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonRecord = Record<string, Json>;

export type WorkerEvent<
  P extends JsonRecord = JsonRecord,
  T extends Json = Json,
> =
  | { type: "start" }
  | { type: "progress"; data?: P }
  | ({ type: "complete" } & TaskResult<T>)
  | { type: "error"; error: string; data?: P };

export type TaskResult<T extends Json = Json> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface Task<T extends string, P extends JsonRecord> {
  id: string;
  type: T;
  payload?: P;
}

const identSchema = z
  .string()
  .refine(
    (arg) => /^[a-z][a-z0-9_]*[a-z0-9]$/.test(arg),
    "should be a valid identifier (e.g., 'foo_bar')",
  );

const itemWithArtPath = (
  itemId: number,
): {
  trackId: number;
  albumId: number;
  artPath: string | null;
} => {
  const q = db
    .select({
      trackId: items.id,
      albumId: albums.id,
      artPath: albums.artpath,
    })
    .from(items)
    .innerJoin(albums, eq(items.album_id, albums.id))
    .where(eq(items.id, itemId));
  console.log("Querying for item ID:", q.toSQL().sql);
  const rec = q.get();
  if (!rec) {
    throw new Error(`Item with ID ${itemId} not found`);
  }
  return {
    ...rec,
    artPath: rec.artPath ? new TextDecoder("utf-8").decode(rec.artPath) : null,
  };
};

export const taskSchema = z
  .object({
    id: z.uuidv7(),
    type: identSchema,
    payload: z.optional(z.record(z.string(), z.json())),
  })
  .and(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("load_art"),
        payload: z
          .object({ trackId: z.number() })
          .transform(({ trackId }, ctx) => {
            try {
              return itemWithArtPath(trackId);
            } catch (error) {
              ctx.addIssue({
                code: "custom",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
              return z.NEVER;
            }
          }),
      }),
    ]),
  );

export type DomainTask = z.input<typeof taskSchema>;

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
    op.concatMap((): Observable<DomainTask> => {
      const randomId = db
        .select({ id: items.id })
        .from(items)
        .orderBy(sql`RANDOM()`)
        .limit(1)
        .get()?.id;
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
