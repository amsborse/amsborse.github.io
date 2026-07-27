# Akshay Borse — personal site

A static portfolio and writing site built with **React**, **Vite**, and **Tailwind CSS v4**. **Editable copy lives in `src/data/*.ts`**; article bodies are **`src/content/articles/*.md`**. Global styles are **`src/styles/index.css`**. There is **no backend** — the production build is plain HTML, JS, and CSS in **`dist/`**, suitable for **GitHub Pages** or any static host.

## Where to edit content (quick reference)

| What                                                                                                           | File                                    |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Profile** — name, headlines, subheadline, short bio, SEO, hero/footer lines, CTAs, optional artist–yogi line | `src/data/profile.ts`                   |
| **Homepage** — credibility copy, section blurbs, highlight stats, hero quick links                             | `src/data/home.ts`                      |
| **About page**                                                                                                 | `src/data/about.ts`                     |
| **Projects**                                                                                                   | `src/data/projects.ts`                  |
| **Experience / jobs**                                                                                          | `src/data/experience.ts`                |
| **Résumé page** — skills, achievements, PDF link                                                               | `src/data/resume.ts`                    |
| **Navigation**                                                                                                 | `src/data/navigation.ts`                |
| **Social links, email, site URL**                                                                              | `src/data/socials.ts`                   |
| **Contact page copy**                                                                                          | `src/data/contact.ts`                   |
| **Article list order**                                                                                         | `src/data/articles.ts` (`articleOrder`) |
| **Article bodies (Markdown)**                                                                                  | `src/content/articles/*.md`             |
| **Article loading (code)**                                                                                     | `src/utils/loadArticles.ts`             |
| **UI “where to edit” hints**                                                                                   | `src/data/paths.ts`                     |

Import site-wide data: `import { site, projects, … } from '@/data'`. Article API: `import { getAllArticles, getArticleBySlug, … } from '@/utils/loadArticles'`.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:1111`).

| Script                    | Description                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server with HMR                                                              |
| `npm run build`           | Typecheck + production build + `dist/404.html` + verify `dist/`                       |
| `npm run build:docs`      | Same as **`build`**, then copy **`dist/` → `docs/`** for “Deploy from branch → /docs” |
| `npm run preview`         | Serve `dist/` locally (same paths as production)                                      |
| `npm run validate`        | Full quality gate: typecheck, lint, format, unit coverage, build                      |
| `npm run test`            | Unit tests (Vitest)                                                                   |
| `npm run test:coverage`   | Unit tests + HTML coverage report in `coverage/`                                      |
| `npm run test:e2e`        | Playwright smoke and interaction tests                                                |
| `npm run lint`            | ESLint                                                                                |
| `npm run format`          | Prettier write                                                                        |
| `npm run verify:kg`       | Validate `.cursor/knowledge-graph/graph.json` vs routes and files                     |
| `npm run verify:arsenal`  | Validate committed `.arsenal/` context workspace                                      |
| `npm run context:refresh` | Regenerate `.arsenal/` index, summaries, and graph (local)                            |

**Quality & agent guardrails** — See [`AGENTS.md`](AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md). Husky runs checks on commit/push. CI runs on every push/PR (`.github/workflows/ci.yml`). Enable branch protection: [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md).

## AI coding agent workflow

All coding agents must read [`AGENTS.md`](AGENTS.md) before implementing changes.

The repository-local task bootstrap, scoped validation, design-memory, and reporting workflow is mandatory for implementation tasks:

```bash
npm run agent:task -- --task "<request>"
# …implement…
npm run review:run
npm run agent:finish
```

Fast mode is default. Thorough and cross-browser checks run only when explicitly requested.

After changing routes or assets, use **`npm run preview`** to confirm behavior before deploying.

## Author guide: articles (hosted Markdown)

**Where content lives** — Only **`src/content/articles/*.md`**. Layout, typography, and reading UI are in **`src/pages/Article.tsx`** and **`src/styles/index.css`** (`prose-article`, `.article-reading`). Do not put article prose in React components.

**Routes** — **`/writing`** lists posts; **`/writing/:slug`** renders one post (e.g. `/writing/designing-for-reliability`).

### Add a new article by hand

1. Create **`src/content/articles/your-slug.md`** with YAML frontmatter and the body below the second `---`.
2. Add **`your-slug`** to **`articleOrder`** in **`src/data/articles.ts`** (or omit it; unordered files still appear after the ordered list).
3. Frontmatter fields supported:

| Field            | Notes                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| `title`          | Required for display                                                            |
| `slug`           | Optional; should match filename without `.md`                                   |
| `date`           | ISO `YYYY-MM-DD`                                                                |
| `description`    | Card + SEO                                                                      |
| `tags`           | `["tag1", "tag2"]`                                                              |
| `featured`       | `true` / `false`                                                                |
| `readingMinutes` | Number; if omitted, estimated from word count                                   |
| `readTime`       | Display string, e.g. `"12 min"` (overrides default label)                       |
| `source`         | e.g. `"Medium"`                                                                 |
| `canonicalUrl`   | Original URL if migrated                                                        |
| `coverImage`     | URL string (reserved for future hero)                                           |
| `draft`          | `true` hides the post in **production** builds (still visible in `npm run dev`) |

### Import from Medium HTML export

1. Download your Medium export (ZIP) and extract it. The **`posts`** folder contains one **`.html`** file per story.
2. From the repo root:

```bash
node scripts/import-medium-html.js "C:/path/to/medium-export/posts"
```

Optional:

- **`--update-index`** — append each new slug to **`src/data/articles.ts`** (skips drafts).
- **`--only partial`** — import only files whose **derived slug** contains that substring (good for testing one post).

Example (test one):

```bash
node scripts/import-medium-html.js "C:/path/to/posts" --only 2cc62e77903e
```

The script **does not rewrite your wording** — it strips Medium wrappers and converts HTML to Markdown via **Turndown**. You should review the `.md` file once (especially headings and images).

### Preview locally

```bash
npm run dev
```

Open **`/writing`** and **`/writing/your-slug`** in the dev server.

### How rendering works

- **`src/utils/loadArticles.ts`** eagerly loads all `*.md` via Vite’s `import.meta.glob`, parses frontmatter, and renders Markdown to HTML with **marked**.
- **`getAllArticles()`**, **`getArticleBySlug(slug)`**, **`getFeaturedArticles()`** are the public API.
- Table of contents is built from `##` / `###` / `####` headings in the Markdown source.

## Articles (markdown) — legacy note

Optional HTML in Markdown: `<div class="callout callout-quote">…</div>` (styled in `src/styles/index.css`).

## Build output

```bash
npm run build
```

Writes **`dist/`** — static files only. The build also copies **`index.html` → `dist/404.html`** so GitHub Pages serves the SPA shell for unknown paths (client-side routing).

**`public/.nojekyll`** is copied into `dist` so GitHub Pages does not run Jekyll (which can break folders like `_assets`).

## GitHub Pages deployment (recommended)

This repo is set up for the **GitHub Actions → Pages** flow (no `gh-pages` branch or `npm run deploy` required).

### One-time GitHub settings

1. **Repository → Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch” unless you intentionally want branch-based deploys).

### Blank white page on GitHub Pages

That almost always means the live site is **not** serving the **Vite build** in **`dist/`**.

**Symptoms:** View source on `https://yoursite.github.io/` and you see `<script type="module" src="/src/main.tsx">` or `href="%BASE_URL%favicon.svg"`. Those only exist in the **development** `index.html` at the repo root. Browsers cannot load `/src/main.tsx` from static hosting, so the app never runs → white screen.

**Fix (pick one):**

**A — GitHub Actions (recommended)**

1. **Settings → Pages → Source:** **GitHub Actions** (not “Deploy from a branch”).
2. Push **`main`** / **`master`** so **`.github/workflows/deploy.yml`** runs and uploads **`dist/`**.
3. Hard-refresh the site. View source: you must see **`src="/assets/index-….js"`**, not **`/src/main.tsx`**.

**B — Deploy from a branch (no Actions)**  
Publishing **/(root)** from this repo serves the **development** `index.html` → **`/src/main.tsx`** → white page / MIME errors.  
Instead: run **`npm run build:docs`**, commit the generated **`docs/`** folder, push, and set Pages to **Deploy from a branch** → branch **`main`** (or **`master`**) → folder **`/docs`**. The **`docs/`** tree is the same as **`dist/`** (built assets + **`404.html`**).

Locally, **`npm run build`** must succeed ( **`scripts/verify-dist.mjs`** checks **`dist/index.html`** ).

### “MIME type application/octet-stream” (module script failed)

Browsers require module scripts to be served as JavaScript. **`application/octet-stream`** usually means one of:

1. **The URL still points at source**, e.g. **`/src/main.tsx`** — GitHub Pages does not compile Vite; it serves that file as a generic binary, so the MIME type is wrong. **Fix:** deploy **`dist/`** from **`npm run build`**, not the repo-root `index.html`. View source: you must see **`/assets/index-….js`**, not **`/src/main.tsx`**.
2. **Wrong `base` for a project site** — if the site is at **`https://user.github.io/repo/`** but the HTML references **`/assets/...`** (root), the browser requests a missing URL and you can get odd responses. **Fix:** set **`VITE_BASE=/repo/`** in **`.env.production`** and **`links.siteUrl`** in **`src/data/socials.ts`** accordingly, then rebuild.

The production build also strips **`crossorigin`** from emitted `<script>` / `<link>` tags so static hosts are less likely to mishandle module loads.

### How deploy works

- Workflow: **`.github/workflows/deploy.yml`**
- On each push to **`main`** or **`master`**, Actions runs `npm ci`, `npm run build`, uploads **`dist/`**, and publishes to Pages.

### After deploy

- Site URL for a **user site** repo `username.github.io`: **`https://username.github.io/`** (root path).
- In **`src/data/socials.ts`**, set **`siteUrl`** to that URL (no trailing slash) so canonical and Open Graph URLs match production.

## Deploying to a **project** repo instead (`/repo-name/`)

If the same app is built for **`https://amsborse.github.io/my-portfolio/`** (project site):

1. **`vite.config.ts`** — `base` defaults to **`/`**. Override with a **`.env.production`** file in the repo root:

   ```bash
   VITE_BASE=/my-portfolio/
   ```

   Use your **exact** repository name, with leading and trailing slashes.

2. **`src/data/socials.ts`** — set **`siteUrl`** to `https://amsborse.github.io/my-portfolio` (no trailing slash).

3. Rebuild and deploy. **React Router** already uses **`import.meta.env.BASE_URL`** (`App.tsx`); **`index.html`** uses **`%BASE_URL%favicon.svg`** so the favicon resolves under the subpath.

4. **`npm run preview`** with the same `VITE_BASE` — verify deep links and assets before pushing.

## Routing on static hosting

The app uses **`BrowserRouter`** with **`basename`** derived from Vite’s base. **Hash routing is not required** for GitHub Pages because **`404.html`** is a copy of **`index.html`**: requests to unknown paths load the SPA, then React Router renders the correct route.

**Limitation:** The server always returns HTTP **200** for SPA routes (GitHub Pages serves `404.html`). That is normal for client-rendered sites on static hosts.

## SEO

The **`Seo`** component sets `document.title`, meta description, canonical link, and basic Open Graph / Twitter tags. The canonical base comes from **`links.siteUrl`** in **`src/data/socials.ts`** (exposed as **`site.url`**).

## License

Private / personal — adjust as you like.
