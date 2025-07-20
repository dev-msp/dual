import { QueryBuilder } from "drizzle-orm/sqlite-core";
import * as p from "parjs";
import * as c from "parjs/combinators";

import { itemsWithScore } from "../../../server/db/query";
import type {
  FieldPredicate,
  Ordering,
  ValueFilter,
  FilterComponent,
  BareFilter,
  Limit,
} from "../filter";

import { pInt } from "./base";
import { prefixFlag } from "./combinator";
import { pName } from "./name";
import { pRange } from "./range";

export const itemFields = itemsWithScore(new QueryBuilder())._.selectedFields;
export type ItemFields = keyof typeof itemFields;

const softRecovery = <T>(): p.ParjsCombinator<T, T> =>
  c.recover(() => ({ kind: p.ResultKind.SoftFail }));

const pNonWhitespace = (maxLen?: number) =>
  p.noCharOf(" ").pipe(
    c.many1(maxLen),
    c.map((xs) => xs.join("")),
  );

const bareClause: p.Parjser<BareFilter> = c.pipe(
  pNonWhitespace(),
  c.map((values) => ({
    type: "bare",
    values: values.split(" ").filter((v) => v.length > 0),
  })),
);

const pStrictFieldName: p.Parjser<ItemFields> = c.pipe(
  pName,
  c.must(
    (fieldName) =>
      fieldName in itemFields || {
        kind: p.ResultKind.SoftFail,
      },
  ),
  c.map((fieldName) => fieldName as ItemFields),
);

const pValueFilter: p.Parjser<ValueFilter> = pNonWhitespace().pipe(
  c.map((value): ValueFilter => ({ type: "string", value })),
);

const pFieldValue: p.Parjser<FilterComponent> = pRange.pipe(c.or(pValueFilter));

const fieldClause = pStrictFieldName.pipe(
  c.thenq(":"),
  c.then(pFieldValue),
  softRecovery(),
  c.map(
    ([field, filter], { negateClause }): FieldPredicate => ({
      type: "field",
      field,
      filter: negateClause ? { type: "negated", filter } : filter,
    }),
  ),
  prefixFlag({
    prefix: "^",
    key: "negateClause",
  }),
);

const pRandom: p.Parjser<Ordering> = p
  .string("@random")
  .pipe(c.map(() => ({ type: "ordering", random: true })));

const pFieldOrdering: p.Parjser<Ordering> = pStrictFieldName.pipe(
  c.then(p.anyCharOf("-+")),
  softRecovery(),
  c.map(([field, orderChar]) => {
    return {
      type: "ordering",
      field,
      ascending: orderChar === "+",
    };
  }),
);

const pOrdering: p.Parjser<Ordering> = pFieldOrdering.pipe(c.or(pRandom));

const pLimit: p.Parjser<Limit> = p.anyCharOf("@").pipe(
  c.qthen(pInt),
  c.map((value) => ({ type: "limit", value })),
);

export const clause = pOrdering.pipe(c.or(pLimit, fieldClause, bareClause));

export const query = clause.pipe(
  c.manySepBy(" "),
  c.map((xs) => [...xs]),
);
