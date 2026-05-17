// @lovable.dev/vite-tanstack-config bundles TanStack Start, React, Tailwind, paths, etc.
// `cloudflare: false` — we ship Nitro (Node on Railway), not Cloudflare Workers.
// Optional: `VERCEL=1` uses Nitro’s Vercel preset for that platform only.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const nitroPreset =
  process.env.VERCEL === "1" ? "vercel" : ("node-server" as const);

// SSR entry: src/server.ts (error wrapper around TanStack Start).
export default defineConfig({
  cloudflare: false,
  plugins: [
    nitro({
      config: { preset: nitroPreset },
    }),
  ],
  tanstackStart: {
    server: { entry: "server" },
  },
});
