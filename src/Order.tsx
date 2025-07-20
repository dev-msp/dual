import { createMemo, For, Show } from "solid-js";

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
      break;
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
      break;
    }
  }
};

export const Order = (props: OrderProps) => {
  const orderedOptions = createMemo((): OrderWithSelection[] => {
    const selectedValues = props.value.map((o) => o.field);
    const s = new Set(selectedValues);
    const unselected = props.options.filter((o) => !s.has(o));
    return [
      ...props.value.map((o) => ({ ...o, selected: true })),
      ...unselected.map((field) => ({ selected: false, field })),
    ];
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
            onClick={() => {
              console.log("Change order", option);
              props.onClick({ type: "toggle", field: option.field });
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
