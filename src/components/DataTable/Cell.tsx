import { useContext, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { RowContext } from "./Row";
import { type FieldsTypes } from "./types";

export const LiteralCell = (props: {
  index: number;
  class?: string;
  classList?: { [className: string]: boolean };
  children: JSX.Element[] | JSX.Element;
}) => (
  <div
    data-cell
    data-col-index={props.index}
    classList={{
      ...props.classList,
      cell: true,
      ...(props.class ? { [props.class]: true } : {}),
    }}
  >
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
  const value = () => props.row[props.column.accessorKey];
  return (
    <div
      data-cell
      data-row-index={context.rowIndex}
      data-col-index={props.index}
      class={props.class}
      style={{ "grid-column": props.index + 1 }}
    >
      {props.column.cell ? (
        <Dynamic
          component={props.column.cell}
          row={props.row}
          value={value()}
          absoluteRowIndex={context.rowIndex}
        />
      ) : (
        String(value() ?? "")
      )}
    </div>
  );
};
