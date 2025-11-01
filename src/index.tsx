/* @refresh reload */
import { Router, Route } from "@solidjs/router";
import { render } from "solid-js/web";

import { App } from "./app";
import { Categorize } from "./pages/Categorize";
import { Review } from "./pages/Review";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

render(
  () => (
    <Router>
      <Route path="/" component={App} />
      <Route path="/review" component={Review} />
      <Route path="/categorize" component={Categorize} />
    </Router>
  ),
  root!,
);
