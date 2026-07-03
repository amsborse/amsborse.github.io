/**
 * Reads scripts/Medium_Stats_With_Scoring.csv and writes src/data/mediumArticles.ts
 * Run: node scripts/generate-medium-articles.mjs
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

const csvPath = path.join(__dirname, "Medium_Stats_With_Scoring.csv");
const outPath = path.join(__dirname, "..", "src", "data", "mediumArticles.ts");

const raw = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(raw);
if (rows.length < 2) {
  console.error("CSV: expected header + rows");
  process.exit(1);
}
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);

const iTitle = idx("Title");
const iPub = idx("Publication");
const iUrl = idx("URL");
const iDate = idx("Published Date");
const iReadMin = idx("Reading Time (min)");
const iPres = idx("Presentations");
const iViews = idx("Views");
const iReads = idx("Reads");

const records = [];
const idSeen = new Set();
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length < 8) continue;
  const title = row[iTitle]?.trim() ?? "";
  const url = row[iUrl]?.trim() ?? "";
  if (!title || !url) continue;
  const publication = (row[iPub] ?? "").trim();
  const dateStr = (row[iDate] ?? "").trim();
  const readMin = Number.parseFloat(String(row[iReadMin] ?? "0")) || 0;
  const presentations = Number.parseInt(String(row[iPres] ?? "0"), 10) || 0;
  const views = Number.parseInt(String(row[iViews] ?? "0"), 10) || 0;
  const reads = Number.parseInt(String(row[iReads] ?? "0"), 10) || 0;
  let id = slugFromUrl(url);
  if (idSeen.has(id)) id = `${id}-${r}`;
  idSeen.add(id);
  records.push({
    id,
    title,
    publication: publication || null,
    url,
    date: dateStr,
    readingMinutes: Math.round(readMin * 10) / 10,
    presentations,
    views,
    reads,
  });
}

records.sort((a, b) => {
  const da = a.date.localeCompare(b.date);
  if (da !== 0) return -da;
  return a.title.localeCompare(b.title);
});

const lines = [];
lines.push("/**");
lines.push(" * Medium essays — generated from `scripts/Medium_Stats_With_Scoring.csv`.");
lines.push(" * Regenerate: `node scripts/generate-medium-articles.mjs`");
lines.push(" */");
lines.push("");
lines.push("export type MediumArticle = {");
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
lines.push("};");
lines.push("");
lines.push("export const mediumArticles: MediumArticle[] = [");
for (const rec of records) {
  lines.push("  {");
  lines.push(`    id: ${JSON.stringify(rec.id)},`);
  lines.push(`    title: ${JSON.stringify(rec.title)},`);
  lines.push(
    `    publication: ${rec.publication === null ? "null" : JSON.stringify(rec.publication)},`
  );
  lines.push(`    url: ${JSON.stringify(rec.url)},`);
  lines.push(`    date: ${JSON.stringify(rec.date)},`);
  lines.push(`    readingMinutes: ${rec.readingMinutes},`);
  lines.push(`    presentations: ${rec.presentations},`);
  lines.push(`    views: ${rec.views},`);
  lines.push(`    reads: ${rec.reads},`);
  lines.push("  },");
}
lines.push("];");
lines.push("");

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${records.length} articles to ${outPath}`);
