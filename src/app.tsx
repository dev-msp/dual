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

import { TrackList } from "./components/TrackList";
import { observable } from "./lib/reactive";
import { elementStream } from "./lib/reactive/dom";
import { nextDirection, Order } from "./Order";
import { trackSchema, type Track } from "./schemas/track";

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

type ListState = {
  tracks: { [trackId: number]: Track };
  listing: number[];
  selection: { [trackId: number]: boolean };
  loading: boolean;
  order: { [K in keyof Track]?: "asc" | "desc" };
  error: Error | null;
};

const [trackList, setTrackList] = createStore<ListState>({
  tracks: {},
  listing: [],
  selection: {},
  // order: [
  //   { field: "albumartist", direction: "asc" },
  //   { field: "original_year", direction: "desc" },
  //   { field: "disc", direction: "asc" },
  //   { field: "track", direction: "asc" },
  // ],
  order: {
    albumartist: "asc",
    original_year: "desc",
    disc: "asc",
    track: "asc",
  },
  loading: false,
  error: null,
});

const ORDER_OPTIONS: (keyof Track)[] = [
  "original_year",
  "albumartist",
  "artist",
  "album",
  "disc",
  "track",
  "title",
  "length",
  "score",
  "added",
];

export const App = () => {
  const tracks = createMemo(() =>
    trackList.listing.map((id) => trackList.tracks[id]),
  );

  const order = createMemo(() => {
    console.log("order changed!");
    return ORDER_OPTIONS.reduce(
      (xs, x) => {
        const direction = trackList.order[x];
        if (direction) {
          xs.push({ field: x, direction });
        }
        return xs;
      },
      [] as { field: keyof Track; direction: "asc" | "desc" }[],
    );
  });

  createEffect(() => {
    console.log(order());
  });

  const [tracksFromDb] = createResource(
    order,
    async (ord) => {
      const orderParam = ord.map((o) => `${o.field}:${o.direction}`).join(",");
      const resp = await fetch(`/api/tracks?order=${orderParam}&limit=500`, {
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
    console.log("fetched!");
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
      <div class="mx-auto flex h-full w-7/8 max-w-[1600px] flex-col p-4 max-md:w-full">
        <div class="flex flex-row items-start p-4">
          <Order
            onClick={(ch) => {
              setTrackList("order", ch.field, nextDirection);
              if (ch.type === "replace") {
                const otherKeys = Object.keys(trackList.order).filter(
                  (x) => x !== ch.field,
                ) as (keyof Track)[];
                setTrackList("order", otherKeys, undefined);
              }
            }}
            value={order()}
            options={ORDER_OPTIONS}
          />
        </div>

        <div class="relative h-3/4 grow">
          <div class="absolute h-full w-full overflow-y-scroll bg-gray-900">
            <TrackList
              onPlay={(x) => setCurrentTrack(x.id)}
              tracks={tracks()}
            />
          </div>
        </div>

        <div id="player">
          <audio ref={audioEl.ref} class="hidden" preload="metadata" />
        </div>
      </div>
    </MetaProvider>
  );
};
