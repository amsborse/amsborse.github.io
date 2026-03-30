# Akshay Borse — personal site

A static portfolio and writing site built with **React**, **Vite**, and **Tailwind CSS v4**. **Editable copy lives in `src/data/*.ts`**; article bodies are **`src/content/articles/*.md`**. Global styles are **`src/styles/index.css`**. There is **no backend** — the production build is plain HTML, JS, and CSS in **`dist/`**, suitable for **GitHub Pages** or any static host.

## Where to edit content (quick reference)

| What | File |
|------|------|
| **Profile** — name, headlines, subheadline, short bio, SEO, hero/footer lines, CTAs, optional artist–yogi line | `src/data/profile.ts` |
| **Homepage** — credibility copy, section blurbs, highlight stats, hero quick links | `src/data/home.ts` |
| **About page** | `src/data/about.ts` |
| **Projects** | `src/data/projects.ts` |
| **Experience / jobs** | `src/data/experience.ts` |
| **Résumé page** — skills, achievements, PDF link | `src/data/resume.ts` |
| **Navigation** | `src/data/navigation.ts` |
| **Social links, email, site URL** | `src/data/socials.ts` |
| **Contact page copy** | `src/data/contact.ts` |
| **Writing: post order** | `src/data/articles.ts` |
| **Writing: markdown posts** | `src/content/articles/*.md` |
| **UI “where to edit” hints** | `src/data/paths.ts` |

Import site-wide data: `import { site, projects, … } from '@/data'`. Article loaders: `import { getAllPosts, … } from '@/utils/loadArticles'`.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck + production build + `dist/404.html` + verify `dist/` |
| `npm run build:docs` | Same as **`build`**, then copy **`dist/` → `docs/`** for “Deploy from branch → /docs” |
| `npm run preview` | Serve `dist/` locally (same paths as production) |

After changing routes or assets, use **`npm run preview`** to confirm behavior before deploying.

## Articles (markdown)

1. Add `your-slug.md` under **`src/content/articles/`**.
2. Add **`your-slug`** to **`articleOrder`** in **`src/data/articles.ts`** (or it is listed after ordered slugs).
3. Frontmatter supports: **`title`**, **`description`**, **`date`**, **`tags`**, **`featured`**, **`readingMinutes`**, optional **`slug`** (should match the filename slug).

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
