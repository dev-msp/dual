import { createContext, For, type ComponentProps, type JSX } from "solid-js";

import { propsOverride } from "../../lib/components";

import { DataCell, LiteralCell } from "./Cell";
import { type FieldsTypes } from "./types";

const Title = propsOverride("div", {
  "data-title": true,
  // class: "overflow-x-hidden text-nowrap overflow-ellipsis",
  class: "",
});

export const RowContext = createContext<{ rowIndex: number }>();

const BaseRow = (
  props: { index: number; children: JSX.Element } & Omit<
    ComponentProps<"div">,
    "class" | "classList"
  >,
) => {
  return (
    <div
      data-row
      data-row-index={props.index}
      classList={{
        "*:bg-primary grid cursor-pointer grid-cols-subgrid text-sm select-none": true,
        "odd:*:bg-alt": props.index >= 0,
      }}
      style={{ "grid-column": "1 / -1" }}
      {...props}
    >
      {props.children}
    </div>
  );
};

export const HeaderRow = <T, K extends keyof T>(props: {
  columns: FieldsTypes<T, K>[];
}) => {
  return (
    <BaseRow index={-1}>
      <For each={props.columns}>
        {(column, i) => (
          <LiteralCell index={i()}>
            <Title
            // TODO use data attr
            >
              {column.header}
            </Title>
          </LiteralCell>
        )}
      </For>
    </BaseRow>
  );
};

export const DataRow = <T, K extends keyof T>(props: {
  index: number;
  row: T;
  columns: FieldsTypes<T, K>[];
  onRowDblClick: (item: T) => void;
}) => {
  return (
    <BaseRow
      index={props.index}
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
    </BaseRow>
  );
};
