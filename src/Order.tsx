import { createEffect, createMemo, For, Show } from "solid-js";

import type { Track } from "./schemas/track";

type Ordering = {
  field: keyof Track;
  direction?: "asc" | "desc";
};

export type OrderProps = {
  value: Ordering[];
  options: Ordering["field"][];
  onClick: (ch: OrderChange) => void;
};

export const nextDirection = (direction?: "asc" | "desc") => {
  switch (direction) {
    case "asc":
      return "desc";
    case "desc":
      return undefined;
    default:
      return "asc";
  }
};

type OrderWithSelection = {
  selected: boolean;
  field: keyof Track;
  direction?: "asc" | "desc";
};

export type OrderChange = {
  type: "append" | "replace" | "toggle";
  field: keyof Track;
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

  const onClickOption = (evt: MouseEvent, option: OrderWithSelection) => {
    console.log("Change order", option);
    props.onClick({
      type: option.selected ? "toggle" : evt.shiftKey ? "append" : "replace",
      field: option.field,
    });
  };
  return (
    <div class="flex flex-wrap items-start gap-2">
      <For each={orderedOptions()}>
        {(option) => (
          <div
            class="rounded-2xl px-2 py-1"
            classList={{
              "border border-gray-100": !option.selected,
              "text-gray-900 bg-gray-100": option.selected,
            }}
            onClick={(e) => onClickOption(e, option)}
          >
            <span
              classList={{
                "font-bold": option.selected,
              }}
            >
              {option.field}
            </span>
            <Show when={option.direction}>
              {(dir) => (
                <span class="font-bold">
                  {dir() === "asc" ? "\u2191" : "\u2193"}
                </span>
              )}
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};
