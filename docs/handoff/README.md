# Project continuity

This folder supports **active development** across **Cursor, Claude Code, Lovable, and local dev**. Cursor and Claude are **both building the app**; these docs keep **shared context** in the repo so work does not depend on a single chat thread.

## Start here

- **Anyone coding in Claude (or picking up after a break):** Read **`CLAUDE-INITIAL-PROMPT.md`** first—it is the **build + guardrails** brief for this codebase, not “handoff-only” paperwork.
- **Everyone:** Keep **`README.md` in this folder** current when deploy, Supabase, or major risks change.

## Files

| File | Purpose |
|------|---------|
| `CLAUDE-INITIAL-PROMPT.md` | Master brief for **building** the app with Claude alongside Cursor (constraints, stack, security, deploy) |
| `REPO-STRUCTURE.md` | **Single folder / GitHub vs local layout** (Lovable, `bluefin-crew-sync` vs `bluefin-crew-glass`) |
| `RAILWAY-DEPLOY.md` | **Railway** — Nitro `node-server`, `PORT`, Supabase env vars, Git deploy |
| `deploy-session-log.md` | **Dated runbook** — what broke (lockfile/`npm ci`, Node, auth) and what we changed |
| `VERCEL-DEPLOY.md` | **Optional Vercel** — Nitro vercel preset when `VERCEL=1` |
| `README.md` | Living snapshot (fill in as the project evolves) |
| `decisions.md` | Add when created: architecture / schema decisions (ADRs) |
| `security-audit-YYYY-MM-DD.md` | Add when an audit is run |

## Living snapshot (edit as you go)

_Last updated: (fill in date)_

| Item | Status |
|------|--------|
| Git remote | `https://github.com/Delta0537/bluefin-crew-sync.git` |
| Default branch | `main` |
| Supabase | Hosted project (name in dashboard); run migrations in SQL Editor or CLI |
| Lovable | Connected repo: `Delta0537/bluefin-crew-sync` (confirm in project Git settings) |
| Deploy | **Railway** — see `RAILWAY-DEPLOY.md`; Vercel optional |
| Secrets | Ensure `.env` is local only; rotate keys if ever committed |

### Next 3 tasks

1.
2.
3.

### Open risks

-
