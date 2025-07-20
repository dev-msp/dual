import {
  createContext,
  createMemo,
  For,
  useContext,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { type ColumnDefs, type FieldsTypes } from "./types";

// internal components and context
const Title = (props: { children: JSX.Element[] | JSX.Element }) => (
  <div data-title class="overflow-hidden text-lg text-nowrap overflow-ellipsis">
    {props.children}
  </div>
);

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
      class="relative grid h-full gap-3 **:data-title:font-bold"
      style={{
        "grid-template-rows": "min-content auto", // Header row and then remaining space for data
        "grid-template-columns": gridTemplateColumns(),
      }}
    >
      {/* Header Row */}
      <div class="sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid">
        <RowContext.Provider value={{ rowIndex: -1 }}>
          <For each={orderedColumns()}>
            {(column, i) => (
              <LiteralCell index={i()}>
                <Title>{column.header}</Title>
              </LiteralCell>
            )}
          </For>
        </RowContext.Provider>
      </div>

      <div class="relative col-span-full row-start-2 h-[0.5px] bg-gray-700" />

      <For each={props.data}>
        {(row, i) => (
          <div
            data-row
            data-row-index={i()}
            class="contents"
            onDblClick={() => {
              props.onRowDblClick(row);
            }}
          >
            <RowContext.Provider value={{ rowIndex: i() }}>
              <For each={orderedColumns()}>
                {(column, j) => (
                  <DataCell index={j()} row={row} column={column} />
                )}
              </For>
            </RowContext.Provider>
          </div>
        )}
      </For>
    </div>
  );
};
