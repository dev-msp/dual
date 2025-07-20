import {
  createMemo,
  type Component,
  type ComponentProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { type Track } from "../schemas/track";

import { DataTable } from "./DataTable";
import { type ColumnDefs } from "./DataTable/types";

const classOverride = <
  E extends Extract<ComponentProps<C>, { class?: string }>,
  C extends keyof JSX.IntrinsicElements,
>(
  class_: string,
  Component: C,
): Component<E> => {
  return (props: E) => (
    <Dynamic
      component={Component}
      {...props}
      class={`${class_} ${props.class || ""}`}
    />
  );
};

const NoWrap = classOverride(
  "overflow-hidden text-left overflow-ellipsis whitespace-nowrap",
  "div",
);

// factory function to create column definitions for tracks
const createTrackColumns = <Keys extends keyof Track>(
  tracks: Track[],
  order: Keys[],
): ColumnDefs<Track, Keys> => {
  return {
    order: order,
    fields: {
      id: {
        hide: true,
        accessorKey: "id", // Using id as accessor, but rendering absoluteRowIndex
        header: "#",
        size: "min-content",
        cell: ({ absoluteRowIndex, ...props }) => (
          <div {...props}>{absoluteRowIndex + 1}</div>
        ),
      },
      // album_id: {
      //   accessorKey: "album_id",
      //   header: "",
      //   size: "70px",
      //   cell: (props) => (
      //     <Show when={props.value}>
      //       <img
      //         style={{ width: "70px", height: "70px" }}
      //         src={`/api/albums/${props.value}/artwork`}
      //       />
      //     </Show>
      //   ),
      // },
      disc: {
        accessorKey: "disc",
        header: "Disc",
        size: "min-content",
        cell: (props) => <NoWrap>{props.value || ""}</NoWrap>,
      },
      track: {
        accessorKey: "track",
        header: "Track",
        size: "min-content",
        cell: (props) => <NoWrap>{props.value || ""}</NoWrap>,
      },
      title: {
        accessorKey: "title",
        header: "Title",
        size: "2fr",
        cell: (props) => (
          <NoWrap class="text-lg font-bold">{props.value}</NoWrap>
        ),
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
            <span>{`${minutes}:${seconds.toString().padStart(2, "0")}`}</span>
          );
        },
      },
      albumartist: {
        accessorKey: "albumartist",
        header: "Album artist",
        size: "1fr",
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
        console.log(`Double-clicked track: ${row.title} by ${row.artist}`);
        props.onPlay(row);
      }}
      data={props.tracks}
      columns={columns()}
    />
  );
};
