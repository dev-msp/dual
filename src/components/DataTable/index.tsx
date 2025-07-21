import { createMemo, For } from "solid-js";

import { DataRow, HeaderRow } from "./Row";
import { type ColumnDefs, type FieldsTypes } from "./types";

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
        [] as FieldsTypes<T, K>[],
      )
      .filter((c) => !!c),
  );

  const gridTemplateColumns = createMemo(() =>
    orderedColumns()
      .map((c) => c.size ?? "1fr")
      .join(" "),
  );

  const allRows = (
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
  );

  return (
    <div
      class="relative grid min-h-full gap-x-2 bg-inherit **:data-title:font-bold"
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

      {allRows}
    </div>
  );
};
