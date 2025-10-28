import { eq, getTableColumns, sql } from "drizzle-orm";
import { QueryBuilder, sqliteView } from "drizzle-orm/sqlite-core";

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

const lastRatedAt = (qb: QueryBuilder) =>
  qb.$with("last_rated_at").as((qb) =>
    qb
      .select({
        itemId: itemAttributes.entity_id,
        last_rated_at: sql<number>`CAST(${itemAttributes.value} AS int)`.as("last_rated_at"),
      })
      .from(itemAttributes)
      .where(eq(itemAttributes.key, "last_rated_at")),
  );

const ratingDeviations = (qb: QueryBuilder) =>
  qb.$with("rating_deviations").as((qb) =>
    qb
      .select({
        itemId: itemAttributes.entity_id,
        rd: sql<number>`CAST(${itemAttributes.value} AS real)`.as("rd"),
      })
      .from(itemAttributes)
      .where(eq(itemAttributes.key, "rd")),
  );

const volatilities = (qb: QueryBuilder) =>
  qb.$with("volatilities").as((qb) =>
    qb
      .select({
        itemId: itemAttributes.entity_id,
        volatility: sql<number>`CAST(${itemAttributes.value} AS real)`.as("volatility"),
      })
      .from(itemAttributes)
      .where(eq(itemAttributes.key, "volatility")),
  );

export const itemsWithScore = (db: QueryBuilder) => {
  const _scores = scores(db);
  const _lastRatedAt = lastRatedAt(db);
  const _rds = ratingDeviations(db);
  const _volatilities = volatilities(db);
  return db
    .with(_scores, _lastRatedAt, _rds, _volatilities)
    .select({
      ...getTableColumns(items),
      score: _scores.score,
      last_rated_at: _lastRatedAt.last_rated_at,
      rd: _rds.rd,
      volatility: _volatilities.volatility,
    })
    .from(items)
    .leftJoin(_scores, eq(items.id, _scores.itemId))
    .leftJoin(_lastRatedAt, eq(items.id, _lastRatedAt.itemId))
    .leftJoin(_rds, eq(items.id, _rds.itemId))
    .leftJoin(_volatilities, eq(items.id, _volatilities.itemId));
};

export const scoredItems = sqliteView("items_with_score").as(itemsWithScore);
export type ScoredItem = typeof scoredItems.$inferSelect;
