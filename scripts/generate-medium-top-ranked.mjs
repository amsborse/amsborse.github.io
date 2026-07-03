/**
 * Reads scripts/Medium_Top15_Ranked.csv → src/data/mediumTopRanked.ts
 * Run: node scripts/generate-medium-top-ranked.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }
  return rows;
}

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() ?? "post";
    return (
      last
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "post"
    );
  } catch {
    return "post";
  }
}

const csvPath = path.join(__dirname, "Medium_Top15_Ranked.csv");
const outPath = path.join(__dirname, "..", "src", "data", "mediumTopRanked.ts");

const raw = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(raw);
if (rows.length < 2) {
  console.error("Top15 CSV: expected header + rows");
  process.exit(1);
}

/** Column order from Medium_Top15_Ranked.csv */
const C = {
  rank: 0,
  title: 1,
  publication: 2,
  url: 3,
  date: 4,
  readingMin: 5,
  presentations: 6,
  views: 7,
  reads: 8,
  ctrViewsPerPresentations: 9,
  readViewRatio: 10,
  readsPerPresentation: 11,
  ctrAlt: 12,
  readRatio: 13,
  readsPerPresentationAlt: 14,
  logViews: 15,
  logReads: 16,
  score: 17,
  samplePenalty: 18,
  adjScore: 19,
};

const records = [];
const idSeen = new Set();

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length < 20) continue;
  const rank = Number.parseInt(String(row[C.rank] ?? "0"), 10) || 0;
  const title = row[C.title]?.trim() ?? "";
  const url = row[C.url]?.trim() ?? "";
  if (!title || !url || rank < 1) continue;
  const publication = (row[C.publication] ?? "").trim();
  const dateStr = (row[C.date] ?? "").trim();
  const readMin = Number.parseFloat(String(row[C.readingMin] ?? "0")) || 0;
  const presentations = Number.parseInt(String(row[C.presentations] ?? "0"), 10) || 0;
  const views = Number.parseInt(String(row[C.views] ?? "0"), 10) || 0;
  const reads = Number.parseInt(String(row[C.reads] ?? "0"), 10) || 0;

  let id = slugFromUrl(url);
  if (idSeen.has(id)) id = `${id}-${rank}`;
  idSeen.add(id);

  records.push({
    rank,
    id,
    title,
    publication: publication || null,
    url: url,
    date: dateStr,
    readingMinutes: Math.round(readMin * 10) / 10,
    presentations,
    views,
    reads,
    ctrViewsPerPresentations:
      Number.parseFloat(String(row[C.ctrViewsPerPresentations] ?? "0")) || 0,
    readViewRatio: Number.parseFloat(String(row[C.readViewRatio] ?? "0")) || 0,
    readsPerPresentation: Number.parseFloat(String(row[C.readsPerPresentation] ?? "0")) || 0,
    ctrAlt: Number.parseFloat(String(row[C.ctrAlt] ?? "0")) || 0,
    readRatio: Number.parseFloat(String(row[C.readRatio] ?? "0")) || 0,
    readsPerPresentationAlt: Number.parseFloat(String(row[C.readsPerPresentationAlt] ?? "0")) || 0,
    logViews: Number.parseFloat(String(row[C.logViews] ?? "0")) || 0,
    logReads: Number.parseFloat(String(row[C.logReads] ?? "0")) || 0,
    score: Number.parseFloat(String(row[C.score] ?? "0")) || 0,
    samplePenalty: Number.parseFloat(String(row[C.samplePenalty] ?? "0")) || 0,
    adjScore: Number.parseFloat(String(row[C.adjScore] ?? "0")) || 0,
  });
}

records.sort((a, b) => a.rank - b.rank);

const lines = [];
lines.push("/**");
lines.push(" * Top-performing Medium posts (ranked) — from `scripts/Medium_Top15_Ranked.csv`.");
lines.push(" * Regenerate: `node scripts/generate-medium-top-ranked.mjs`");
lines.push(" */");
lines.push("");
lines.push("export type MediumTopRankedEntry = {");
lines.push("  rank: number;");
lines.push("  id: string;");
lines.push("  title: string;");
lines.push("  publication: string | null;");
lines.push("  url: string;");
lines.push("  /** ISO date YYYY-MM-DD */");
lines.push("  date: string;");
lines.push("  readingMinutes: number;");
lines.push("  presentations: number;");
lines.push("  views: number;");
lines.push("  reads: number;");
lines.push("  /** CTR: views / presentations */");
lines.push("  ctrViewsPerPresentations: number;");
lines.push("  readViewRatio: number;");
lines.push("  readsPerPresentation: number;");
lines.push("  /** Secondary CTR column from export */");
lines.push("  ctrAlt: number;");
lines.push("  readRatio: number;");
lines.push("  readsPerPresentationAlt: number;");
lines.push("  logViews: number;");
lines.push("  logReads: number;");
lines.push("  score: number;");
lines.push("  samplePenalty: number;");
lines.push("  adjScore: number;");
lines.push("};");
lines.push("");
lines.push("export const mediumTopRanked: MediumTopRankedEntry[] = [");
for (const rec of records) {
  lines.push("  {");
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === "string") {
      lines.push(`    ${k}: ${JSON.stringify(v)},`);
    } else if (v === null) {
      lines.push(`    ${k}: null,`);
    } else {
      lines.push(`    ${k}: ${v},`);
    }
  }
  lines.push("  },");
}
lines.push("];");
lines.push("");

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${records.length} ranked entries to ${outPath}`);
