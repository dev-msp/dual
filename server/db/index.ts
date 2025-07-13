import * as fs from "node:fs/promises";

import { Database } from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import z from "zod/v4";

import * as schema from "./schema";

export const pathSchema = z
  .string()
  .nullish()
  .optional()
  .default(() =>
    process.env["XDG_CONFIG_HOME"]
      ? `${process.env["XDG_CONFIG_HOME"]}/beets/library.db`
      : null,
  )
  .transform(async (val, ctx) => {
    if (val === null) {
      ctx.addIssue({
        code: "custom",
        message: "DB path not set",
      });
      return z.NEVER;
    }

    if (!(await fs.exists(val))) {
      ctx.addIssue({
        code: "custom",
        message: `File not found: ${val}`,
      });
      return z.NEVER;
    }

    return val;
  });

export const makeDb = async (): Promise<Db> => {
  const dbPath = await pathSchema.parseAsync(undefined);
  console.log(`Connecting to database at ${dbPath}`);
  const sqlite = new Database(dbPath);
  return drizzle(sqlite, { schema });
};

export const db = await makeDb();

export type Db = BunSQLiteDatabase<typeof schema>;
