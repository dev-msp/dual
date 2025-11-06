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
  onReset: () => void;
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

const OrderOption = (props: {
  value: OrderWithSelection;
  onClick: (evt: MouseEvent, ows: OrderWithSelection) => void;
}) => {
  return (
    <div
      tabindex={1}
      data-selected={props.value.selected}
      // class="primary rounded-2xl px-2 py-1"
      class="option"
      onKeyPress={(e) => {
        if (e.target === document.activeElement && e.key === " ") {
          props.onClick(e as unknown as MouseEvent, props.value);
        }
      }}
      onClick={(e) => props.onClick(e, props.value)}
    >
      <span>{orderDisplay[props.value.field] ?? props.value.field}</span>
      <Show when={props.value.direction}>
        {(dir) => <span>{dir() === "asc" ? "\u2191" : "\u2193"}</span>}
      </Show>
    </div>
  );
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

  const onKey = (e: KeyboardEvent) => {
    const isEvent =
      e.target === document.activeElement && [" ", "Enter"].includes(e.key);
    if (isEvent) props.onReset();
  };

  return (
    <div class="order">
      <For each={orderedOptions()}>
        {(option) => <OrderOption value={option} onClick={onClickOption} />}
      </For>
      <div
        tabindex={1}
        role="button"
        onKeyPress={onKey}
        onClick={props.onReset}
      >
        &#x21BA;
      </div>
    </div>
  );
};
