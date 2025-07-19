import * as rx from "rxjs";
import {
  createContext,
  createMemo,
  createSignal,
  createEffect,
  For,
  useContext,
  type Accessor,
  type JSX,
  Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { observable } from "../../lib/reactive";
import { elementResizes, elementStream } from "../../lib/reactive/dom";

import {
  type ColumnDefs,
  type FieldsTypes,
  type KeyedCellContext,
} from "./types";
import { clamp } from "./utils";

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

const createPrevious = <T,>(source: Accessor<T>) => {
  const [previous, setPrevious] = createSignal<T | null>();

  createEffect<T>((prev) => {
    setPrevious(() => prev);
    return source();
  });

  return previous;
};

const combineRefs =
  <T,>(...refs: ((el: T) => void)[]) =>
  (el: T) =>
    refs.forEach((ref) => ref(el));

export const DataTable = <
  T extends Record<string, any>,
  K extends keyof T,
>(props: {
  data: T[];
  onRowDblClick: (item: T) => void;
  columns: ColumnDefs<T, K>;
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

  const maxVisibleRows = elementStream<HTMLDivElement, number>(
    (el) =>
      elementResizes(el).pipe(
        rx.map((size) => {
          if (!size) return 0;
          // Assuming each row is ~40px tall (adjust based on your actual row height)
          return Math.floor(size.height / 40);
        }),
      ),
    0,
  );
  const dataCount = createMemo(() => props.data.length);

  const scrolled = elementStream<HTMLDivElement, number>((el) => {
    if (!el) return rx.of(0);
    return rx.fromEvent<WheelEvent>(el, "wheel").pipe(
      rx.throttleTime(1e3 / 60, rx.animationFrameScheduler),
      rx.withLatestFrom(observable(dataCount), maxVisibleRows.stream$),
      rx.scan((scrolled, [evt, count]) => {
        const delta = Math.floor(evt.deltaY / 1.6);
        return clamp(scrolled + delta, 0, count - (maxVisibleRows() ?? 0) + 1);
      }, 0),
    );
  }, 0);

  const previousMaxVisibleRows = createPrevious(maxVisibleRows);

  const visibleRowRange = () => {
    const n = dataCount();
    const maxRows = Math.max(maxVisibleRows(), previousMaxVisibleRows() ?? 0);
    if (n === 0 || maxRows === 0) return { start: 0, end: 0 };

    const currentScroll = scrolled();
    const clampedScroll = Math.min(Math.max(0, currentScroll), n - 1);

    const start = Math.min(clampedScroll, Math.max(0, n - maxRows));
    const end = Math.max(start, Math.min(n - 1, start + maxRows - 1));

    return { start, end };
  };

  const visibleRows = createMemo(() => {
    const { start, end } = visibleRowRange();
    return props.data.slice(start, end + 1);
  });

  const gridTemplateColumns = createMemo(() =>
    orderedColumns()
      .map((c) => c.size ?? "1fr")
      .join(" "),
  );

  return (
    <div
      class="relative grid h-full gap-3 overflow-y-hidden **:data-title:font-bold"
      ref={combineRefs(maxVisibleRows.ref, scrolled.ref)}
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

      <For each={visibleRows()}>
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
                      const context: KeyedCellContext<T, K> = {
                        row,
                        value: row[column.accessorKey],
                        absoluteRowIndex: scrolled() + i(),
                      };
                      const renderable = column.cell ? (
                        <Dynamic component={column.cell} {...context} />
                      ) : (
                        String(context.value ?? "")
                      );
                      return <DataCell index={j()}>{renderable}</DataCell>;
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
