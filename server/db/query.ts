import { eq, getTableColumns, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/sqlite-core";

import { itemAttributes, items } from "./schema";

const scores = (qb: QueryBuilder) =>
  qb.$with("scores").as((qb) =>
    qb
      .select({
        itemId: itemAttributes.entity_id,
        score: sql<number>`CAST(${itemAttributes.value} AS int)`.as("score"),
      })
      .from(itemAttributes)
      .where(eq(itemAttributes.key, "score")),
  );

export const itemsWithScore = (db: QueryBuilder) => {
  const _scores = scores(db);
  return db
    .with(_scores)
    .select({ ...getTableColumns(items), score: _scores.score })
    .from(items)
    .leftJoin(_scores, eq(items.id, _scores.itemId));
};
