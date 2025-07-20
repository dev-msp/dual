import { createContext, createMemo, For, useContext, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { propsOverride } from "../../lib/components";

import { type ColumnDefs, type FieldsTypes } from "./types";

const Title = propsOverride("div", {
  "data-title": true,
  class: "overflow-x-hidden text-lg text-nowrap overflow-ellipsis",
});

const RowContext = createContext<{ rowIndex: number }>();

const LiteralCell = (props: {
  index: number;
  class?: string;
  className?: { [className: string]: boolean };
  children: JSX.Element[] | JSX.Element;
}) => (
  <div data-cell data-col-index={props.index}>
    {props.children}
  </div>
);

const DataCell = <T, K extends keyof T>(props: {
  index: number;
  column: NonNullable<FieldsTypes<ColumnDefs<T, K>, T, K>>;
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

const HeaderRow = <T, K extends keyof T>(props: {
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

const DataRow = <T, K extends keyof T>(props: {
  index: number;
  row: T;
  columns: NonNullable<FieldsTypes<ColumnDefs<T, K>, T, K>>[];
  onRowDblClick: (item: T) => void;
}) => {
  return (
    <div
      data-row
      data-row-index={props.index}
      class="contents"
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

export const DataTable = <
  T extends Record<string, any>,
  K extends keyof T,
>(props: {
  data: T[];
  onRowDblClick: (item: T) => void;
  columns: ColumnDefs<T, K>;
  group?: K;
}) => {
  const orderedColumns = createMemo(() =>
    props.columns.order
      .reduce(
        (xs, x) => {
          if (x in props.columns.fields) {
            const col = props.columns.fields[x];
            if (!col?.hide) {
              xs.push({ ...props.columns.fields[x], accessorKey: x });
            }
          }
          return xs;
        },
        [] as FieldsTypes<typeof props.columns, T, K>[],
      )
      .filter((c) => !!c),
  );

  const gridTemplateColumns = createMemo(() =>
    orderedColumns()
      .map((c) => c.size ?? "1fr")
      .join(" "),
  );

  return (
    <div
      class="relative grid min-h-full gap-2 bg-inherit **:data-title:font-bold"
      style={{
        // Header row and then remaining space for data
        "grid-template-rows": "min-content auto",
        "grid-template-columns": gridTemplateColumns(),
      }}
    >
      {/* Header Row */}
      <div class="sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid bg-inherit py-2">
        <HeaderRow columns={orderedColumns()} />
        <div class="relative col-span-full row-start-2 h-[0.5px] bg-gray-700" />
      </div>

      <For each={props.data}>
        {(row, i) => (
          <DataRow
            index={i()}
            row={row}
            columns={orderedColumns()}
            onRowDblClick={props.onRowDblClick}
          />
        )}
      </For>
    </div>
  );
};
