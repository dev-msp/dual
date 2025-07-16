import {
  createContext,
  createSignal,
  For,
  onMount,
  useContext,
  type JSX,
} from "solid-js";
import { z } from "zod/v4";

export type Track = z.infer<typeof trackSchema>;

export const trackSchema = z.object({
  id: z.number(),
  album_id: z.number().nullable(),
  disc: z.number().nullable(),
  track: z.number().nullable(),
  original_year: z.number().nullable(),
  original_month: z.number().nullable(),
  original_day: z.number().nullable(),
  title: z.string(),
  artPath: z.string().nullable(),
  artist: z.string().nullable(),
  artist_sort: z.string().nullable(),
  album: z.string(),
  albumartist: z.string().nullable(),
  albumartist_sort: z.string().nullable(),
  score: z.number().nullable(),
});

const Title = (props: { children: JSX.Element[] | JSX.Element }) => (
  <div data-title class="overflow-hidden text-lg text-nowrap overflow-ellipsis">
    {props.children}
  </div>
);

const DataRow = (props: {
  index: number;
  header?: boolean;
  children: JSX.Element[];
}) => {
  return (
    <div
      data-row
      data-row-index={props.index}
      data-header-row={props.header ?? false}
      class="contents"
    >
      {props.children}
    </div>
  );
};

const RowContext = createContext<{ rowIndex: number }>();

const DataCell = (props: {
  index: number;
  children: JSX.Element[] | JSX.Element;
  class?: string;
  classList?: Record<string, boolean>;
}) => {
  const context = useContext(RowContext);
  if (!context) {
    throw new Error("DataCell must be used within a RowContext");
  }
  return (
    <div
      data-cell
      data-row-index={context.rowIndex}
      data-col-index={props.index}
      class={`flex items-center ${props.class}`}
      classList={props.classList}
      style={{ "grid-column": props.index + 1 }}
    >
      {props.children}
    </div>
  );
};

export const TrackList = (props: {
  tracks: Track[];
  onDoubleClick: (id: number) => void;
}) => {
  const [el, ref] = createSignal<HTMLDivElement>();
  onMount(() => {
    el()?.focus();
  });
  return (
    <div
      ref={ref}
      class="relative grid h-full gap-3 **:data-title:font-bold"
      style={{
        "grid-template-rows": `repeat(minmax(40px, auto))`,
        "grid-template-columns": "min-content minmax(300px,2fr) repeat(3,1fr)",
      }}
    >
      <div class="sticky top-0 col-span-full grid h-min grid-cols-subgrid bg-gray-900">
        <RowContext.Provider value={{ rowIndex: 0 }}>
          <DataCell index={0}>
            <Title>#</Title>
          </DataCell>
          <DataCell index={1}>
            <Title>Title</Title>
          </DataCell>
          <DataCell index={2} class="text-left">
            <Title>Artist</Title>
          </DataCell>
          <DataCell index={3} class="text-left">
            <Title>Album</Title>
          </DataCell>
          <DataCell index={4} class="text-left">
            <Title>Score</Title>
          </DataCell>
        </RowContext.Provider>
      </div>

      <div class="sticky top-0 col-span-full row-start-2 -mt-2 h-[0.5px] bg-gray-700" />

      <For each={props.tracks}>
        {(track, i) => (
          <>
            <div
              data-row
              data-row-index={i()}
              onDblClick={() => {
                props.onDoubleClick(track.id);
              }}
              class="contents"
            >
              <RowContext.Provider value={{ rowIndex: i() }}>
                <DataCell
                  index={0}
                  class="flex items-center justify-center text-xs"
                >
                  {i()}
                </DataCell>
                <DataCell
                  index={1}
                  class="overflow-hidden text-nowrap overflow-ellipsis"
                >
                  <span>{track.title}</span>
                </DataCell>
                <DataCell index={2} class="text-left">
                  {track.artist ?? "Unknown Artist"}
                </DataCell>
                <DataCell index={3} class="text-left">
                  {track.album ?? "Unknown Album"}
                </DataCell>
                <DataCell index={4} class="text-left font-mono">
                  {track.score ?? "-"}
                </DataCell>
              </RowContext.Provider>
            </div>
            <div class="col-span-full h-[0.5px] bg-gray-700" />
          </>
        )}
      </For>
    </div>
  );
};
