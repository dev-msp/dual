import { and, desc, like, not, or, sql, type SQLWrapper } from "drizzle-orm";
import * as sqlCore from "drizzle-orm/sqlite-core";

import type { Db } from "../../server/db";
import { itemsWithScore } from "../../server/db/query";

import type { BareFilter, FieldPredicate, Ordering } from "./filter";
import type { ItemFields } from "./parser";
import type { DateRangeValue } from "./parser/range";

export type Query = {
  limit?: number;
  order?: Ordering[];
  fields: FieldPredicate[];
  raw?: BareFilter[];
};

const scoredItems = sqlCore.sqliteView("items_with_score").as(itemsWithScore);

const isNil = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

const rangeToSql = <T extends number | SQLWrapper>(
  col: SQLWrapper,
  min: T | undefined,
  max: T | undefined,
): SQLWrapper => {
  if (!isNil(min) && !isNil(max)) {
    return sql`${col} between ${min} and ${max}`;
  } else if (!isNil(min)) {
    return sql`${col} >= ${min}`;
  } else if (!isNil(max)) {
    return sql`${col} <= ${max}`;
  } else {
    throw new Error("filter must have at least one of min or max");
  }
};

const dateToSql = ({ type, seconds }: DateRangeValue): SQLWrapper => {
  if (type === "relative") {
    return sql`(unixepoch() + ${seconds})`;
  } else if (type === "absolute") {
    return sql`datetime(${seconds}, 'unixepoch')`;
  }
  throw new Error(`unknown date type: ${type as string}`);
};

const numericToSql = (
  val: DateRangeValue | number | undefined,
): SQLWrapper | undefined => {
  if (val === undefined) {
    return undefined;
  }
  if (typeof val === "number") {
    return sql`${val}`;
  }
  return dateToSql(val);
};

export const fieldToClause = ({
  field,
  filter,
}: FieldPredicate): SQLWrapper | undefined => {
  const isNegated = filter.type === "negated";
  const actualFilter = isNegated ? filter.filter : filter;
  let clause: SQLWrapper | undefined;
  const col = scoredItems[field];
  switch (actualFilter.type) {
    case "string": {
      if (!(col instanceof sqlCore.SQLiteColumn) || col.dataType !== "string") {
        throw new Error(`field ${field} is not a string`);
      }
      clause = like(col, `%${actualFilter.value}%`);
      break;
    }

    case "date":
    case "duration":
    case "number": {
      if (col instanceof sqlCore.SQLiteColumn && col.dataType !== "number") {
        throw new Error(`field ${field} is not a number`);
      }
      const { min, max } = actualFilter;
      clause = rangeToSql(col, numericToSql(min), numericToSql(max));
      break;
    }

    default: {
      throw new Error(`unknown filter type: ${filter.type}`);
    }
  }

  return clause && isNegated ? not(clause) : clause;
};

const fallbackClause = (value: string) =>
  or(
    ...(["title", "album", "albumartist", "artist"] as ItemFields[]).map(
      (field) =>
        fieldToClause({
          type: "field",
          field,
          filter: { type: "string", value },
        }),
    ),
  );

export const toQuery = (query: Query) => (db: Db) => {
  const subquery = db.$with("items_with_score").as(itemsWithScore);
  const q = db
    .with(subquery)
    .select()
    .from(scoredItems)
    .where(
      and(
        ...query.fields.map(fieldToClause),
        and(...(query.raw ?? []).flatMap((f) => f.values.map(fallbackClause))),
      ),
    )
    .orderBy((builder) =>
      (query.order ?? []).map((ordering) => {
        if ("random" in ordering) {
          return sql`random()`;
        }
        const { field, ascending } = ordering;
        return ascending ? builder[field] : desc(builder[field]);
      }),
    );
  return query.limit ? q.limit(query.limit) : q;
};
