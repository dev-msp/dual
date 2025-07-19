import {
  createContext,
  createMemo,
  For,
  useContext,
  type JSX,
  Show,
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

const DataCell = (props: {
  index: number;
  children: JSX.Element[] | JSX.Element;
  class?: string;
  classList?: Record<string, boolean>;
}) => {
  const context = useContext(RowContext);
  if (!context) {
    throw new Error("DataCell must be used within a RowContext");
  }
  return (
    <div
      data-cell
      data-row-index={context.rowIndex}
      data-col-index={props.index}
      class={props.class}
      classList={props.classList}
      style={{ "grid-column": props.index + 1 }}
    >
      {props.children}
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
            xs.push({ ...props.columns.fields[x], accessorKey: x });
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
              <Show when={!column.hide}>
                <DataCell index={i()}>
                  <Title>{column.header}</Title>
                </DataCell>
              </Show>
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
                  <Show when={!column.hide}>
                    {(_) => {
                      return (
                        <DataCell index={j()}>
                          {column.cell ? (
                            <Dynamic
                              component={column.cell}
                              row={row}
                              value={row[column.accessorKey]}
                              absoluteRowIndex={i()}
                            />
                          ) : (
                            String(row[column.accessorKey] ?? "")
                          )}
                        </DataCell>
                      );
                    }}
                  </Show>
                )}
              </For>
            </RowContext.Provider>
          </div>
        )}
      </For>
    </div>
  );
};
