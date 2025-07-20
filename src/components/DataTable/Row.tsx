import { createContext, For } from "solid-js";

import { propsOverride } from "../../lib/components";

import { DataCell, LiteralCell } from "./Cell";
import { type ColumnDefs, type FieldsTypes } from "./types";

const Title = propsOverride("div", {
  "data-title": true,
  class: "overflow-x-hidden text-[110%] text-nowrap overflow-ellipsis",
});

export const RowContext = createContext<{ rowIndex: number }>();

export const HeaderRow = <T, K extends keyof T>(props: {
  columns: NonNullable<FieldsTypes<ColumnDefs<T, K>, T, K>>[];
}) => {
  return (
    <div data-row data-row-index={-1} class="contents">
      <For each={props.columns}>
        {(column, i) => (
          <LiteralCell index={i()}>
            <Title>{column.header}</Title>
          </LiteralCell>
        )}
      </For>
    </div>
  );
};

export const DataRow = <T, K extends keyof T>(props: {
  index: number;
  row: T;
  columns: NonNullable<FieldsTypes<ColumnDefs<T, K>, T, K>>[];
  onRowDblClick: (item: T) => void;
}) => {
  return (
    <div
      data-row
      data-row-index={props.index}
      class="grid cursor-pointer grid-cols-subgrid"
      style={{ "grid-column": "1 / -1" }}
      onDblClick={() => props.onRowDblClick(props.row)}
    >
      <RowContext.Provider value={{ rowIndex: props.index }}>
        <For each={props.columns}>
          {(column, j) => (
            <DataCell index={j()} row={props.row} column={column} />
          )}
        </For>
      </RowContext.Provider>
    </div>
  );
};
