import { createMemo, For, Match, Switch, type Accessor } from "solid-js";

import { AlbumGroup } from "../components/AlbumGroup";
import { propsOverride } from "../lib/components";
import { type Track } from "../schemas/track";

import { DataTable } from "./DataTable";
import { type ColumnDefs } from "./DataTable/types";

const NoWrap = propsOverride("div", {
  class:
    "overflow-hidden py-[3px] px-2 text-left overflow-ellipsis whitespace-nowrap",
});

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
        header: "Track",
        size: "min-content",
        cell: (props) => <NoWrap> {props.value} </NoWrap>,
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
          <NoWrap class="text-left">
            {props.value !== null ? props.value.toFixed(2) : "-"}
          </NoWrap>
        ),
      },
    },
  };
};

const AlbumGrid = (props: { albumIds: number[] }) => {
  return (
    <div
      class="grid"
      style={{
        "grid-template-columns":
          "repeat(auto-fill, minmax(200px, max-content))",
        "grid-template-rows": "repeat(200px)",
      }}
    >
      <For each={props.albumIds}>
        {(id) => (
          <div class="p-1">
            <img
              src={`/api/albums/${id}/artwork`}
              alt={`Album cover for album ID ${id}`}
              class="size-full rounded-sm border-gray-400 object-cover shadow-lg not-dark:border not-dark:shadow-gray-400"
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
    ]),
  );

  const albumArtColumnSize = "2fr";

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
          <div tabindex={2}>
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
          </div>
        )}
      </Match>
    </Switch>
  );
};
