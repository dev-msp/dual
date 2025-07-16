import { eq } from "drizzle-orm";

import { listTracks, optsFromRequest } from "./api";
import { tasks$ } from "./api/task";
import { db, type Db } from "./db";
import { items } from "./db/schema";

// const jsonSchema: z.ZodType<Json> = z.json();

tasks$.subscribe({
  next: (task) => {
    console.log("Task received:", task);
    if (task.type === "load_art") {
      console.log(task.payload.artPath);
    }
    // Here you can handle the task, e.g., process it or store it in a queue
  },
  error: (err) => {
    console.error("Error in tasks stream:", err);
  },
  complete: () => {
    console.log("Tasks stream completed");
  },
});

const serveTrack = (
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
    const track = db
      .select({ path: items.path })
      .from(items)
      .where(eq(items.id, trackId))
      .get();
    if (!track) {
      return new Response("Track not found", { status: 404 });
    }

    if (!track.path) {
      return new Response("Track path is empty", { status: 404 });
    }
    return new Response(Bun.file(track.path));
  } catch (error) {
    console.error("Error serving track:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

Bun.serve({
  port: 5000,
  routes: {
    "/api/tracks": (req) => listTracks(db, optsFromRequest(req)),
    "/api/tracks/:trackId/play": (req) => serveTrack(db, req),
  },
});
