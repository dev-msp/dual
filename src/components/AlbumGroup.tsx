import { For, createMemo } from "solid-js";

import { propsOverride } from "../lib/components";
import type { Track } from "../schemas/track";

import { DataRow } from "./DataTable/Row";
import type { FieldsTypes } from "./DataTable/types";

const Title = propsOverride("div", {
  "data-title": true,
  class: "",
});

export const AlbumGroup = <T extends Track, K extends keyof T>(props: {
  groupKey: string;
  items: T[];
  columns: FieldsTypes<T, K>[];
  onRowDblClick: (item: T) => void;
}) => {
  const tracks = createMemo(() => props.items);
  const albumName = createMemo(() => tracks()[0]?.album || `Unknown`);
  const albumArtUrl = createMemo(() => `/api/albums/${props.groupKey}/artwork`);

  const artistName = createMemo(() => {
    const names = tracks().reduce((acc, track) => {
      if (track.albumartist) acc.add(track.albumartist);
      return acc;
    }, new Set<string>());
    return names.size > 0 ? Array.from(names).sort().join(", ") : null;
  });

  return (
    <div
      data-album-group
      // class="col-span-full grid grid-cols-subgrid pt-6 min-lg:gap-x-6"
      class="album-group"
    >
      <div
        // class="col-1 w-full max-w-[300px] min-w-[120px] pb-8"
        class="info"
      >
        <img
          src={albumArtUrl()}
          alt={albumName()}
          // class="h-auto rounded-sm border-gray-400 object-cover shadow-lg not-dark:border not-dark:shadow-gray-400"
          class="artwork"
        />
        <div
          // class="w-[108%]"
          class="credits"
        >
          <Title
          // TODO use data attr
          // class="mt-4 min-lg:text-lg"
          >
            {albumName()}
          </Title>
          <div
            data-subtitle
            // class="font-thin text-pretty min-lg:text-[108%]"
          >
            {artistName()}
          </div>
        </div>
      </div>

      <div
        // class="bg-dark/20 dark:bg-light/20 grid grid-cols-subgrid gap-x-[1px]"
        class="rows"
      >
        <For each={tracks()}>
          {(row, i) => (
            <DataRow
              index={i()}
              row={row}
              columns={props.columns}
              onRowDblClick={props.onRowDblClick}
            />
          )}
        </For>
      </div>
    </div>
  );
};
