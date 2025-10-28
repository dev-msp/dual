import { z } from "zod";

export const trackSchema = z.object({
  id: z.number(),
  album_id: z.number().nullable().optional(),
  disc: z.number().nullable().optional(),
  track: z.number().nullable().optional(),
  length: z.number(),
  added: z.number(),
  original_year: z.number().nullable().optional(),
  original_month: z.number().nullable().optional(),
  original_day: z.number().nullable().optional(),
  title: z.string(),
  artPath: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  artist_sort: z.string().nullable().optional(),
  album: z.string(),
  albumartist: z.string().nullable().optional(),
  albumartist_sort: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  last_rated_at: z.number().nullable().optional(),
});

export type Track = z.infer<typeof trackSchema>;
