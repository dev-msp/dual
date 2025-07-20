import { createMemo, For, type Component } from "solid-js";

import type { Track } from "../../schemas/track";

import { DataRow, HeaderRow } from "./Row";
import { type ColumnDefs, type FieldsTypes } from "./types";

type RowGroup<T, GroupKey = never> = {
  key: GroupKey | keyof T;
  rows: T[];
};

const looseGroups = <T, GroupKey = never>(
  groupKey: GroupKey extends never ? keyof T : (row: T) => GroupKey,
  rows: T[],
): RowGroup<T, GroupKey>[] => {
  // the idea is that collections are grouped in-place; no re-collection
  return rows.reduce(
    (xs, x) => {
      const thisKey =
        typeof groupKey === "function" ? groupKey(x) : (groupKey as keyof T);
      let group = xs[-1];
      if (!group || group.key !== thisKey) {
        group = {
          key: thisKey,
          rows: [],
        };
        xs.push(group);
      }
      group.rows.push(x);
      return xs;
    },
    [] as RowGroup<T, GroupKey>[],
  );
};

const albumArt: {
  component: Component<{ row: Track; group: Track[] }>;
} & Pick<RowGroup<Track>, "key"> = {
  key: "album_id",
  component: (props) => (
    <div class="flex content-center items-center">
      <img
        class="aspect-square w-[500px]"
        src={`/api/albums/${props.row.album_id}/artwork`}
      />
    </div>
  ),
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
