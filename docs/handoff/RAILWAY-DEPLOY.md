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
| `start`  | Local: **`PORT=3333`** unless **`RAILWAY_PROJECT_ID`** is set; production **`railway.toml`** / Docker use **`node .output/server/index.mjs`** directly |

## Node version

**Dockerfile** uses **Node 22** (`node:22-bookworm-slim`) so **Vite 7** engine requirements are met without relying on Nixpacks. **`nixpacks.toml`** / **`.nvmrc`** remain useful for local tooling or if you switch the service back to Nixpacks.

## Environment variables

Add in **Railway → Service → Variables**:

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | **Required.** Supabase **Project URL** (Settings → API). Passed into Docker **build** via **`Dockerfile`** `ARG` / `ENV`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Required.** Supabase **anon** / **publishable** key only — never **service_role**. Same build wiring. |
| `PORT` | Usually **8080**; must match **Networking →** target port. Railway may inject **`PORT`** automatically. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** (**service_role** secret). Never **`VITE_*`**. Needed if/when code uses `supabaseAdmin`. |

**Optional duplicates** (same values as above — safe but unnecessary): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Omit them if `VITE_*` are set; the app falls back to `VITE_*`.

**Supabase dashboard → Railway**

| Copy from Supabase | Railway variable |
|--------------------|------------------|
| Project URL | `VITE_SUPABASE_URL` |
| **anon public** key | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **service_role** secret | `SUPABASE_SERVICE_ROLE_KEY` |

After changing **`VITE_*`**, **redeploy** so `npm run build` bakes them in.

**Do not** set **`VERCEL=1`** on Railway (Nitro would use the Vercel preset and break this Docker **`node-server`** deploy).

SSR and auth middleware read **`process.env`** and fall back to **`VITE_*`** when non-prefixed names are unset.

### Password reset (Supabase redirect URLs)

**Authentication → URL configuration → Redirect URLs** must allow the reset callback for **each** origin you use:

- `https://<your-railway-host>/auth/reset-password`
- `http://localhost:5173/auth/reset-password`
- `http://localhost:3333/auth/reset-password` (if you use `npm start` locally)

Wildcards such as `https://*.up.railway.app/**` work if your project allows them.

## Healthcheck

**`railway.toml`** uses **`healthcheckPath = "/healthz"`**. The response is served directly in **`src/server.ts`** before the TanStack SSR handler runs (plain **200** + **`ok`**). The same handler answers **`/api/healthz`** if you ever point a load balancer there.

TanStack Start’s Nitro production bundle exposes a single catch-all SSR route, so Nitro `src/api/*` or extra `server/routes` files are not registered as separate HTTP routes in this setup.

## Builder: Docker (auto-detected)

Railway picks up the root **`Dockerfile`** automatically. **`railway.toml`** only sets **deploy** (start command + healthcheck) so builds are not forced through a second builder path that sometimes shows **empty logs** in the UI.

If a deploy “fails” but the dashboard shows nothing, use **GitHub → Actions → “Docker build”** on the same commit, or the CLI below.

## New project (GUI)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → **`Delta0537/bluefin-crew-sync`** (or your fork).
2. Root directory: repo root (where `package.json` and `Dockerfile` live).
3. Add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** in **Variables**. They are wired into the **Docker build** via **`ARG`** in the **`Dockerfile`** so Vite can embed them at build time. Redeploy after changing them.
4. Railway builds the image from **`Dockerfile`** and runs **`startCommand`** from **`railway.toml`** (same as Dockerfile `CMD`).

## Local check

**Dev (Vite):** `npm run dev` → **`http://localhost:5173`** (see `vite.config.ts` `server.port`; not **8080** so it won’t fight Railway).

**Production bundle locally:** after **`npm run build`**, run **`npm start`**. Unless **`RAILWAY_PROJECT_ID`** is set (Railway’s runtime), the script forces **`PORT=3333`** so you don’t collide with **8080** on your laptop (e.g. a stuck process or `export PORT=8080`). Open **`http://localhost:3333`**.

On **Railway**, **`PORT`** is injected (often **8080**); **`RAILWAY_PROJECT_ID`** is set, so **`npm start`** does **not** override **`PORT`**. The **Dockerfile** / **`railway.toml`** **`startCommand`** runs **`node`** directly—same listening rules.

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

## Past incidents (short)

| Issue | Fix |
|-------|-----|
| Docker **`npm ci` failed** (lockfile / npm 10 vs 11) | **`Dockerfile`** upgrades npm before **`npm ci`**. |
| Healthcheck never passed | **`/healthz`** must be answered in **`src/server.ts`** before TanStack SSR (Nitro file routes are not registered in this bundle). |
| Empty **`VITE_*` at build** → SSR/client errors | Set **`VITE_SUPABASE_*`** on Railway before build; **`Dockerfile`** declares **`ARG`** / **`ENV`**. |
| Railway UI build logs blank | **GitHub Actions** “Docker build” or **`railway logs --build --latest`**. |
