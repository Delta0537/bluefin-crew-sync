# Vercel deploy - known caveat and recovery playbook

## What's actually in this repo

This app is built with **TanStack Start** via the **`@lovable.dev/vite-tanstack-config`**
preset. That preset wires up `@cloudflare/vite-plugin` and points the build at
**Cloudflare Workers**:

- `vite.config.ts` uses `defineConfig` from `@lovable.dev/vite-tanstack-config`,
  which adds the Cloudflare plugin at build-time. The comment in that file says
  explicitly: don't add tanstackStart, viteReact, tailwindcss, tsConfigPaths, or
  the Cloudflare plugin manually - the preset already does.
- `wrangler.jsonc` points at `src/server.ts` as the Worker entry.
- `src/server.ts` is an SSR error wrapper that imports
  `@tanstack/react-start/server-entry`.

There is **no Vercel adapter configured**. The current build emits a Workers
bundle, not a Vercel `.vercel/output` filesystem.

## What that means for Vercel

`vercel.json` (committed at the repo root) tells Vercel:

```jsonc
{
  "buildCommand": "bun run build",
  "outputDirectory": ".output/public",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

That works **only if** the build actually emits a static `index.html` into
`.output/public/`. With the Cloudflare-Workers preset, the static client assets
may end up in:

- `.output/public/` (TanStack Start default for client assets), or
- `dist/` (plain Vite), or
- somewhere else the preset chooses.

We don't know for certain without seeing a build log from the target
environment.

## The rule: don't guess `vercel.json`

If the first Vercel build fails with **"No Output Directory named ..."** or any
variant of "output directory not found":

1. **Capture the full Vercel build log.** All of it, from `Cloning github.com`
   to the failure line. The line that says where files were emitted (`.output/`,
   `dist/`, etc.) is the one we need.
2. **Read this file** (you're in it) and the linked files below - don't try to
   reason about the build target from the source alone, the preset is opaque.
3. **Edit `vercel.json` in one pass** based on the actual emitted path from the
   build log. Common fixes:
   - Change `outputDirectory` to whatever the log shows (e.g. `dist`,
     `.output/public`, or a nested path).
   - If TanStack Start emitted a Vercel-style `.vercel/output/static`, set
     `outputDirectory` to that.
   - If no static `index.html` was emitted at all, the app needs the **TanStack
     Start Vercel adapter** - that's a config change in `vite.config.ts`, not a
     `vercel.json` fix. Stop and ask the owner before doing that.

Owner will paste the build log into chat if Claude doesn't already have it.

## Files to consult before changing the deploy

- `vite.config.ts` - confirms Lovable preset usage
- `wrangler.jsonc` - confirms Cloudflare Workers target
- `package.json` - `scripts.build` runs `vite build`
- `src/server.ts` - Worker entry
- `vercel.json` - the actual config Vercel reads
- `.env.example` - the env-var names Vercel needs

## Fallback if Vercel keeps failing

This repo is **already configured for Cloudflare Pages / Workers**. If Vercel
turns into a tar pit, Cloudflare Pages will deploy this code as-is with no
config changes:

1. `wrangler deploy` (or connect the repo in the Cloudflare dashboard).
2. Set the same env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).
3. Done.

Railway is another option - owner has a Railway subscription. Railway needs a
`Dockerfile` or buildpack config; that's not in this repo yet.
