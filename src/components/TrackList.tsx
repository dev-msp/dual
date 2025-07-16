import {
  createContext,
  createMemo,
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

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

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
  const minScore = () =>
    props.tracks.reduce(
      (min, track) => Math.min(min, track.score ?? Infinity),
      Infinity,
    );

  const maxScore = () =>
    props.tracks.reduce((max, track) => Math.max(max, track.score ?? 0), 0);

  const scoreRangeToWidth = (score: number, maxWidth: number = 100) => {
    if (score === null || score === undefined) return "0px";
    const range = maxScore() - minScore();
    if (range === 0) return "0%";
    const width = ((score - minScore()) / range) * 100;
    return `${Math.min(width, maxWidth)}%`;
  };

  const [el, scrollBox] = createSignal<HTMLDivElement | null>(null);

  const throttle = <T extends (...args: any[]) => void>(
    fn: T,
    delay: number,
  ) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) return;
      timeout = setTimeout(() => {
        fn(...args);
        timeout = null;
      }, delay);
    };
  };

  const trackCount = createMemo(() => {
    return props.tracks.length;
  });

  const maxRows = () => {
    const box = el();
    if (!box) return 0;
    return Math.floor(box.clientHeight / 40); // Assuming each row is 40px tall
  };

  const [scrolled, setScrolled] = createSignal(0);
  const handleWheel = (e: WheelEvent) => {
    const delta = Math.floor(e.deltaY / 1.6);
    requestAnimationFrame(() => {
      setScrolled((n) => {
        const newScroll = n + delta;
        const scrollMax = trackCount() - maxRows();
        return clamp(newScroll, 0, scrollMax);
      });
    });
  };

  const throttledHandleWheel = throttle(handleWheel, 17);

  onMount(() => {
    el()?.addEventListener("wheel", throttledHandleWheel, { passive: true });
  });

  const rowRange = () => {
    const box = el();
    const n = trackCount();
    if (!box) return { start: 0, end: 1 };

    const start = clamp(Math.floor(scrolled()), 0, n - maxRows() + 1);
    const end = clamp(start + maxRows() - 1, start, n - 1);

    return { start, end };
  };

  const rows = () => {
    const { start, end } = rowRange();
    return props.tracks.slice(start, end + 1);
  };

  return (
    <div
      class="relative grid h-full gap-3 overflow-y-hidden **:data-title:font-bold"
      ref={scrollBox}
      style={{
        "grid-template-rows": `repeat(minmax(40px, auto))`,
        "grid-template-columns": "min-content minmax(300px,2fr) repeat(3,1fr)",
      }}
    >
      <div class="sticky col-span-full grid h-min grid-cols-subgrid">
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

      <div class="relative col-span-full row-start-2 -mt-2 h-[0.5px] bg-gray-700" />

      <For each={rows()}>
        {(track, i) => (
          <div
            data-row
            data-row-index={i()}
            onDblClick={() => {
              console.log("hi");
              props.onDoubleClick(track.id);
            }}
            class="contents"
          >
            <RowContext.Provider value={{ rowIndex: i() }}>
              <DataCell
                index={0}
                class="flex items-center justify-center text-xs"
              >
                {scrolled() + i()}
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
              <DataCell index={4} class="text-left">
                <div
                  class="h-4 rounded bg-gray-200"
                  style={{ width: scoreRangeToWidth(track.score ?? 0) }}
                >
                  <div class="flex h-full flex-row items-center justify-end rounded bg-blue-500">
                    {track.score?.toFixed(2)}
                  </div>
                </div>
              </DataCell>
            </RowContext.Provider>
          </div>
        )}
      </For>
    </div>
  );
};
