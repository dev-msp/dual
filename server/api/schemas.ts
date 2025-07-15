import z from "zod/v4";

import { itemWithArtPath } from "../db/item_queries";

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type JsonRecord = Record<string, Json>;

export type Task = z.input<typeof taskSchema>;

export type TaskResult<T extends Json = Json> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TaskLike<T extends string, P extends JsonRecord> {
  id: string;
  type: T;
  payload?: P;
}

export const identSchema = z
  .string()
  .refine(
    (arg) => /^[a-z][a-z0-9_]*[a-z0-9]$/.test(arg),
    "should be a valid identifier (e.g., 'foo_bar')",
  );

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
