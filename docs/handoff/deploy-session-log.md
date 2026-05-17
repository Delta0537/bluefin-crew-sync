# Deploy work log (BlueFin Crew Sync)

Chronicle of getting the app to **Railway** with **Nitro / Node**, replacing a **Cloudflare Worker**-centric default. Use as on-ramp for future sessions.

## Stack decisions

- **Hosting:** Railway over Vercel (account/billing limits on Vercel; preference for flexibility).
- **Production bundle:** **Nitro `node-server`** → `.output/server/index.mjs`, **`npm start`**. Optional **`VERCEL=1`** still selects Nitro’s Vercel preset for that platform only.
- **Removed as the app deploy path:** Cloudflare Workers build (`@cloudflare/vite-plugin`, `wrangler.jsonc`). **`vite.config.ts`** sets **`cloudflare: false`** and always attaches **`nitro`**.

## Bugs and fixes

| Issue | Cause | Fix |
|--------|--------|-----|
| Railway build not using Nitro | Docs referred to `RAILWAY_ENVIRONMENT`; Railway provides **`RAILWAY_ENVIRONMENT_ID`** / **`RAILWAY_ENVIRONMENT_NAME`**. | Detection in `vite.config.ts` (later mooted: always Nitro for prod build). |
| Vercel 402 | Team billing / suspension. | Use Railway; optional Vercel path kept with `VERCEL=1`. |
| Merge / clone confusion | Feature branch `claude/integrate-new-api-oawfs` vs **`main`**; `git push origin main` with no local `main`. | Merge branch into `main`; push **`HEAD`** or checkout **`main`**. |
| Git HTTPS “password” rejected | GitHub disallowed password auth for Git. | **`gh auth login`** browser/device flow (recommended) or **classic PAT** as password. |
| Railway / Docker “build failed”, sparse UI logs | Nixpacks / UI; need traceability. | **Dockerfile** + **GitHub Actions** `.github/workflows/docker-build.yml`; **`railway.toml`** deploy-only so root **Dockerfile** auto-detects. |
| **GitHub Actions + Docker + Railway `npm ci` failed** | **`package-lock.json` out of sync** with `package.json` (e.g. missing `chokidar`, `lru-cache`, `readdirp` in lockfile). | Run **`npm install`**, commit updated **`package-lock.json`** (commit **`b44f96b`**). |

## Files touched (mental map)

- **`vite.config.ts`** — Nitro always (Vercel preset when `VERCEL=1`).
- **`Dockerfile`** — Node 22 bookworm-slim; `npm ci`; `ARG`/`ENV` for **`VITE_SUPABASE_*`** (Railway passes matching vars at build).
- **`railway.toml`** — `[deploy]` start + healthcheck; build via auto-detected Dockerfile.
- **`nixpacks.toml` / `.nvmrc`** — still useful for local / alternate builders.
- **`.github/workflows/docker-build.yml`** — smoke Docker build on `main` with placeholder `VITE_*` build-args.

## Ops reminders

- After any **`package.json`** change: **`npm install`** and commit **`package-lock.json`** so **`npm ci`** works in Docker/CI.
- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` on Railway; never service role in `VITE_*`.
- **Cursor:** user setting **`workbench.externalBrowser`** → Chrome for editor-opened links; Terminal **`open`** still follows macOS default browser unless overridden.

_Last updated: 2026-05-17_
