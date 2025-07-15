import { eq, sql } from "drizzle-orm";

import { db } from "../db";

import { albums, items } from "./schema";

export const randomItem = () =>
  db
    .select()
    .from(items)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get();

export const itemWithArtPath = (
  itemId: number,
): {
  trackId: number;
  albumId: number;
  artPath: string | null;
} => {
  const rec = db
    .select({
      trackId: items.id,
      albumId: albums.id,
      artPath: albums.artpath,
    })
    .from(items)
    .innerJoin(albums, eq(items.album_id, albums.id))
    .where(eq(items.id, itemId))
    .get();
  if (!rec) {
    throw new Error(`Item with ID ${itemId} not found`);
  }
  return {
    ...rec,
    artPath: rec.artPath ? new TextDecoder("utf-8").decode(rec.artPath) : null,
  };
};
