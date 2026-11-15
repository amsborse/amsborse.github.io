import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DEFAULT_DESIGN, DESIGNS } from "./designs/registry";
import { prepareExperiment, startTracking } from "./experiments/client";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/index.css";
import "./styles/designs/blueprint.css";
import "./styles/designs/broadsheet.css";

// The design experiment picks a first-time visitor's design before the first render, so nobody
// sees one design flash into another. Everyone else renders at once (see src/experiments).
void prepareExperiment(
  DESIGNS.map((d) => d.id),
  DEFAULT_DESIGN
)
  .catch((error: unknown) => {
    console.error("[experiments] could not prepare the experiment", error);
    return null;
  })
  .then((experiment) => {
    if (experiment) document.documentElement.setAttribute("data-design", experiment.design);
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StrictMode>
    );
    if (experiment) startTracking(experiment);
  });
