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

**Dockerfile** uses **Node 22** (`node:22-bookworm-slim`) so **Vite 7** engine requirements are met without relying on Nixpacks. **`nixpacks.toml`** / **`.nvmrc`** remain useful for local tooling or if you switch the service back to Nixpacks.

## Environment variables

Add in **Railway → Service → Variables**:

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key (never service role) |

Server-only admin paths may use **`SUPABASE_SERVICE_ROLE_KEY`** — set only on the server, never in `VITE_*`.

SSR and auth middleware read **`process.env`**. Define **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** on the Railway service (same as Lovable); they are passed into the Docker **build** via **`Dockerfile`** `ARG`s and are also available at **runtime**, and the server falls back to those names when **`SUPABASE_URL`** / **`SUPABASE_PUBLISHABLE_KEY`** are unset.

## Builder: Docker (auto-detected)

Railway picks up the root **`Dockerfile`** automatically. **`railway.toml`** only sets **deploy** (start command + healthcheck) so builds are not forced through a second builder path that sometimes shows **empty logs** in the UI.

If a deploy “fails” but the dashboard shows nothing, use **GitHub → Actions → “Docker build”** on the same commit, or the CLI below.

## New project (GUI)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → **`Delta0537/bluefin-crew-sync`** (or your fork).
2. Root directory: repo root (where `package.json` and `Dockerfile` live).
3. Add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** in **Variables**. They are wired into the **Docker build** via **`ARG`** in the **`Dockerfile`** so Vite can embed them at build time. Redeploy after changing them.
4. Railway builds the image from **`Dockerfile`** and runs **`startCommand`** from **`railway.toml`** (same as Dockerfile `CMD`).

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

## When Railway shows no / empty build logs

This is a **known Railway UI pain point** (especially with Docker / Metal builders): the deployment can fail while the browser pane stays blank or only shows scheduling lines. Treat the dashboard as unreliable for Docker build output.

### 1. Use the Railway CLI (most reliable)

Default **`railway logs`** streams **runtime / deploy** logs. Failed builds usually need **build** logs explicitly:

```bash
cd bluefin-crew-sync
railway login          # once per machine
railway link           # pick project → environment → service
railway logs --build --latest --lines 400
```

- **`--build`** — Docker build phase (`npm ci`, `vite build`, etc.).
- **`--latest`** — include the newest deployment even if it failed or never reached “running”.
- **`--lines N`** — fetch history without streaming (good when the UI is empty).

After the container is up, runtime issues: **`railway logs`** or **`railway logs --deployment --latest`**.

### 2. Mirror build output on GitHub

This repo runs **`.github/workflows/docker-build.yml`** on **`main`**. Open **GitHub → Actions → Docker build** for the **same commit** as Railway — logs there are plain Docker/`npm ci`/Vite output and often match Railway’s Docker build failures exactly.

### 3. Dashboard checklist

1. **Service → Settings → Source** — repo **`Delta0537/bluefin-crew-sync`**, branch **`main`**, **root directory** empty (repo root unless this service lives in a monorepo subfolder).
2. **Deployments** → failed row → **Build Logs** tab (not only **Deploy Logs**). Try another browser or a private window if the pane stays blank.
3. **Metal builders:** some projects report empty Docker logs until **Metal builders** is toggled off and on under project/service build settings (see [Railway Help Station](https://station.railway.com/) threads on blank build logs).

## “No logs in this time range” on the **project** Logs page

That screen (`…/project/…/logs`) is **aggregated**. With **Last 5 min** and a healthy, idle app, it often shows **nothing**—no requests, no crashes, no log lines in that window.

1. Open the **`bluefin-crew-sync` service** (canvas) → **Deployments** → latest deploy → **Deploy Logs** / **HTTP Logs**, or widen the time filter to **Last hour**.
2. After redeploy, look for the boot line **`bluefin-crew-sync-node-server-start`** (printed by **`railway.toml`** `startCommand`) so you can confirm the process started even when traffic is zero.
3. Prefer the CLI: **`railway logs --deployment --latest --lines 200`** (and **`--service <name>`** if you have multiple services).
