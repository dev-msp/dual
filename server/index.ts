import type { Stats } from "node:fs";
import { readdir } from "node:fs/promises";

import type { BunFile } from "bun";
import { eq } from "drizzle-orm";
import * as rx from "rxjs";

import { listTracks, optsFromRequest, type UnprocessedTask } from "./api";
import { submitComparison } from "./api/comparison";
import { getPairs } from "./api/pairs";
import { enqueueTask, taskEventsById, tasks$ } from "./api/task";
import { TEMP_DIR } from "./api/worker";
import { db, type Db } from "./db";
import { items } from "./db/schema";

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

    return new Response(file);
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
  },
});
