import "./app.css";

import { MetaProvider } from "@solidjs/meta";
import { of } from "rxjs";
import * as op from "rxjs/operators";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import { createStore } from "solid-js/store";
import { z } from "zod/v4";

import type { Ordering } from "../server/api";

import { TrackList } from "./components/TrackList";
import { observable } from "./lib/reactive";
import { elementStream } from "./lib/reactive/dom";
import { trackSchema, type Track } from "./schemas/track";

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

const trackIdSchema = z.number().positive();
type PlaybackEvent = z.infer<typeof playbackEventSchema>;
const playbackEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: "PLAY",
    trackId: trackIdSchema,
  }),
  z.object({
    type: "PLAY_PAUSE",
  }),
  z.object({
    type: "CLEAR_QUEUE",
  }),
  z.object({
    type: "ENQUEUE_NEXT",
    trackIds: z.array(trackIdSchema),
  }),
  z.object({
    type: "ENQUEUE_END",
    trackIds: z.array(trackIdSchema),
  }),
]);

const Controls = () => {
  return (
    <div class="flex items-center gap-2">
      <button
        class="border p-1"
        onClick={() => {
          // Handle play/pause logic
        }}
      >
        Play/Pause
      </button>
      <button
        class="border p-1"
        onClick={() => {
          // Handle clear queue logic
        }}
      >
        Clear Queue
      </button>
      <button
        class="border p-1"
        onClick={() => {
          // Handle enqueue next logic
        }}
      >
        Enqueue Next
      </button>
      <button
        class="border p-1"
        onClick={() => {
          // Handle enqueue end logic
        }}
      >
        Enqueue End
      </button>
    </div>
  );
};

type ListState = {
  tracks: { [trackId: number]: Track };
  listing: number[];
  selection: { [trackId: number]: boolean };
  loading: boolean;
  error: Error | null;
};

const [trackList, setTrackList] = createStore<ListState>({
  tracks: {},
  listing: [],
  selection: {},
  loading: false,
  error: null,
});

const tracks = createMemo(() =>
  trackList.listing.map((id) => trackList.tracks[id]),
);

export const App = () => {
  const [order, setOrder] = createSignal<Ordering[]>([
    { field: "albumartist", direction: "desc" },
  ]);

  const [tracksFromDb] = createResource(
    order,
    async (ord) => {
      const orderParam = ord.map((o) => `${o.field}:${o.direction}`).join(",");
      const resp = await fetch(`/api/tracks?order=${orderParam}`, {
        headers: { Accept: "application/json" },
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

  createEffect(() => {
    const fetched = tracksFromDb();
    setTrackList(
      "listing",
      fetched.map((x) => x.id),
    );
    setTrackList(
      "tracks",
      Object.fromEntries(fetched.map((track) => [track.id, track])),
    );
  });

  const audioEl = elementStream<HTMLAudioElement, HTMLAudioElement | null>(
    (el) => of(el),
    null,
  );
  const [currentTrack, setCurrentTrack] = createSignal<number | null>(null);

  const sub = observable(currentTrack)
    .pipe(
      op.map((trackId) =>
        trackId === null ? null : `/api/tracks/${trackId}/play`,
      ),
      op.withLatestFrom(audioEl.stream$),
      op.switchMap(async ([src, el]) => {
        if (!src) {
          if (el?.src) {
            el.pause();
            el.src = "";
          }
          return Promise.resolve();
        }
        if (el?.src === src) {
          return Promise.resolve();
        }
        if (el?.src) {
          el.pause();
        }
        if (el) {
          el.src = src;
          return el.play();
        }
      }),
    )
    .subscribe({ error: (err) => console.error("Audio playback error:", err) });

  onCleanup(() => sub.unsubscribe());

  return (
    <MetaProvider>
      <div class="absolute top-0 left-0 flex h-full w-full flex-col p-4">
        <div class="flex flex-row items-start p-4">
          <Controls />
          <Order
            value={order()}
            onChange={setOrder}
            options={["artist", "album", "title", "length", "score", "added"]}
          />
        </div>

        <audio
          ref={audioEl.ref}
          class="absolute bottom-0 left-0 w-full"
          preload="metadata"
        />

        <div class="relative h-3/4 grow">
          <div class="absolute h-full w-full overflow-y-scroll">
            <TrackList
              onPlay={(x) => setCurrentTrack(x.id)}
              tracks={tracks()}
            />
          </div>
        </div>
      </div>
    </MetaProvider>
  );
};
