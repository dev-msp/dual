import { createContext, For, type ComponentProps, type JSX } from "solid-js";

import { Title } from "../../lib/components/title";

import { DataCell, LiteralCell } from "./Cell";
import { type FieldsTypes } from "./types";

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
      data-header-row
      data-row-index={props.index}
      classList={{
        // "*:bg-primary grid cursor-pointer grid-cols-subgrid text-sm select-none": true,
        "data-row": true,
        "odd:*:bg-alt": props.index >= 0,
      }}
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
            <Title>{column.header}</Title>
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
            <DataCell
              class="cell u-no-wrap"
              index={j()}
              row={props.row}
              column={column}
            />
          )}
        </For>
      </RowContext.Provider>
    </BaseRow>
  );
};
