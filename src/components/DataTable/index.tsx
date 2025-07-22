import { createMemo, For, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { DataRow, HeaderRow } from "./Row";
import type { ColumnDefs, FieldsTypes } from "./types";

const groupInPlace = <T extends Record<string, any>, K extends keyof T>(
  data: T[],
  groupKey: K,
) =>
  data.reduce(
    (acc, item) => {
      const key = String(item[groupKey]);
      const lastGroup = acc[acc.length - 1];
      if (lastGroup?.key === key) {
        lastGroup.items.push(item);
      } else {
        acc.push({ key: key, items: [item] });
      }
      return acc;
    },
    [] as { key: string; items: T[] }[],
  );

export const DataTable = <
  T extends Record<string, any>,
  K extends keyof T,
>(props: {
  data: T[];
  onRowDblClick: (item: T) => void;
  columns: ColumnDefs<T, K>;
  groupBy?: K;
  GroupComponent?: (props: {
    groupKey: string;
    items: T[];
    columns: FieldsTypes<T, K>[];
    onRowDblClick: (item: T) => void;
  }) => JSX.Element;
  groupColumnSize?: string;
}) => {
  const groupedData = createMemo(() =>
    props.groupBy ? groupInPlace(props.data, props.groupBy) : [],
  );

  const orderedColumns = createMemo(() => {
    return props.columns.order
      .reduce(
        (xs, x) => {
          if (props.groupBy && x === props.groupBy) return xs;
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
      .filter((c) => !!c);
  });

  const gridTemplateColumns = createMemo(() => {
    const dataColumnsTemplate = orderedColumns()
      .map((c) => c.size ?? "1fr")
      .join(" ");

    return props.groupBy && props.groupColumnSize
      ? `${props.groupColumnSize} ${dataColumnsTemplate}`
      : dataColumnsTemplate;
  });

  return (
    <div
      class="relative grid min-h-full gap-x-2 bg-inherit p-2 **:data-title:font-bold"
      style={{
        "grid-template-rows": "min-content auto",
        "grid-template-columns": gridTemplateColumns(),
      }}
    >
      <div class="sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid bg-inherit py-2">
        {props.groupBy && <div class="col-start-1 row-start-1"></div>}
        <div
          class="grid"
          style={{
            "grid-column": props.groupBy ? "2 / -1" : "1 / -1",
            "grid-template-columns": "subgrid",
          }}
        >
          <HeaderRow columns={orderedColumns()} />
        </div>
        <div class="relative col-span-full row-start-2 h-[0.5px] bg-gray-700" />
      </div>

      {props.groupBy && props.GroupComponent ? (
        <For each={groupedData()}>
          {(group) => (
            <Dynamic
              component={props.GroupComponent}
              groupKey={group.key}
              items={group.items}
              columns={orderedColumns()}
              onRowDblClick={props.onRowDblClick}
            />
          )}
        </For>
      ) : (
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
      )}
    </div>
  );
};
