import { MetaProvider } from "@solidjs/meta";

import { Landing } from "./landing";

import "./app.css";

export const App = () => {
  return (
    <MetaProvider>
      <div class="min-h-full flex flex-col">
        <header class="flex items-center justify-between p-4">
          <div class="text-4xl font-bold">
            ObserveCorp
          </div>
          <nav class="flex gap-4 font-bold text-sm">
            <button>Product Functions</button>
            <button>Value Proposition</button>
            <button>Testimonial Units</button>
            <button>Join Collective</button>
          </nav>
        </header>

        <Landing />

        <footer class="p-4 text-xs flex justify-center">
          <p>
            © 2023 Entity Observation Initiative • Your data has already been
            processed • Resistance creates additional paperwork
          </p>
        </footer>
      </div>
    </MetaProvider>
  );
};
