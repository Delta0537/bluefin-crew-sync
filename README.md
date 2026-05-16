# BlueFin Crew Sync

Internal scheduling app for BlueFin Energy Services - HVOF, chemical cleaning,
and commissioning crews.

## Stack

Vite + React + TanStack Start + TanStack Router + Supabase + Tailwind + shadcn/ui.

## Local dev

```sh
bun install        # or npm install
cp .env.example .env   # then fill in Supabase values
bun run dev
```

## Deploy

Vercel is the target. The Vite build uses Lovable's preset which is wired for
Cloudflare Workers, so `vercel.json` may need an `outputDirectory` tweak after
the first Vercel build - see [`docs/handoff/VERCEL-DEPLOY.md`](./docs/handoff/VERCEL-DEPLOY.md)
for the playbook (do not guess; capture the build log first).

Cloudflare Pages / Workers is a drop-in fallback (`wrangler deploy`) since the
repo is already configured for it.

## Handoff docs

See [`docs/handoff/`](./docs/handoff/) - deploy notes and the Claude initial
prompt for new sessions.
