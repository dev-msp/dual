import "./app.scss";

import { MetaProvider } from "@solidjs/meta";
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
import { AudioPlayer } from "./lib/AudioPlayer";
import { nextDirection, Order } from "./Order";
import { trackSchema, type Track } from "./schemas/track";


type ListState = {
  tracks: { [trackId: number]: Track };
  listing: number[];
  selection: { [trackId: number]: boolean };
  loading: boolean;
  order: { [K in keyof Track]?: "asc" | "desc" };
  error: Error | null;
};

const initialOrder: ListState["order"] = {
  albumartist: "asc",
  original_year: "desc",
  disc: "asc",
  track: "asc",
};

const [trackList, setTrackList] = createStore<ListState>({
  tracks: {},
  listing: [],
  selection: {},
  order: initialOrder,
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
  "last_rated_at",
  "added",
];

export const App = () => {
  const tracks = createMemo(() =>
    trackList.listing.map((id) => trackList.tracks[id]),
  );

  const order = createMemo(() =>
    ORDER_OPTIONS.reduce(
      (xs, x) => {
        const direction = trackList.order[x];
        if (direction) {
          xs.push({ field: x, direction });
        }
        return xs;
      },
      [] as { field: keyof Track; direction: "asc" | "desc" }[],
    ),
  );

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

  // Set up audio player for track playback
  const player = new AudioPlayer();
  const [isPlaying, setIsPlaying] = createSignal(false);

  // Wire up player callbacks to SolidJS signals
  player.setOnPlayingChanged(setIsPlaying);

  // Handle track double-click from TrackList
  const handlePlayTrack = async (track: Track) => {
    await player.play(track.id);
  };

  onCleanup(() => {
    player.destroy();
  });

  return (
    <MetaProvider>
      <div class="container app-container">
        <Order
          onReset={() => setTrackList("order", initialOrder)}
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

        <div
          style={{
            padding: "0 var(--space-2)",
            margin: "0 calc(-1*var(--space-2))",
            "overflow-y": "scroll",
          }}
        >
          <TrackList onPlay={handlePlayTrack} tracks={tracks()} />
        </div>
      </div>
    </MetaProvider>
  );
};
