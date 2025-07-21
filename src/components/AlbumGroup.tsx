import { For, createMemo } from "solid-js";

import { propsOverride } from "../lib/components";
import type { Track } from "../schemas/track";

import { DataRow } from "./DataTable/Row";
import type { FieldsTypes } from "./DataTable/types";

const Title = propsOverride("div", {
  "data-title": true,
  class: "overflow-x-hidden text-nowrap overflow-ellipsis",
});

export const AlbumGroup = <T extends Track, K extends keyof T>(props: {
  groupKey: string;
  items: T[];
  columns: FieldsTypes<T, K>[];
  onRowDblClick: (item: T) => void;
}) => {
  const tracks = createMemo(() => props.items);
  const albumName = createMemo(
    () => tracks()[0]?.album || `Album ${props.groupKey}`,
  );
  const albumArtUrl = createMemo(() => `/api/albums/${props.groupKey}/artwork`);

  const artRowSpan = createMemo(() =>
    tracks().length > 0 ? tracks().length : 1,
  );

  const numDataColumns = createMemo(() => props.columns.length);

  return (
    <div
      data-album-group
      class="col-span-full grid gap-x-2 pt-6"
      style={{
        "grid-template-columns": "subgrid",
        "grid-column": "1 / -1",
      }}
    >
      <div
        class="flex pb-8"
        style={{
          "grid-column": "1",
          "grid-row": `span ${artRowSpan()}`,
          "min-height": "80px",
        }}
      >
        <img
          src={albumArtUrl()}
          alt={albumName()}
          class="h-auto max-h-[300px] w-full max-w-[300px] rounded-sm border border-gray-400 object-cover shadow-lg shadow-gray-400"
        />
      </div>

      <div style={{ "grid-column": `2 / span ${numDataColumns()}` }}>
        <Title class="mb-4 text-xl">{albumName()}</Title>
      </div>

      <div
        class="grid"
        style={{
          "grid-column": `2 / span ${numDataColumns()}`,
          "grid-template-columns": "subgrid",
        }}
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
