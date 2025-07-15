import { listTracks, optsFromRequest } from "./api";
import { tasks$ } from "./api/task";
import { db } from "./db";

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

Bun.serve({
  port: 5000,
  routes: {
    "/api/tracks": (req) => listTracks(db, optsFromRequest(req)),
    "/bar": () => {
      throw new Error("This is an error from /bar");
    },
  },
});
