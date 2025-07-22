import { createContext, For } from "solid-js";

import { propsOverride } from "../../lib/components";

import { DataCell, LiteralCell } from "./Cell";
import { type FieldsTypes } from "./types";

const Title = propsOverride("div", {
  "data-title": true,
  class: "overflow-x-hidden text-nowrap overflow-ellipsis",
});

export const RowContext = createContext<{ rowIndex: number }>();

export const HeaderRow = <T, K extends keyof T>(props: {
  columns: FieldsTypes<T, K>[];
}) => {
  return (
    <div data-row data-row-index={-1} class="contents *:text-sm">
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
  columns: FieldsTypes<T, K>[];
  onRowDblClick: (item: T) => void;
}) => {
  return (
    <div
      data-row
      data-row-index={props.index}
      tabindex={2}
      class="odd:*:bg-alt *:bg-primary grid cursor-pointer grid-cols-subgrid text-sm select-none"
      style={{ "grid-column": "1 / -1" }}
      onDblClick={(e) => {
        e.preventDefault();
        e.currentTarget.focus();
        return props.onRowDblClick(props.row);
      }}
      onKeyPress={(e) => {
        if (document.activeElement !== e.currentTarget) return;
        if (e.key === "Enter") props.onRowDblClick(props.row);
      }}
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
