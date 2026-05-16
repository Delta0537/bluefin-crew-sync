# Handoff

This folder is for **cross-session and cross-tool continuity** (Cursor, Claude Code, Lovable, local dev).

## Start here

- **Claude Code (or any new agent):** Read **`CLAUDE-INITIAL-PROMPT.md`** first and follow its coordination rules.
- **Humans:** Keep this README updated when you push, rotate keys, or change Supabase / deploy.

## Files

| File | Purpose |
|------|---------|
| `CLAUDE-INITIAL-PROMPT.md` | Master handoff instructions for the next coding agent |
| `REPO-STRUCTURE.md` | **Single folder / GitHub vs local layout** (Lovable, `bluefin-crew-sync` vs `bluefin-crew-glass`) |
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
| Deploy | Not production yet; candidate: Railway or Vercel |
| Secrets | Ensure `.env` is local only; rotate keys if ever committed |

### Next 3 tasks

1.
2.
3.

### Open risks

-
