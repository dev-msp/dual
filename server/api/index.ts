import { asc, desc } from "drizzle-orm";
import * as sqlCore from "drizzle-orm/sqlite-core";

import { type Db } from "../db";
import { artMapping } from "../db/album_queries";
import { itemsWithScore } from "../db/query";
import { items } from "../db/schema";

const scoredItems = sqlCore.sqliteView("items_with_score").as(itemsWithScore);

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const serveJson = (value: Json) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

// const jsonSchema: z.ZodType<Json> = z.json();

type Values<T> = T[keyof T];

type DbTable =
  | Extract<Values<Db["_"]["fullSchema"]>, sqlCore.SQLiteTable>
  | typeof scoredItems;

type Columns<T extends DbTable> = Extract<
  keyof T,
  "score" | keyof (typeof items)["_"]["columns"]
>;

export type Ordering = {
  field: Columns<typeof scoredItems>;
  direction: "asc" | "desc";
};

type Options = {
  limit?: number;
  offset?: number;
  order?: Ordering[];
};

const defaultOptions: Required<Options> = {
  limit: 10000,
  offset: 0,
  order: [{ field: "id", direction: "asc" }],
};

export const optsFromRequest = (req: Request): Options => {
  const params = new URL(req.url).searchParams;
  const limit = params.get("limit");
  const offset = params.get("offset");
  const order = params.get("order");

  const opts: Options = {
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    order: order
      ? order.split(",").map((o) => {
          const [field, direction] = o.split(":");
          if (!["asc", "desc"].includes(direction)) {
            throw new Error(`Invalid order format: ${o}`);
          }
          return {
            field: field as Columns<typeof items>,
            direction: direction as "asc" | "desc",
          };
        })
      : undefined,
  };

  return compact(opts);
};

const compact = (obj: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => !!value),
  );
};

export const listTracks = (db: Db, opts?: Options) => {
  const requiredOpts: Required<Options> = {
    ...defaultOptions,
    ...opts,
  };

  const decoder = new TextDecoder("utf-8");
  const subquery = db.$with("items_with_score").as(itemsWithScore);
  const q = db.with(subquery).select().from(scoredItems);

  const mapping = artMapping();

  const data = q
    .limit(requiredOpts.limit)
    .offset(requiredOpts.offset)
    .orderBy(
      ...requiredOpts.order.map(({ field, direction }) =>
        direction === "desc"
          ? desc(scoredItems[field])
          : asc(scoredItems[field]),
      ),
    )
    .all()
    .map((item) => ({
      ...item,
      path: item.path ? decoder.decode(item.path) : item.path,
      artPath: item.album_id ? (mapping[item.album_id] ?? null) : null,
    }));
  return serveJson(data);
};
