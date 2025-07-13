import { eq } from "drizzle-orm";
import { EMPTY, from, Observable, of, Subject } from "rxjs";
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

export const taskSchema = z
  .object({
    id: z.uuidv4(),
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
            const rec = db
              .select()
              .from(items)
              .innerJoin(albums, eq(items.album_id, albums.id))
              .where(eq(items.id, trackId))
              .get();
            if (!rec) {
              ctx.addIssue({
                code: "custom",
                message: `Track with ID ${trackId} not found`,
              });
              return z.NEVER;
            }

            return {
              trackId: rec.items.id,
              albumId: rec.albums.id,
              artPath: rec.albums.artpath
                ? new TextDecoder("utf-8").decode(rec.albums.artpath)
                : null,
            };
          }),
      }),
    ]),
  );

export type DomainTask = z.infer<typeof taskSchema>;

const rawTasks$ = new Subject<unknown>();

export const enqueueTask = (task: unknown) => {
  rawTasks$.next(task);
};

export const tasks$: Observable<DomainTask> = rawTasks$.asObservable().pipe(
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

export type Job<
  P extends JsonRecord = JsonRecord,
  T extends Record<string, Json> = Record<string, Json>,
> = Observable<WorkerEvent<P, T>>;
