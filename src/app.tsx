import "./app.css";

import { MetaProvider } from "@solidjs/meta";
import { createEffect, createResource, createSignal, For } from "solid-js";
import { z } from "zod/v4";

import type { Ordering } from "../server/api";

type Track = z.infer<typeof trackSchema>;

const trackSchema = z.object({
  id: z.number(),
  album_id: z.number().nullable(),
  disc: z.number().nullable(),
  track: z.number().nullable(),
  original_year: z.number().nullable(),
  original_month: z.number().nullable(),
  original_day: z.number().nullable(),
  title: z.string(),
  artPath: z.string().nullable(),
  artist: z.string().nullable(),
  artist_sort: z.string().nullable(),
  album: z.string(),
  albumartist: z.string().nullable(),
  albumartist_sort: z.string().nullable(),
  score: z.number().nullable(),
});

const TrackList = (props: { tracks: Track[] }) => {
  const minScore = () =>
    Math.min(...props.tracks.map((track) => track.score ?? Infinity));
  const maxScore = () =>
    Math.max(...props.tracks.map((track) => track.score ?? 0));

  const scoreRangeToWidth = (score: number, maxWidth: number = 100) => {
    if (score === null || score === undefined) return "0px";
    const range = maxScore() - minScore();
    if (range === 0) return "0%";
    const width = ((score - minScore()) / range) * 100;
    return `${Math.min(width, maxWidth)}%`;
  };

  return (
    <div class="grid grid-flow-row grid-cols-4 gap-2 **:data-title:font-bold">
      <div data-header-row data-row class="contents">
        <div
          data-title
          class="overflow-hidden text-lg text-nowrap overflow-ellipsis"
        >
          Title
        </div>
        <div data-title>Artist</div>
        <div data-title>Album</div>
        <div>
          <span data-title>Score</span>
          <div class="flex justify-between *:text-xs">
            <span>{minScore()}</span>
            <span>{maxScore()}</span>
          </div>
        </div>
      </div>
      <For each={props.tracks}>
        {(track, i) => (
          <div data-row data-row-index={i()} class="contents">
            <div
              data-row-index={i()}
              class="overflow-hidden text-lg font-bold text-nowrap overflow-ellipsis"
            >
              {track.title}
            </div>
            <div data-row-index={i()}>
              <span> {track.albumartist} </span>
            </div>
            <div data-row-index={i()}>{track.album}</div>
            <div data-row-index={i()}>
              <div
                class="h-4 rounded bg-gray-200"
                style={{ width: scoreRangeToWidth(track.score ?? 0, 90) }}
              >
                <div class="h-full rounded bg-blue-500" />
              </div>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

type OrderProps = {
  value: Ordering[];
  onChange: (order: Ordering[]) => void;
  options: Ordering["field"][];
};

const Order = (props: OrderProps) => {
  return (
    <div class="flex items-start gap-2">
      <label for="order">Order by:</label>
      <select
        id="order"
        class="border p-1"
        multiple
        value={props.value.map((o) => o.field)}
        onChange={(e) => {
          const selectedOptions = Array.from(
            e.currentTarget.selectedOptions,
          ).map((option) => option.value as Ordering["field"]);
          props.onChange(
            selectedOptions.map((field) => ({ field, direction: "desc" })),
          );
        }}
      >
        {props.options.map((option) => (
          <option value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
};

export const App = () => {
  const [order, setOrder] = createSignal<Ordering[]>([
    { field: "score", direction: "desc" },
  ]);
  createEffect(() => {
    console.log(JSON.stringify(order()));
  });

  const [tracks] = createResource(
    order,
    async (ord) => {
      const orderParam = ord.map((o) => `${o.field}:${o.direction}`).join(",");
      const resp = await fetch(`/api/tracks?order=${orderParam}&limit=400`, {
        headers: {
          Accept: "application/json",
        },
      });
      try {
        return z.array(trackSchema).parse(await resp.json());
      } catch (e) {
        if (e instanceof z.ZodError) {
          console.error("Validation error:", e.issues);
        }
        throw e;
      }
    },
    { initialValue: [] },
  );

  return (
    <MetaProvider>
      <div class="flex min-h-full flex-col p-4">
        <header class="flex items-center justify-between">
          <div class="text-4xl font-bold">Title</div>
        </header>

        <div class="flex items-start p-4">
          <Order
            value={order()}
            onChange={setOrder}
            options={["artist", "album", "title", "score"]}
          />
        </div>

        <TrackList tracks={tracks()} />

        <footer class="flex justify-center p-4 text-xs">
          <p>© 2025</p>
        </footer>
      </div>
    </MetaProvider>
  );
};
