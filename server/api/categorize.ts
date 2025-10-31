import { eq, and, like, or, notInArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import type { Db } from "../db";
import { scoredItems, itemsWithScore } from "../db/query";
import { itemAttributes, items } from "../db/schema";
import { albumHashToId, albumIdToHash } from "../index";

/**
 * Get all available bucket names (all keys matching bkt:*)
 */
export function getBuckets(db: Db): Response {
  try {
    // Get all distinct bucket keys
    const results = db
      .select({ key: itemAttributes.key })
      .from(itemAttributes)
      .where(like(itemAttributes.key, "bkt:%"))
      .all();

    // Extract unique bucket names (remove bkt: prefix)
    const buckets = Array.from(
      new Set(
        results
          .map((r) => r.key)
          .filter((key) => key?.startsWith("bkt:"))
          .map((key) => key!.slice(4)), // Remove "bkt:" prefix
      ),
    ).sort();

    return new Response(
      JSON.stringify({
        success: true,
        buckets,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting buckets:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Get all values for a specific bucket
 */
export function getBucketValues(db: Db, req: Request): Response {
  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");

    if (!bucket) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Bucket name is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bucketKey = `bkt:${bucket}`;

    // Get all distinct values for this bucket
    const results = db
      .select({ value: itemAttributes.value })
      .from(itemAttributes)
      .where(eq(itemAttributes.key, bucketKey))
      .all();

    const values = Array.from(
      new Set(
        results
          .map((r) => r.value)
          .filter((v) => v !== null && v !== undefined && v !== ""),
      ),
    ).sort();

    return new Response(
      JSON.stringify({
        success: true,
        bucket,
        values,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting bucket values:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

const categorizationSchema = z.object({
  buckets: z.array(z.string()).min(1),
});

/**
 * Get count of uncategorized tracks for specified buckets
 */
export function getUncategorizedCount(db: Db, req: Request): Response {
  try {
    const url = new URL(req.url);
    const bucketsParam = url.searchParams.get("buckets");

    if (!bucketsParam) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "buckets parameter is required (comma-separated)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bucketNames = bucketsParam.split(",").map((b) => b.trim());
    const request = categorizationSchema.parse({ buckets: bucketNames });

    const bucketKeys = request.buckets.map((b) => `bkt:${b}`);

    // Get all track IDs that have at least one of the bucket attributes
    const conditions = bucketKeys.map((key) => eq(itemAttributes.key, key));

    const tracksWithAttributes = db
      .selectDistinct({ id: itemAttributes.entity_id })
      .from(itemAttributes)
      .where(or(...conditions))
      .all();

    const tracksWithAttributeIds = new Set(
      tracksWithAttributes.map((t) => t.id).filter((id) => id !== null),
    );

    // Query tracks from scored items (includes score data)
    const subquery = db.$with("items_with_score").as(itemsWithScore);
    const uncategorizedTracks = db
      .with(subquery)
      .select({ id: scoredItems.id })
      .from(scoredItems)
      .where(notInArray(scoredItems.id, Array.from(tracksWithAttributeIds)))
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        count: uncategorizedTracks.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting uncategorized count:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request parameters",
          details: error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Get next track missing all specified buckets
 */
export function getNextTrack(db: Db, req: Request): Response {
  try {
    const url = new URL(req.url);
    const bucketsParam = url.searchParams.get("buckets");

    if (!bucketsParam) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "buckets parameter is required (comma-separated)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bucketNames = bucketsParam.split(",").map((b) => b.trim());
    const request = categorizationSchema.parse({ buckets: bucketNames });

    const bucketKeys = request.buckets.map((b) => `bkt:${b}`);

    // Get all track IDs that have at least one of the bucket attributes
    const conditions = bucketKeys.map((key) => eq(itemAttributes.key, key));
    const whereCondition =
      conditions.length === 1 ? conditions[0] : or(...conditions);

    const tracksWithAttributes = db
      .selectDistinct({ id: itemAttributes.entity_id })
      .from(itemAttributes)
      .where(whereCondition)
      .all();

    const tracksWithAttributeIds = new Set(
      tracksWithAttributes.map((t) => t.id).filter((id) => id !== null),
    );

    // Query tracks from scored items (includes score data)
    const subquery = db.$with("items_with_score").as(itemsWithScore);
    const allTracks = db
      .with(subquery)
      .select({
        id: scoredItems.id,
        title: scoredItems.title,
        artist: scoredItems.artist,
        album: scoredItems.album,
        album_id: scoredItems.album_id,
      })
      .from(scoredItems)
      .all();

    // Find first track missing ALL buckets
    const nextTrack = allTracks[0];

    if (!nextTrack) {
      return new Response(
        JSON.stringify({
          success: true,
          track: null,
          message: "No uncategorized tracks found",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get album hash if track belongs to an album
    let albumHash: string | null = null;
    if (nextTrack.album_id) {
      albumHash = albumIdToHash.get(nextTrack.album_id) ?? null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        track: {
          id: nextTrack.id,
          title: nextTrack.title,
          artist: nextTrack.artist,
          album: nextTrack.album,
          album_id: nextTrack.album_id,
          albumHash,
          artPath: null, // Will be filled by frontend if needed
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting next track:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request parameters",
          details: error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

const submitCategorizationSchema = z.object({
  trackId: z.number().positive(),
  categories: z.record(z.string(), z.string()),
});

/**
 * Submit categorization for a track (upsert multiple bucket values)
 */
export async function submitCategorization(
  db: Db,
  req: Request,
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse JSON body
    let body: unknown;
    try {
      body = req.headers.get("content-type")?.includes("application/json")
        ? await req.json()
        : {};
    } catch {
      body = {};
    }

    const request = submitCategorizationSchema.parse(body);

    // Upsert each category
    for (const [bucket, value] of Object.entries(request.categories)) {
      const bucketKey = `bkt:${bucket}`;

      // Check if attribute exists
      const existing = db
        .select({ id: itemAttributes.id })
        .from(itemAttributes)
        .where(
          and(
            eq(itemAttributes.entity_id, request.trackId),
            eq(itemAttributes.key, bucketKey),
          ),
        )
        .get();

      if (existing) {
        db.update(itemAttributes)
          .set({ value })
          .where(eq(itemAttributes.id, existing.id))
          .run();
      } else {
        db.insert(itemAttributes)
          .values({
            entity_id: request.trackId,
            key: bucketKey,
            value,
          })
          .run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Categorization saved",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error submitting categorization:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body",
          details: error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

const submitAlbumCategorizationSchema = z
  .object({
    albumId: z.number().positive().optional(),
    albumHash: z.string().optional(),
    categories: z.record(z.string(), z.string()),
  })
  .refine(
    (data) => data.albumId !== undefined || data.albumHash !== undefined,
    { message: "Either albumId or albumHash must be provided" },
  );

/**
 * Resolve either albumId or albumHash to the numeric album ID
 */
function resolveAlbumId(albumId?: number, albumHash?: string): number | null {
  if (albumId) {
    return albumId;
  }
  if (albumHash) {
    return albumHashToId.get(albumHash) ?? null;
  }
  return null;
}

/**
 * Get all track IDs for a given album
 */
function getAlbumTrackIds(db: Db, albumId: number): number[] {
  const tracks = db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.album_id, albumId))
    .all();

  return tracks.map((t) => t.id);
}

/**
 * Get track count for a given album
 * Accepts either albumId or albumHash query parameter
 */
export function getAlbumTrackCount(db: Db, req: Request): Response {
  try {
    const url = new URL(req.url);
    const albumIdParam = url.searchParams.get("albumId");
    const albumHashParam = url.searchParams.get("albumHash");

    if (!albumIdParam && !albumHashParam) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Either albumId or albumHash parameter is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let albumId: number | null = null;

    if (albumIdParam) {
      albumId = parseInt(albumIdParam, 10);
      if (isNaN(albumId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid albumId",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } else if (albumHashParam) {
      albumId = albumHashToId.get(albumHashParam) ?? null;
      if (albumId === null) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Album not found for given hash",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    if (albumId === null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not resolve album ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const count = db
      .select({ count: items.id })
      .from(items)
      .where(eq(items.album_id, albumId))
      .all().length;

    const albumHash = albumIdToHash.get(albumId);

    return new Response(
      JSON.stringify({
        success: true,
        albumId,
        albumHash,
        count,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting album track count:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Submit categorization for all tracks in an album (upsert multiple bucket values for all album tracks)
 * Accepts either albumId or albumHash in request body
 */
export async function submitAlbumCategorization(
  db: Db,
  req: Request,
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse JSON body
    let body: unknown;
    try {
      body = req.headers.get("content-type")?.includes("application/json")
        ? await req.json()
        : {};
    } catch {
      body = {};
    }

    const request = submitAlbumCategorizationSchema.parse(body);

    // Resolve album ID from either albumId or albumHash
    const albumId = resolveAlbumId(request.albumId, request.albumHash);
    if (albumId === null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Album not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get all track IDs for this album
    const trackIds = getAlbumTrackIds(db, albumId);

    if (trackIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Album has no tracks",
          tracksUpdated: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Upsert each category for each track
    for (const trackId of trackIds) {
      for (const [bucket, value] of Object.entries(request.categories)) {
        const bucketKey = `bkt:${bucket}`;

        // Check if attribute exists
        const existing = db
          .select({ id: itemAttributes.id })
          .from(itemAttributes)
          .where(
            and(
              eq(itemAttributes.entity_id, trackId),
              eq(itemAttributes.key, bucketKey),
            ),
          )
          .get();

        if (existing) {
          db.update(itemAttributes)
            .set({ value })
            .where(eq(itemAttributes.id, existing.id))
            .run();
        } else {
          db.insert(itemAttributes)
            .values({
              entity_id: trackId,
              key: bucketKey,
              value,
            })
            .run();
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Categorization saved for ${trackIds.length} track(s)`,
        tracksUpdated: trackIds.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error submitting album categorization:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body",
          details: error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
