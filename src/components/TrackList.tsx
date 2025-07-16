import { createMemo, Show } from "solid-js";

import { type Track } from "../schemas/track";

import { DataTable } from "./DataTable";
import { type ColumnDefs } from "./DataTable/types";

// factory function to create column definitions for tracks
const createTrackColumns = <Keys extends keyof Track>(
  tracks: Track[],
  order: Keys,
): ColumnDefs<Track, Keys, never> => {
  const noWrapClass = "overflow-hidden text-left overflow-ellipsis";

  return {
    order,
    fields: {
      id: {
        accessorKey: "id", // Using id as accessor, but rendering absoluteRowIndex
        hide: true,
        header: "#",
        size: "min-content",
        cell: ({ absoluteRowIndex }) => <span>{absoluteRowIndex + 1}</span>,
      },
      album_id: {
        accessorKey: "album_id",
        header: "",
        size: "70px",
        cell: (props) => (
          <Show when={props.value}>
            <img
              style={{ width: "70px", height: "70px" }}
              src={`/api/albums/${props.value}/artwork`}
            />
          </Show>
        ),
      },
      disc: {
        accessorKey: "disc",
        header: "Disc",
        size: "min-content",
        cell: (props) => <span class={noWrapClass}>{props.value || ""}</span>,
      },
      track: {
        accessorKey: "track",
        header: "Track",
        size: "min-content",
        cell: (props) => <span class={noWrapClass}>{props.value || ""}</span>,
      },
      title: {
        accessorKey: "title",
        header: "Title",
        size: "2fr",
        cell: (props) => (
          <div class={`text-lg font-bold ${noWrapClass}`}>{props.value}</div>
        ),
      },
      length: {
        accessorKey: "length",
        header: "Duration",
        cell: (props) => {
          const duration = props.value;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          return (
            <span>{`${minutes}:${seconds.toString().padStart(2, "0")}`}</span>
          );
        },
      },
      albumartist: {
        accessorKey: "albumartist",
        header: "Album artist",
        size: "1fr",
        cell: (props) => <span class={noWrapClass}>{props.value ?? "-"}</span>,
      },
      album: {
        accessorKey: "album",
        header: "Album",
        size: "1fr",
        cell: (props) => <span class={noWrapClass}>{props.value ?? "-"}</span>,
      },
      original_year: {
        accessorKey: "original_year",
        header: "Year",
        size: "1fr",
        cell: (props) => <span class={noWrapClass}>{props.value || ""}</span>,
      },
      score: {
        accessorKey: "score",
        hide: true,
        header: "Score",
        size: "1fr",
        cell: (props) => (
          <span class="text-left">
            {props.value !== null ? props.value.toFixed(2) : "-"}
          </span>
        ),
      },
    },
  };
};

export const TrackList = (props: {
  onPlay: (track: Track) => void;
  tracks: Track[];
}) => {
  // Memoize column definitions, re-creating only when tracks change
  const columns = createMemo(() =>
    createTrackColumns(props.tracks, [
      "id",
      "album_id",
      "disc",
      "track",
      "title",
      "length",
      "original_year",
      "albumartist",
      "album",
      "score",
    ]),
  );

  return (
    <DataTable
      onRowDblClick={(row: Track) => {
        // Handle double-click on row (e.g. play track)
        console.log(`Double-clicked track: ${row.title} by ${row.artist}`);
        props.onPlay(row);
      }}
      data={props.tracks}
      columns={columns()}
    />
  );
};
