import type { Stats } from "node:fs";
import { readdir } from "node:fs/promises";

import type { BunFile } from "bun";
import { eq } from "drizzle-orm";
import * as rx from "rxjs";

import { listTracks, optsFromRequest, type UnprocessedTask } from "./api";
import {
  getBuckets,
  getBucketValues,
  getNextTrack,
  submitCategorization,
  getAlbumTrackCount,
  submitAlbumCategorization,
  getUncategorizedCount,
} from "./api/categorize";
import { submitComparison } from "./api/comparison";
import { getPairs } from "./api/pairs";
import { enqueueTask, taskEventsById, tasks$ } from "./api/task";
import { TEMP_DIR } from "./api/worker";
import { db, type Db } from "./db";
import { buildAlbumHashMappings } from "./db/album_queries";
import { items } from "./db/schema";

// Global album hash mappings - initialized on startup
export let albumHashToId: Map<string, number> = new Map();
export let albumIdToHash: Map<number, string> = new Map();

// Initialize album hash mappings
const initAlbumMappings = () => {
  const { hashToId, idToHash } = buildAlbumHashMappings();
  albumHashToId = hashToId;
  albumIdToHash = idToHash;
  console.log(
    `Initialized album mappings: ${albumHashToId.size} albums indexed`,
  );
};

tasks$.subscribe({
  next: (task) => console.log(task),
  error: (err) => console.error("Error in tasks stream:", err),
  complete: () => console.log("Tasks stream completed"),
});

const trackPathById = (db: Db, trackId: number): string | undefined => {
  const track = db
    .select({ path: items.path })
    .from(items)
    .where(eq(items.id, trackId))
    .get();
  return track?.path ? new TextDecoder("utf-8").decode(track?.path) : undefined;
};

interface RangeRequest {
  start: number;
  end: number;
}

const parseRangeHeader = (
  rangeHeader: string,
  fileSize: number,
): RangeRequest | null => {
  // Format: "bytes=0-1023" or "bytes=1024-" or "bytes=-1024"
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, startStr, endStr] = match;
  let start = startStr ? parseInt(startStr, 10) : 0;
  let end = endStr ? parseInt(endStr, 10) : fileSize - 1;

  // Suffix range: last N bytes (bytes=-1024)
  if (!startStr && endStr) {
    const suffixLength = parseInt(endStr, 10);
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  }

  // Validation: invalid ranges
  if (
    isNaN(start) ||
    isNaN(end) ||
    start > end ||
    start < 0 ||
    end >= fileSize
  ) {
    return null;
  }

  return { start, end };
};

const serveTrack = async (
  db: Db,
  req: Bun.BunRequest<"/api/tracks/:trackId/play">,
) => {
  const rawTrackId = req.params?.trackId;
  if (!rawTrackId) {
    return new Response("Track ID is required", { status: 400 });
  }

  const trackId = parseInt(rawTrackId, 10);
  if (trackId <= 0 || isNaN(trackId)) {
    return new Response("Invalid Track ID", { status: 400 });
  }

  try {
    const trackPath = trackPathById(db, trackId);
    if (!trackPath) {
      return new Response("Track path not found", { status: 404 });
    }

    const file = Bun.file(trackPath);
    if (!(await file.exists())) {
      return new Response("Track file not found", { status: 404 });
    }

    const size = file.size;
    const rangeHeader = req.headers.get("Range");
    const commonHeaders = {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    };

    // No Range header: serve full file with 200 OK
    if (!rangeHeader) {
      const headers = new Headers({
        ...commonHeaders,
        "Content-Length": size.toString(),
      });
      return new Response(file, { status: 200, headers });
    }

    // Parse Range header
    const range = parseRangeHeader(rangeHeader, size);
    if (!range) {
      // Invalid range: respond with 416 Range Not Satisfiable
      const headers = new Headers({
        ...commonHeaders,
        "Content-Range": `bytes */${size}`,
      });
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers,
      });
    }

    // Serve partial content with 206 Partial Content
    const length = range.end - range.start + 1;
    const slice = file.slice(range.start, range.end + 1);
    const headers = new Headers({
      ...commonHeaders,
      "Content-Length": length.toString(),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    });

    return new Response(slice, { status: 206, headers });
  } catch (error) {
    console.error("Error serving track:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

const reductionInit: { file?: BunFile; stats?: Stats; recentCtime: number } = {
  recentCtime: 0,
};

const latestFileInDir = async (dir: string) => {
  const fileNames = await readdir(dir);
  const files = fileNames.map((name) => Bun.file(`${dir}/${name}`));

  const { file: latest } = await files.reduce(async (frontrunner, nextFile) => {
    const { ctimeMs: ctime } = await nextFile.stat();
    return ctime > (await frontrunner).recentCtime
      ? { file: nextFile, recentCtime: ctime }
      : frontrunner;
  }, Promise.resolve(reductionInit));

  return latest;
};

// Initialize all mappings on startup
initAlbumMappings();

const serveAlbumArt = async (
  db: Db,
  req: Bun.BunRequest<"/api/albums/:albumId/artwork">,
) => {
  // ensure it's already available
  const task: UnprocessedTask = {
    id: Bun.randomUUIDv7(),
    type: "load_art",
    payload: {
      albumId: parseInt(req.params.albumId),
    },
  };
  enqueueTask(task);
  const outcome = await rx.firstValueFrom(taskEventsById(task.id));
  if ("completed" in outcome) {
    const dir = `${TEMP_DIR}/${req.params.albumId}`;
    const recent = await latestFileInDir(dir);
    if (!recent) {
      return new Response("No album art found", { status: 404 });
    }
    if (recent.type !== "image/webp") {
      return new Response("Album art is not in webp format", {
        status: 415,
      });
    }
    return new Response(recent);
  }
  return new Response(`Failed to load album art: ${outcome.error}`, {
    status: 500,
  });
};

Bun.serve({
  port: 5000,
  routes: {
    "/api/tracks": (req) => listTracks(db, optsFromRequest(req)),
    "/api/tracks/:trackId/play": (req) => serveTrack(db, req),
    "/api/albums/:albumId/artwork": (req) => serveAlbumArt(db, req),
    "/api/comparison": (req) => submitComparison(db, req),
    "/api/pairs": (req) => getPairs(db, req),
    "/api/buckets": (_req) => getBuckets(db),
    "/api/buckets/values": (req) => getBucketValues(db, req),
    "/api/categorize/next": (req) => getNextTrack(db, req),
    "/api/categorize/count": (req) => getUncategorizedCount(db, req),
    "/api/categorize": (req) => submitCategorization(db, req),
    "/api/categorize/album": (req) => submitAlbumCategorization(db, req),
    "/api/albums/track-count": (req) => getAlbumTrackCount(db, req),
  },
});
