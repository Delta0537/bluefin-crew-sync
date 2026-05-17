# Railway deploy (BlueFin Crew Sync)

## What gets built

Every **`npm run build`** uses **Nitro** with the **`node-server`** preset (Cloudflare Workers are not part of this repo’s deploy path). Output:

- **`.output/server/index.mjs`** — Node HTTP server (listens on **`PORT`**, which Railway provides)
- **`.output/public`** — static client assets

`.output/` is gitignored.

Optional: set **`VERCEL=1`** during build only if you deploy to Vercel (Nitro’s `vercel` preset → `.vercel/output`). See **`VERCEL-DEPLOY.md`**.

## `package.json` scripts

| Script   | Purpose |
|----------|---------|
| `build`  | `vite build` → `.output/` |
| `start`  | `node .output/server/index.mjs` (also set in **`railway.toml`**) |

## Node version

**Vite 7** requires **Node ^20.19.0 or ≥22.12.0**. The repo pins **`NIXPACKS_NODE_VERSION=22`** in **`nixpacks.toml`** so Railway’s Nixpacks builder does not use the old default (often Node 18). If a deploy still fails with an engine error, try adding **`NIXPACKS_NODE_VERSION=23`** or **`20`** in Railway variables and redeploy.

## Environment variables

Add in **Railway → Service → Variables**:

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key (never service role) |

Server-only admin paths may use **`SUPABASE_SERVICE_ROLE_KEY`** — set only on the server, never in `VITE_*`.

Optional fallbacks in client code: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

## New project (GUI)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → **`Delta0537/bluefin-crew-sync`** (or your fork).
2. Root directory: repo root (where `package.json` lives).
3. Railway runs **`npm install`**, **`npm run build`**, **`npm start`** (Nixpacks; **`railway.toml`** pins the start command).
4. Add the Supabase variables; redeploy after changing secrets.

## Local check

```bash
npm run build
node .output/server/index.mjs
```

(Listens on **`PORT`** or defaults to **3000** if unset.)

## CLI deploy (from your laptop)

```bash
cd bluefin-crew-sync
railway login              # or: railway login --browserless
railway init
railway variable set VITE_SUPABASE_URL "https://...."
railway variable set VITE_SUPABASE_PUBLISHABLE_KEY "...."
railway up
```

Use a [project token](https://docs.railway.com/guides/cli#project-tokens) or **`RAILWAY_TOKEN`** in CI.

## GitHub authentication

HTTPS pushes require a [**Personal Access Token**](https://github.com/settings/tokens) (or SSH keys), not your GitHub password.
