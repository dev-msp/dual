import { createMemo } from "solid-js";

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

  const albumArtColumnSize = "minmax(min-content, 1fr)";

  return (
    <div tabindex={2}>
      <DataTable
        groupBy="album_id"
        GroupComponent={AlbumGroup}
        groupColumnSize={albumArtColumnSize}
        onRowDblClick={(row: Track) => {
          console.log(`Double-clicked track: ${row.title} by ${row.artist}`);
          props.onPlay(row);
        }}
        data={props.tracks}
        columns={columns()}
      />
    </div>
  );
};
