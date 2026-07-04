import { readFileSync, writeFileSync } from "node:fs";

const path = "src/styles/index.css";
const lines = readFileSync(path, "utf8").split("\n");
const out = [];
let skip = false;

for (const line of lines) {
  if (!skip && line.trim() === "/** Scroll reveal */" && out.at(-1)?.includes("hub-header-enter")) {
    out.push(line);
    continue;
  }

  if (
    !skip &&
    line.trim() === "position: absolute;" &&
    out.at(-1)?.trim() === "/** Scroll reveal */"
  ) {
    skip = true;
    continue;
  }

  if (skip && line.trim() === "/** Scroll reveal */") {
    skip = false;
    out.push(line);
    continue;
  }

  if (!skip && line.trim() === ".classic-resume-shell {") {
    skip = true;
    continue;
  }

  if (
    skip &&
    line.trim() === "}" &&
    out.length > 0 &&
    out.at(-1)?.trim().startsWith("@media print")
  ) {
    skip = false;
    continue;
  }

  if (!skip) out.push(line);
}

let css = out.join("\n");
css = css.replace(
  /@media \(prefers-reduced-motion: reduce\) \{\n    \.home-hero__bloom--warm,[\s\S]*?    \.writing-entry-card:hover \{\n      transform: none;\n    \}\n\n/,
  ""
);
css = css.replace(
  /@media \(prefers-reduced-motion: reduce\) \{\n    \.premium-card \{\n[\s\S]*?    \.premium-panel--lift:hover \{\n      transform: none;\n    \}\n\n/,
  `@media (prefers-reduced-motion: reduce) {
    .parallax-layer {
      transform: none !important;
      will-change: auto;
    }

    .premium-panel {
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .premium-panel--lift:hover {
      transform: none;
    }

    .motion-link {
      transition-duration: 0.15s;
    }

    .reading-progress-fill {
      transition: none !important;
    }
  }

`
);

writeFileSync(path, css);
console.log(`Cleaned CSS: ${lines.length} -> ${css.split("\n").length} lines`);
