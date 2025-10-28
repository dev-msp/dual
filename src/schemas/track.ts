import { z } from "zod";

export const trackSchema = z.object({
  id: z.number(),
  album_id: z.number().nullable(),
  disc: z.number().nullable(),
  track: z.number().nullable(),
  length: z.number(),
  added: z.number(),
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
  last_rated_at: z.number().nullable(),
});

export type Track = z.infer<typeof trackSchema>;
