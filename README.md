# bluefin-crew-sync

Internal scheduling app for BlueFin Energy Services (Vite, React, TanStack Router, Supabase, shadcn/ui).

## Building the app (Cursor, Claude, Lovable)

- **Claude Code + Cursor:** Both are **building this product**; start at [`docs/handoff/CLAUDE-INITIAL-PROMPT.md`](docs/handoff/CLAUDE-INITIAL-PROMPT.md) for constraints, stack, security, and deploy notes.
- **Living project snapshot:** [`docs/handoff/README.md`](docs/handoff/README.md).
- **Local vs GitHub / Lovable (“one folder”):** [`docs/handoff/REPO-STRUCTURE.md`](docs/handoff/REPO-STRUCTURE.md).
- **Railway deploy:** [`docs/handoff/RAILWAY-DEPLOY.md`](docs/handoff/RAILWAY-DEPLOY.md) (optional Vercel: [`VERCEL-DEPLOY.md`](docs/handoff/VERCEL-DEPLOY.md)).

## Development

```bash
npm install
npm run dev
```

Configure Supabase via local `.env` (not committed). Migration order and deploy notes: `docs/handoff/`.
