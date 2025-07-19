import { type JSX } from "solid-js";

export interface CellContext<T> {
  row: T; // the full data object for the row
  absoluteRowIndex: number; // the true index in the full dataset
}

export type KeyedCellContext<T, K extends keyof T> = CellContext<T> & {
  value: T[K];
};

export type ColumnField<T, Ctx extends KeyedCellContext<T, keyof T>> = {
  hide?: boolean; // whether to hide this column
  header: string; // the header text for this column
  size?: string; // css grid-template-columns value (e.g. "1fr", "200px")
  cell?: (context: Ctx) => JSX.Element; // custom rendering function for the cell
};

// defines the set of possible table columns
export type ColumnDefs<T, K extends keyof T> = {
  order: K[];
  fields: {
    [K in keyof T]?: ColumnField<T, KeyedCellContext<T, K>> & {
      accessorKey: K;
    };
  };
};

export type FieldsTypes<
  Defs extends ColumnDefs<T, K>,
  T,
  K extends keyof T,
> = Defs["fields"][K];
