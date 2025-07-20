import type { ItemFields } from "../parser";
import type { RangeFilter } from "../parser/range";

export type BareFilter = { type: "bare"; values: string[] };

export type ValueFilter = { type: "string"; value: string };

export type FilterComponent =
  | RangeFilter
  | ValueFilter
  | { type: "negated"; filter: FilterComponent };

export type Ordering =
  | {
      type: "ordering";
      field: ItemFields;
      ascending: boolean;
    }
  | {
      type: "ordering";
      random: true;
    };

export type Limit = { type: "limit"; value: number };

export type FieldPredicate = {
  type: "field";
  field: ItemFields;
  filter: FilterComponent;
};
