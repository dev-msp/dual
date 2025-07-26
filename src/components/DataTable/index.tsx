import { createMemo, For, Match, Switch, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import { DataRow, HeaderRow } from "./Row";
import type { ColumnDefs, FieldsTypes } from "./types";

type Rec = Record<string, any>;

type TableProps<T extends Rec, K extends keyof T> = {
  data: T[];
  onRowDblClick: (item: T) => void;
  columns: ColumnDefs<T, K>;
  groupBy?: K;
  GroupComponent?: Component<{
    groupKey: string;
    items: T[];
    columns: FieldsTypes<T, K>[];
    onRowDblClick: (item: T) => void;
  }>;
  groupColumnSize?: string;
};
const groupInPlace = <T extends Rec, K extends keyof T>(
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

export const DataTable = <T extends Rec, K extends keyof T>(
  props: TableProps<T, K>,
) => {
  const groupedData = createMemo(() =>
    props.groupBy ? groupInPlace(props.data, props.groupBy) : [],
  );

  const orderedColumns = createMemo(() => {
    return props.columns.order
      .reduce(
        (xs, x) => {
          if (props.groupBy === x) return xs;
          const col = props.columns.fields[x];
          if (!col?.hide) {
            xs.push({ ...col, accessorKey: x });
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

  const nonGroupedFallback = (
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
      // class="primary relative grid min-h-full gap-x-2 p-2 first:-mt-2 **:data-title:font-medium"
      data-grouped={!!props.groupBy}
      class="data-table"
      style={{
        "grid-template-rows": "min-content auto",
        "grid-template-columns": gridTemplateColumns(),
      }}
    >
      <div
        // class="primary sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid gap-2"
        class="table-header"
      >
        <div
          data-when-grouped
          data-cosmetic
          style={{ "grid-column-start": "1", "grid-row-start": "1" }}
        />
        <div
          // TODO use data-grouped to decide grid column in css
          // class="grid grid-cols-subgrid"
          // style={{ "grid-column": props.groupBy ? "2 / -1" : "1 / -1" }}
          class="row-subgrid"
        >
          <HeaderRow columns={orderedColumns()} />
        </div>
        <div
          data-cosmetic
          class="row-divider"
          // class="bg-invert relative col-span-full row-start-2 h-[0.5px]"
        />
      </div>

      <Switch fallback={nonGroupedFallback}>
        <Match when={props.groupBy && props.GroupComponent}>
          {(_) => (
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
          )}
        </Match>
      </Switch>
    </div>
  );
};
