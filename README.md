# Akshay Borse — personal site

A static portfolio and writing site built with **React**, **Vite**, and **Tailwind CSS v4**. Editable copy lives in **`src/content/*.ts`**; articles are **`src/content/posts/*.md`**. There is **no backend** — the production build is plain HTML, JS, and CSS in **`dist/`**, suitable for **GitHub Pages** or any static host.

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
| `npm run preview` | Serve `dist/` locally (same paths as production) |

After changing routes or assets, use **`npm run preview`** to confirm behavior before deploying.

## Content model (`src/content/`)

| File | What to edit |
|------|----------------|
| `profile.ts` | Name, titles, tagline, SEO description, hero/footer one-liners |
| `links.ts` | **Site URL** (canonical / Open Graph), email, social URLs |
| `home.ts` | Homepage credibility copy, section blurbs, highlight stats |
| `bio.ts` | About page |
| `contact.ts` | Contact intro, social row |
| `experience.ts` | Work history |
| `projects.ts` | Projects + category labels |
| `resume.ts` | Résumé sections |
| `nav.ts` | Top navigation |
| `articles.ts` | Order of posts (slugs) |
| `paths.ts` | “Where to edit” strings in the UI |
| `types.ts` | TypeScript shapes |
| `posts/*.md` | Article bodies + YAML frontmatter |
| `loadPosts.ts` | Markdown loader (rarely edited) |

Import: `import { site, … } from '@/content'`.

### New article checklist

1. Add `your-slug.md` under `src/content/posts/`.
2. Add the slug to `articleOrder` in `src/content/articles.ts` (or it is appended after ordered slugs).
3. Frontmatter: `title`, `description`, `date`, `tags`, `featured`.

Optional HTML in Markdown: `<div class="callout callout-quote">…</div>` (styled in `src/index.css`).

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

**Fix:**

1. **Settings → Pages → Source:** choose **GitHub Actions**, **not** “Deploy from a branch” with **/(root)** or **/docs** from the same repo (that publishes the raw repo, including unbuilt `index.html`).
2. Push to **`main`** or **`master`** so **`.github/workflows/deploy.yml`** runs. Check **Actions** for a green run; open the **deploy** job and confirm it uploaded **`dist/`**.
3. After the workflow finishes, hard-refresh the site (or wait a minute for CDN). View source again: you should see `<script type="module" … src="/assets/index-….js">` (hashed bundle), not `/src/main.tsx`.

Locally, **`npm run build`** must succeed end-to-end (it runs **`scripts/verify-dist.mjs`** to ensure `dist/index.html` looks like a production build).

### “MIME type application/octet-stream” (module script failed)

Browsers require module scripts to be served as JavaScript. **`application/octet-stream`** usually means one of:

1. **The URL still points at source**, e.g. **`/src/main.tsx`** — GitHub Pages does not compile Vite; it serves that file as a generic binary, so the MIME type is wrong. **Fix:** deploy **`dist/`** from **`npm run build`**, not the repo-root `index.html`. View source: you must see **`/assets/index-….js`**, not **`/src/main.tsx`**.
2. **Wrong `base` for a project site** — if the site is at **`https://user.github.io/repo/`** but the HTML references **`/assets/...`** (root), the browser requests a missing URL and you can get odd responses. **Fix:** set **`VITE_BASE=/repo/`** in **`.env.production`** and **`links.siteUrl`** accordingly, then rebuild.

The production build also strips **`crossorigin`** from emitted `<script>` / `<link>` tags so static hosts are less likely to mishandle module loads.

### How deploy works

- Workflow: **`.github/workflows/deploy.yml`**
- On each push to **`main`** or **`master`**, Actions runs `npm ci`, `npm run build`, uploads **`dist/`**, and publishes to Pages.

### After deploy

- Site URL for a **user site** repo `username.github.io`: **`https://username.github.io/`** (root path).
- In **`src/content/links.ts`**, set **`siteUrl`** to that URL (no trailing slash) so canonical and Open Graph URLs match production.

## Deploying to a **project** repo instead (`/repo-name/`)

If the same app is built for **`https://amsborse.github.io/my-portfolio/`** (project site):

1. **`vite.config.ts`** — `base` defaults to **`/`**. Override with a **`.env.production`** file in the repo root:

   ```bash
   VITE_BASE=/my-portfolio/
   ```

   Use your **exact** repository name, with leading and trailing slashes.

2. **`src/content/links.ts`** — set **`siteUrl`** to `https://amsborse.github.io/my-portfolio` (no trailing slash).

3. Rebuild and deploy. **React Router** already uses **`import.meta.env.BASE_URL`** (`App.tsx`); **`index.html`** uses **`%BASE_URL%favicon.svg`** so the favicon resolves under the subpath.

4. **`npm run preview`** with the same `VITE_BASE` — verify deep links and assets before pushing.

## Routing on static hosting

The app uses **`BrowserRouter`** with **`basename`** derived from Vite’s base. **Hash routing is not required** for GitHub Pages because **`404.html`** is a copy of **`index.html`**: requests to unknown paths load the SPA, then React Router renders the correct route.

**Limitation:** The server always returns HTTP **200** for SPA routes (GitHub Pages serves `404.html`). That is normal for client-rendered sites on static hosts.

## SEO

The **`Seo`** component sets `document.title`, meta description, canonical link, and basic Open Graph / Twitter tags. The canonical base comes from **`links.siteUrl`** (exposed as **`site.url`**).

## License

Private / personal — adjust as you like.
