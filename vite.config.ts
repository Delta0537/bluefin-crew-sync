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
  // Keep local ports off 8080 so it doesn’t clash with Railway / `PORT=8080` workflows.
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 5174,
    strictPort: false,
  },
  plugins: [
    nitro({
      config: { preset: nitroPreset },
    }),
  ],
  tanstackStart: {
    server: { entry: "server" },
  },
});
