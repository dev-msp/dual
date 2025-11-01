import { createMemo, For, Match, Switch, type Accessor } from "solid-js";

import { AlbumGroup } from "../components/AlbumGroup";
import { NoWrap } from "../lib/components/title";
import { type Track } from "../schemas/track";

import { DataTable } from "./DataTable";
import { type ColumnDefs } from "./DataTable/types";

const createTrackColumns = <Keys extends keyof Track>(
  tracks: Track[],
  order: Keys[],
): ColumnDefs<Track, Keys> => {
  return {
    order: order,
    fields: {
      id: {
        accessorKey: "id",
        hide: true,
        header: "#",
        size: "min-content",
        cell: ({ absoluteRowIndex, ...props }) => (
          <div {...props}>{absoluteRowIndex + 1}</div>
        ),
      },
      disc: {
        accessorKey: "disc",
        hide: true,
        header: "Disc",
        size: "min-content",
        cell: (props) => <NoWrap>{props.value || ""}</NoWrap>,
      },
      track: {
        accessorKey: "track",
        header: "",
        size: "min-content",
        cell: (props) => <NoWrap>{props.value}</NoWrap>,
      },
      title: {
        accessorKey: "title",
        header: "Title",
        size: "3fr",
        cell: (props) => <NoWrap>{props.value}</NoWrap>,
      },
      length: {
        accessorKey: "length",
        header: "Duration",
        size: "min-content",
        cell: (props) => {
          const duration = props.value;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          return (
            <NoWrap>{`${minutes}:${seconds.toString().padStart(2, "0")}`}</NoWrap>
          );
        },
      },
      albumartist: {
        accessorKey: "albumartist",
        header: "Album artist",
        size: "2fr",
        cell: (props) => <NoWrap>{props.value ?? "-"}</NoWrap>,
      },
      album: {
        accessorKey: "album",
        header: "Album",
        size: "1fr",
        cell: (props) => <NoWrap>{props.value ?? "-"}</NoWrap>,
      },
      original_year: {
        accessorKey: "original_year",
        header: "Year",
        size: "min-content",
        cell: (props) => <NoWrap>{props.value || ""}</NoWrap>,
      },
      score: {
        accessorKey: "score",
        hide: true,
        header: "Score",
        size: "1fr",
        cell: (props) => (
          <NoWrap style={{ "text-align": "left" }}>
            {props.value !== null && props.value !== undefined ? props.value.toFixed(2) : "-"}
          </NoWrap>
        ),
      },
      last_rated_at: {
        accessorKey: "last_rated_at",
        hide: true,
        header: "Last Scored",
        size: "1fr",
        cell: (props) => {
          if (props.value === null || props.value === undefined) return <NoWrap>-</NoWrap>;

          const now = Math.floor(Date.now() / 1000);
          const diff = now - props.value;

          let timeStr: string;
          if (diff < 60) {
            timeStr = "just now";
          } else if (diff < 3600) {
            const mins = Math.floor(diff / 60);
            timeStr = `${mins} min${mins > 1 ? "s" : ""} ago`;
          } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            timeStr = `${hours} hr${hours > 1 ? "s" : ""} ago`;
          } else if (diff < 2592000) {
            const days = Math.floor(diff / 86400);
            timeStr = `${days} day${days > 1 ? "s" : ""} ago`;
          } else {
            const date = new Date(props.value * 1000);
            timeStr = date.toLocaleDateString();
          }

          return <NoWrap>{timeStr}</NoWrap>;
        },
      },
    },
  };
};

const AlbumGrid = (props: { albumIds: number[] }) => {
  return (
    <div
      // class="grid"
      // style={{
      //   "grid-template-columns":
      //     "repeat(auto-fill, minmax(200px, max-content))",
      //   "grid-template-rows": "repeat(200px)",
      // }}
      class="album-grid"
    >
      <For each={props.albumIds}>
        {(id) => (
          <div
          // class="p-1"
          >
            <img
              src={`/api/albums/${id}/artwork`}
              alt={`Album cover for album ID ${id}`}
              // class="size-full rounded-sm border-gray-400 object-cover shadow-lg not-dark:border not-dark:shadow-gray-400"
              loading="lazy"
            />
          </div>
        )}
      </For>
    </div>
  );
};

export const TrackList = (props: {
  onPlay: (track: Track) => void;
  tracks: Track[];
}) => {
  const columns = createMemo(() =>
    createTrackColumns(props.tracks, [
      "id",
      "disc",
      "track",
      "title",
      "length",
      "albumartist",
      "original_year",
      "score",
      "last_rated_at",
    ]),
  );

  const albumArtColumnSize = "auto";

  const albumIds: Accessor<number[]> = createMemo(() => {
    const pile = new Set<number>();
    props.tracks.forEach((track) => {
      if (!track.album_id) return;
      pile.add(track.album_id);
    });
    return Array.from(pile).sort();
  });

  return (
    <Switch>
      <Match when={false}>{(_) => <AlbumGrid albumIds={albumIds()} />}</Match>
      <Match when={true}>
        {(_) => (
          <DataTable
            groupBy="album_id"
            GroupComponent={AlbumGroup}
            groupColumnSize={albumArtColumnSize}
            onRowDblClick={(row: Track) => {
              console.log(
                `Double-clicked track: ${row.title} by ${row.artist}`,
              );
              props.onPlay(row);
            }}
            data={props.tracks}
            columns={columns()}
          />
        )}
      </Match>
    </Switch>
  );
};
