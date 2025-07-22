import { createEffect, createMemo, For, Show } from "solid-js";

import type { Track } from "./schemas/track";

type Ordering = {
  field: keyof Track;
  direction?: "asc" | "desc";
};

const orderDisplay: Partial<Record<keyof Track, string>> = {
  disc: "Disc",
  track: "Track",
  length: "Length",
  added: "Added",
  original_year: "Year",
  original_month: "Month",
  original_day: "Day",
  title: "Title",
  artist: "Artist",
  album: "Album",
  albumartist: "Album Artist",
  score: "Score",
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
    <div class="flex w-full flex-wrap items-start gap-2 text-sm select-none">
      <For each={orderedOptions()}>
        {(option) => (
          <div
            tabindex={1}
            data-selected={option.selected}
            class="primary rounded-2xl px-2 py-1"
            onKeyPress={(e) => {
              if (e.target === document.activeElement && e.key === " ") {
                props.onClick({ type: "toggle", field: option.field });
              }
            }}
            onClick={(e) => onClickOption(e, option)}
          >
            <span classList={{ "font-bold": option.selected }}>
              {orderDisplay[option.field] ?? option.field}
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
      <div class="float-right text-xl">&#x21BA;</div>
    </div>
  );
};
