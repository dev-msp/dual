import { useContext, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { RowContext } from "./Row";
import { type FieldsTypes } from "./types";

export const LiteralCell = (props: {
  index: number;
  class?: string;
  className?: { [className: string]: boolean };
  children: JSX.Element[] | JSX.Element;
}) => (
  <div data-cell data-col-index={props.index}>
    {props.children}
  </div>
);

export const DataCell = <T, K extends keyof T>(props: {
  index: number;
  column: FieldsTypes<T, K>;
  row: T;
  class?: string;
  classList?: Record<string, boolean>;
}) => {
  const context = useContext(RowContext);
  if (!context) {
    throw new Error("DataCell must be used within a RowContext");
  }
  return props.column.cell ? (
    <Dynamic
      component={props.column.cell}
      data-cell
      data-row-index={context.rowIndex}
      data-col-index={props.index}
      class={props.class}
      classList={{}}
      style={{
        "grid-column": props.index + 1,
        width: props.column.size,
      }}
      row={props.row}
      value={props.row[props.column.accessorKey]}
      absoluteRowIndex={context.rowIndex}
    />
  ) : (
    String(props.row[props.column.accessorKey] ?? "")
  );
};
