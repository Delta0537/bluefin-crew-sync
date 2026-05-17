# Railway deploy (BlueFin Crew Sync)

## What Railway runs

Railway injects **`RAILWAY_ENVIRONMENT_ID`** / **`RAILWAY_ENVIRONMENT_NAME`** (and related vars) during **build and runtime**. `vite.config.ts` detects those so `vite build`:

- turns off the **Cloudflare** Vite plugin (Lovable’s default for local `vite build`)
- runs **Nitro** with the **`node-server`** preset

Output:

- **`.output/server/index.mjs`** — Node HTTP server (listens on **`PORT`**, which Railway provides)
- **`.output/public`** — static client assets

`.output/` is gitignored.

## `package.json` scripts

| Script   | Purpose |
|----------|---------|
| `build`  | `vite build` — on Railway this produces `.output/` |
| `start`  | `node .output/server/index.mjs` — use as the service **Start Command** if Railway does not pick it up automatically |

## Environment variables

Add in **Railway → Service → Variables**:

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key (never service role) |

Optional fallbacks used in code: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

## New project (GUI)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → select **`Delta0537/bluefin-crew-sync`** (or your fork).
2. Root directory: repo root (where `package.json` lives).
3. Railway will run **`npm install`**, **`npm run build`**, **`npm start`** (Nixpacks Node).
4. Set the Supabase variables above; redeploy if you add them after the first build.

## Local parity

```bash
RAILWAY_ENVIRONMENT_ID=local npm run build
node .output/server/index.mjs
```

(Listens on `PORT` or defaults to `3000` if unset.)

## Other hosts / Docker

If **`RAILWAY_ENVIRONMENT_ID`** is not set (e.g. custom Docker build), use **`NITRO_NODE=1`** for `vite build` so Nitro still emits `.output/` for `node .output/server/index.mjs`.

## CLI deploy (from your laptop)

```bash
cd bluefin-crew-sync
railway login              # or: railway login --browserless
railway init               # new project, or link an existing service
# Set secrets (per service / env): railway variable set VITE_SUPABASE_URL "https://...." 
railway up                 # build + deploy current directory
```

Use a [project token](https://docs.railway.com/guides/cli#project-tokens) or `RAILWAY_TOKEN` in CI for non-interactive deploys.

## Optional: Vercel

The repo still supports **`VERCEL=1`** with Nitro’s **vercel** preset (`.vercel/output`). See **`VERCEL-DEPLOY.md`** for that path only.
