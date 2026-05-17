# Vercel deploy (optional)

TanStack Start in this repo is **oriented for Railway** (Nitro `node-server` when `RAILWAY_ENVIRONMENT` is set). Vercel remains available if you set **`VERCEL=1`** during build (Nitro **vercel** preset → `.vercel/output`).

**Primary guide:** [`RAILWAY-DEPLOY.md`](./RAILWAY-DEPLOY.md)

## Vercel quick notes

- Vercel sets `VERCEL=1` automatically; `vite.config.ts` selects the **vercel** Nitro preset.
- Env vars: same as Railway — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Local check: `VERCEL=1 npm run build` then inspect `.vercel/output`.

If framework detection conflicts, align the project **Build Command** with `npm run build` and trust Nitro’s Build Output layout from the log.
