import { type JSX } from "solid-js";

export interface CellContext<T> {
  row: T; // the full data object for the row
  value: any; // the specific value for this cell
  absoluteRowIndex: number; // the true index in the full dataset
}

export type KeyedCellContext<T, K extends keyof T> = CellContext<T> & {
  value: T[K];
};

export type CustomCellContext<T, R> = CellContext<T> & { value: R };

export type ColumnField<T, Ctx extends CellContext<T>> = {
  hide?: boolean; // whether to hide this column
  header: string; // the header text for this column
  size?: string; // css grid-template-columns value (e.g. "1fr", "200px")
  cell?: (context: Ctx) => JSX.Element; // custom rendering function for the cell
};

type SomeMap = { [k: string]: unknown };

// defines the set of possible table columns
export type ColumnDefs<T, K extends keyof T, R extends SomeMap> = {
  order: (K | keyof R)[];
  customFields: {
    [RK in keyof R]: ColumnField<T, CustomCellContext<T, R[RK]>>;
  };
  fields: {
    [K in keyof T]?: ColumnField<T, KeyedCellContext<T, K>> & {
      accessorKey: K;
    };
  };
};

export type Context<T, K extends keyof T, R extends SomeMap> =
  | ({ type: "keyed" } & KeyedCellContext<T, K>)
  | ({ type: "custom" } & CustomCellContext<T, R[keyof R]>);

export type FieldsTypes<
  Defs extends ColumnDefs<T, K, R>,
  T,
  K extends keyof T,
  R extends SomeMap = never,
> = Defs["fields"][K] | Defs["customFields"][keyof R];
