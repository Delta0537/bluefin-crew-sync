// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Cloudflare Workers (Lovable default): local `vite build` with no platform env.
// Railway: Nitro `node-server` when Railway-injected vars are present (`RAILWAY_ENVIRONMENT_ID`,
// `RAILWAY_ENVIRONMENT_NAME`, etc.) or for local parity `RAILWAY_ENVIRONMENT` / `NITRO_NODE=1`.
// Vercel (optional): `VERCEL=1` — Nitro Vercel preset + Build Output API.
const deployNitro =
  process.env.VERCEL === "1" ||
  process.env.RAILWAY_ENVIRONMENT !== undefined ||
  process.env.RAILWAY_ENVIRONMENT_ID !== undefined ||
  process.env.RAILWAY_ENVIRONMENT_NAME !== undefined ||
  process.env.NITRO_NODE === "1";

const nitroPreset =
  process.env.VERCEL === "1" ? "vercel" : ("node-server" as const);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  cloudflare: deployNitro ? false : undefined,
  plugins: deployNitro
    ? [
        nitro({
          config: { preset: nitroPreset },
        }),
      ]
    : [],
  tanstackStart: {
    server: { entry: "server" },
  },
});
