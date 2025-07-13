import * as sqlCore from "drizzle-orm/sqlite-core";
import { pipe, type OperatorFunction } from "rxjs";
import * as op from "rxjs/operators";
import z from "zod/v4";

import type { DomainTask, Job } from "./api";
import { makeDb, type Db } from "./db";
import { itemsWithScore } from "./db/query";
import { albums } from "./db/schema";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const serveJson = (value: Json) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

const jsonSchema: z.ZodType<Json> = z.json();

const listTracks = (db: Db) => {
  const decoder = new TextDecoder("utf-8");
  const scoredItems = sqlCore.sqliteView("items_with_score").as(itemsWithScore);
  const subquery = db.$with("items_with_score").as(itemsWithScore);
  const q = db.with(subquery).select().from(scoredItems);
  const artMapping = db
    .select({ albumId: albums.id, artPath: albums.artpath })
    .from(albums)
    .all()
    .reduce(
      (xs, x) => {
        if (x.artPath) {
          xs[x.albumId] = decoder.decode(x.artPath);
        }
        return xs;
      },
      {} as Record<string, string>,
    );

  const data = q
    .limit(100)
    .all()
    .map((item) => ({
      ...item,
      path: item.path ? decoder.decode(item.path) : item.path,
      artPath: item.album_id ? artMapping[item.album_id] : null,
    }));
  return serveJson(data);
};

const db = await makeDb();

const WORKER_COUNT = 4;

// type WorkerEvent<P extends TaskPayload = TaskPayload, T extends Json = Json> = {
//   type: "start" | "progress" | "complete" | "error";
//   data?: T;
// };

const workers: OperatorFunction<DomainTask, Job> = pipe(
  op.mergeMap((task) => {
    switch (task.type) {
      case "load_art": {
        return task.payload;
      }
    }
  }, WORKER_COUNT),
);

Bun.serve({
  port: 5000,
  routes: {
    "/api/tracks": () => listTracks(db),
    "/bar": () => {
      throw new Error("This is an error from /bar");
    },
  },
});
