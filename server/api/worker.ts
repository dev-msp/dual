import { mkdir } from "node:fs/promises";

import { eq } from "drizzle-orm";
import { parseFile } from "music-metadata";
import sharp from "sharp";
import z from "zod/v4";

import { db } from "../db";
import { albumArtPath, itemWithArtPath } from "../db/item_queries";
import { scoredItems as sci, type ScoredItem } from "../db/query";

import { registerPayload } from "./task";

const loadArtInput = z
  .object({ albumId: z.number() })
  .or(z.object({ trackId: z.number() }));

export const loadArtSchema = loadArtInput.transform((val, ctx) => {
  try {
    return "trackId" in val
      ? itemWithArtPath(val.trackId)
      : albumArtPath(val.albumId);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return z.NEVER;
  }
});

export const TEMP_DIR = Bun.env.TMPDIR?.replace(/\/$/, "") || "/tmp";
const firstTrackInAlbum = (albumId: number): ScoredItem | undefined =>
  db
    .select()
    .from(sci)
    .where(eq(sci.album_id, albumId))
    .orderBy(sci.disc, sci.track)
    .get();

registerPayload(loadArtSchema, async (payload) => {
  const hasher = new Bun.CryptoHasher("blake2b256");

  if (!payload.artPath) {
    const firstTrack = firstTrackInAlbum(payload.albumId);
    if (!firstTrack?.path) {
      throw new Error(`No tracks found for album ID ${payload.albumId}`);
    }
    const decoder = new TextDecoder("utf-8");
    const meta = await parseFile(decoder.decode(firstTrack.path));
    const pic = meta.common.picture?.[0];
    if (!pic) {
      throw new Error(`No artwork found for album ID ${payload.albumId}`);
    }
    hasher.update(pic.data);
    const hash = hasher.digest("base64url");

    const image = Bun.file(
      `${TEMP_DIR}/${hash}-${pic.format.replace("/", "_")}`,
    );

    if (await image.exists()) {
      console.warn(`File ${image.name} already exists, skipping.`);
      return;
    }

    await image.write(pic.data);
    return;
  }

  const img = await sharp(payload.artPath)
    .resize({ fit: "cover", width: 500, height: 500 })
    .toColorspace("srgb")
    .webp({ smartDeblock: true, smartSubsample: true })
    .toBuffer();

  hasher.update(img);
  const hash = hasher.digest("base64url");

  if (!payload.albumId) {
    throw new Error("Album ID is required in payload");
  }

  const dir = `${TEMP_DIR}/${payload.albumId}`;
  await mkdir(dir, { recursive: true });
  const file = Bun.file(`${dir}/${hash}.webp`);
  if (await file.exists()) {
    console.warn(`File ${file.name} already exists, skipping.`);
    return;
  }

  await file.write(new Response(img));
});
