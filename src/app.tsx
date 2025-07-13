import "./app.css";

import { MetaProvider } from "@solidjs/meta";
import { createResource } from "solid-js";
import { z } from "zod/v4";

const schema = z.object({
  id: z.number(),
  title: z.string(),
  artPath: z.string().nullable(),
  artist: z.string(),
  artist_sort: z.string(),
  album: z.string(),
  album_id: z.number(),
  albumartist: z.string(),
  albumartist_sort: z.string(),
});

export const App = () => {
  const [tracks] = createResource(
    async () => {
      const resp = await fetch(`/api/tracks`, {
        headers: {
          Accept: "application/json",
        },
      });
      return z.array(schema).parse(await resp.json());
    },
    { initialValue: [] },
  );

  return (
    <MetaProvider>
      <div class="flex min-h-full flex-col">
        <header class="flex items-center justify-between p-4">
          <div class="text-4xl font-bold">Title</div>
        </header>

        <pre class="whitespace-pre-wrap">
          <code>{JSON.stringify(tracks(), null, 2)}</code>
        </pre>

        <footer class="flex justify-center p-4 text-xs">
          <p>© 2025</p>
        </footer>
      </div>
    </MetaProvider>
  );
};
