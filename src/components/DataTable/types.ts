import { type Component, type ComponentProps } from "solid-js";

export interface CellContext<T> {
  row: T; // the full data object for the row
  absoluteRowIndex: number; // the true index in the full dataset
}

export type KeyedCellContext<T, K extends keyof T> = CellContext<T> & {
  value: T[K];
};

export type ColumnField<T, Ctx extends KeyedCellContext<T, keyof T>, P> = {
  hide?: boolean; // whether to hide this column
  primaryField?: boolean;
  header: string; // the header text for this column
  size?: string; // css grid-template-columns value (e.g. "1fr", "200px")
  cell?: Component<Ctx & P>;
};

type Div = ComponentProps<"div">;

// defines the set of possible table columns
export type ColumnDefs<T, K extends keyof T, P = Div> = {
  order: K[];
  fields: {
    [K in keyof T]?: ColumnField<T, KeyedCellContext<T, K>, P> & {
      accessorKey: K;
    };
  };
};

export type FieldsTypes<
  T,
  K extends keyof T,
  Defs extends ColumnDefs<T, K> = ColumnDefs<T, K>,
> = NonNullable<Defs["fields"][K]>;
