import type { MaybePromise } from "bun";
import { EMPTY, from, Observable, of, Subject } from "rxjs";
import * as op from "rxjs/operators";
import z from "zod/v4";

import {
  payloadSchemaFromTask,
  taskSchema,
  type Task,
  type UnprocessedTask,
} from ".";

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type JsonRecord = Record<string, Json>;

export type TaskResult<T extends Json = Json> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TaskLike<T extends string, P extends JsonRecord> {
  id: string;
  type: T;
  payload?: P;
}

export const handleTask = async (task: Task) => {
  const schema = payloadSchemaFromTask(task);
  if (!schema) {
    console.error(`No schema found for task type: ${task.type}`);
    throw new Error(`Unknown task type: ${task.type}`);
  }
  const meta = taskRegistry.get(schema);
  if (!meta) {
    throw new Error(`No handler registered for task type: ${task.type}`);
  }

  return meta.handler(task.payload);
};

export const identSchema = z
  .string()
  .refine(
    (arg) => /^[a-z][a-z0-9_]*[a-z0-9]$/.test(arg),
    "should be a valid identifier (e.g., 'foo_bar')",
  );

const taskPayloadSchema = z.record(z.string(), z.json()).optional();

export const baseTaskSchema = z.object({
  id: z.uuidv7(),
  type: identSchema,
  payload: taskPayloadSchema,
});

type PayloadSchema = typeof taskPayloadSchema;
type Payload = z.infer<PayloadSchema>;

type TaskMeta = {
  handler: (task: Payload) => MaybePromise<void>;
};

const taskRegistry = z.registry<TaskMeta>();

export const registerPayload = <P extends Task["payload"]>(
  schema: z.ZodType<P>,
  handler: (payload: P) => MaybePromise<void>,
) => {
  taskRegistry.add(schema, {
    handler: async (payload) => handler(schema.parse(payload)),
  });
};

const rawTasks$ = new Subject<unknown>();

export const enqueueTask = (task: UnprocessedTask) => {
  rawTasks$.next(task);
};

const skipInvalidTasks = (task: unknown) =>
  from(taskSchema.safeParseAsync(task)).pipe(
    op.concatMap((parsed) => {
      if (parsed.success) {
        return of(parsed.data);
      } else {
        console.error("Invalid task:", parsed.error);
        return EMPTY;
      }
    }),
  );

export type TaskOutcome =
  | { completed: string }
  | { failed: string; error: string };

const execute = (task: Task) =>
  handleTask(task)
    .then(() => ({ completed: task.id }))
    .catch((e) => ({
      failed: task.id,
      error: e instanceof Error ? e.message : String(e),
    }));

export const tasks$: Observable<TaskOutcome> = rawTasks$.asObservable().pipe(
  op.concatMap(skipInvalidTasks),
  op.mergeMap(execute, 8),
  op.tap({
    error: (err) => {
      console.error("Error processing task:", err);
    },
  }),
  op.share(),
);

export const taskEventsById = (taskId: string): Observable<TaskOutcome> =>
  tasks$.pipe(
    op.filter((outcome) =>
      "completed" in outcome
        ? outcome.completed === taskId
        : outcome.failed === taskId,
    ),
  );
