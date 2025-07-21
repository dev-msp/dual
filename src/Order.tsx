import { createEffect, createMemo, For, Show } from "solid-js";

import type { Ordering } from "../server/api";

export type OrderProps = {
  value: Ordering[];
  options: Ordering["field"][];
  onClick: (ch: OrderChange) => void;
};

const nextDirection = (direction?: Ordering["direction"]) => {
  switch (direction) {
    case "asc":
      return "desc";
    case "desc":
      return undefined;
    default:
      return "asc";
  }
};

type OrderWithSelection = Omit<Ordering, "direction"> & {
  direction?: Ordering["direction"];
  selected: boolean;
};

export type OrderChange = {
  type: "append" | "replace" | "toggle";
  field: Ordering["field"];
};

export const changeOrder = (order: Ordering[], ch: OrderChange) => {
  console.log(order, ch);
  const newOrder: Ordering = { field: ch.field, direction: "asc" };
  switch (ch.type) {
    case "append": {
      console.log("Append order", newOrder);
      order.push(newOrder);
      return;
    }
    case "toggle": {
      console.log("Toggle order", newOrder);
      for (let i = 0; i < order.length; i++) {
        if (order[i].field !== ch.field) continue;
        const dir = nextDirection(order[i].direction);
        if (dir) {
          console.log("Change direction", dir);
          order[i].direction = dir;
        } else {
          console.log("Remove order", order[i]);
          order.splice(i, 1);
        }
        return;
      }
      console.log("Add order", newOrder);
      order.push(newOrder);
      return;
    }
    case "replace": {
      order.splice(0, order.length, newOrder);
      return;
    }
  }
};

export const Order = (props: OrderProps) => {
  const orderedOptions = createMemo((): OrderWithSelection[] => {
    const selection = new Map(props.value.map((o) => [o.field, o] as const));
    return props.options.map((field) => {
      const fromSel = selection.get(field)?.direction;
      return { selected: !!fromSel, field, direction: fromSel };
    });
  });

  createEffect(() => {
    console.log(JSON.stringify(orderedOptions(), null, 2));
  });

  return (
    <div class="flex flex-wrap items-start gap-2">
      <For each={orderedOptions()}>
        {(option) => (
          <div
            class="rounded-2xl px-2 py-1"
            classList={{
              "border border-black": !option.selected,
            }}
            onClick={(evt) => {
              console.log("Change order", option);
              props.onClick({
                type: option.selected
                  ? "toggle"
                  : evt.shiftKey
                    ? "append"
                    : "replace",
                field: option.field,
              });
            }}
          >
            <span
              classList={{
                "font-bold": option.selected,
              }}
            >
              {option.field}
            </span>
            <Show when={option.direction}>
              {(dir) => <span>{dir() === "asc" ? "\u2191" : "\u2193"}</span>}
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};
