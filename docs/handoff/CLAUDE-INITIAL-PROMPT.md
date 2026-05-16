# BlueFin Crew Sync — Claude Code handoff (coordinate with Cursor)

You are taking over **bluefin-crew-sync**, the BlueFin Energy Services internal scheduling app. Another engineer has been working in **Cursor**; the owner will alternate between Cursor and Claude Code. **Every change must survive multiple handoffs**, so you must **write for coordination**, not one-off cleverness.

## One repo, one canonical folder (read first)

- **GitHub:** There is a **single** app repository: **`Delta0537/bluefin-crew-sync`**. Lovable pushes to **that** repo; the **repository root** is the app root (no extra wrapper folder on GitHub).
- **Local:** The owner may use a Cursor workspace like **`BlueFin Schedule`** that contains **`bluefin-crew-sync/`** (the only directory with **`.git`**) plus optional extras (EOB `.xlsm`, or a stray **`bluefin-crew-glass/`** copy without git). **All git and dev commands run inside `bluefin-crew-sync/`.**
- **Do not** “merge two GitHub folders” — consolidate **local duplicates** only, per **`docs/handoff/REPO-STRUCTURE.md`**.

## Multi-agent coordination (mandatory)

- **Assume** the next session may be Cursor, Claude Code, or a human with only the repo and this folder.
- **Create and maintain** a small **handoff system** in the repo (not only in chat):

  1. **`docs/handoff/README.md`** — current state: branch, last deploy, Supabase project nickname, env var names (never values), open risks, “next 3 tasks.”
  2. **`docs/handoff/decisions.md`** — dated ADRs: schema choices, why `fc_number` not `customer_number`, job status enum, RLS model.
  3. **`prompts/`** — reusable prompts: “run migrations,” “audit security,” “deploy Railway,” “sync Lovable,” each with prerequisites and verification steps.
  4. **Skills (Claude / Cursor)** — add **`skills/`** at repo root (or `.claude/skills/` if you standardize on Claude Code) with **`SKILL.md`** files that encode **repeatable procedures** we do often. Each skill must list: trigger phrases, prerequisites, steps, verification, rollback.

- **Rule:** Whenever you finish a non-trivial task, update `docs/handoff/README.md` and, if you learned a durable procedure, add or extend a **`skills/.../SKILL.md`**.

Suggested initial skills to author (minimum):

- `skills/bluefin-supabase-migrations/SKILL.md` — order of migrations, SQL editor vs CLI, how to confirm `fc_number`, enums, RLS.
- `skills/bluefin-eob-schedule/SKILL.md` — what `/schedule` vs `/schedule-v2` are, data model mapping to the EOB spreadsheet.
- `skills/bluefin-security-supply-chain/SKILL.md` — secrets rotation, dependency audit, “what to check after a key leak,” Git history hygiene.
- `skills/bluefin-deploy-railway-or-vercel/SKILL.md` — env vars, build command, Node version, Supabase URLs, preview vs prod.

## Product context

- **Users:** ~5–10 internal; **no production** requirement yet; dev via `npm run dev` against **shared hosted Supabase**.
- **Lovable.dev:** Project is connected to GitHub **`Delta0537/bluefin-crew-sync`** (confirm in Lovable Git settings). Treat **GitHub as integration hub** between Lovable and local dev; **Supabase is the live data backend** for the app.
- **Stack:** Vite + React + TypeScript, TanStack Router (file routes under `src/routes/`), Supabase (auth + Postgres + RLS), shadcn/ui + Tailwind, sonner toasts.
- **Deploy target (later):** Prefer **Railway** (subscription); **Vercel** is acceptable. Document chosen platform in `docs/handoff/README.md` once decided.

## Hard rules (do not violate)

- No raw HTML `<table>` for “Excel-like” grids — use shadcn data-table patterns.
- No emojis in UI text or code comments.
- Loading: **skeletons**, not spinners.
- Every mutation: **toast** (sonner).
- Five positions: Tech, Supervisor, Project Manager, Engineer, Safety.
- Job status enum is **exactly:** Upcoming, Ongoing, Bidding, Lost, Cross Utilization, Projects Returned-Invoicing, Other, Cancelled.
- Job number field: **`fc_number`** (not `customer_number`).
- `time_off.type` includes **Light Duty** and **Out**.
- PMs are **`job_assignments` with `role_on_job = 'Project Manager'`**, not a separate jobs column.
- **No fleet/trucks/trailers** in v2 scope (EOB UI may mention trucks in legacy spreadsheet; do not add fleet tables without explicit approval).

## Repo layout to know

- Migrations: `supabase/migrations/`
  - **Must run in order:** `20260514180347_...sql` first (creates schema), then `20260514182000_schema_corrections.sql` (rename to `fc_number`, replace `job_status`, extend `time_off_type`).
- App routes include **`/schedule`** (original) and **`/schedule-v2`** (EOB-style board + personnel grid). Sidebar link: “EOB Schedule”.
- Generated router: `src/routeTree.gen.ts` — if routes 404 after adding files, regenerate via dev/build per TanStack Router plugin.

## Security / incident context (act on this)

- **`.env` was committed historically** and later removed from git tracking; **treat Supabase anon (and any) keys as compromised until rotated.**
- **Your job:** perform a **practical security and supply-chain audit** (not theatrical):
  - Confirm **no secrets** in repo, Lovable-exposed files, or GitHub history (recommend `git log -p -- .env` / GitHub secret scanning / manual review).
  - **`npm audit`** / lockfile review; check for **unexpected scripts** in `package.json`, odd postinstall hooks, and **unknown dependencies**.
  - Review **Supabase RLS**: viewers vs managers; no accidental public write.
  - Document findings in **`docs/handoff/security-audit-YYYY-MM-DD.md`** with severity and fixes.
- If anything looks like **malware or token exfiltration**, **stop and document** with file paths and evidence; do not “fix silently.”

## Git / GitHub truth check (as of handoff)

- Local `main` may be **ahead of `origin/main`** by commits that include migration + EOB v2 + `.env` removal. **Run `git status` and `git log origin/main..HEAD`** and **push** if appropriate after review.
- After push, confirm **Lovable** shows the same branch/commits you expect.

## First tasks (suggested order)

1. **Reconcile GitHub vs local** — push or pull; ensure `main` matches intent.
2. **Verify Supabase** — tables exist, `jobs.fc_number` present, enums match app types, RLS sane.
3. **Create** `docs/handoff/*` and **`skills/*` SKILL.md** as above; link them from root `README.md` in a short “Contributing / handoff” section.
4. **Rotate Supabase keys** if not done; document in handoff (done/not done, date) **without** pasting secrets.
5. **Choose deploy path** (Railway vs Vercel), spike deploy, document env vars and URL.
6. Optional: **import path** from PPC EOB `.xlsm` — only after schema and app are stable; spec in `docs/handoff/` first.

## How to report back to the human

- Short summary: what you changed, where docs/skills live, what is **still unsafe** or **unverified**, and the **exact next command** they should run.

Begin by: (1) inspecting git remotes and divergence from `origin/main`, (2) listing `supabase/migrations/`, (3) creating or updating `docs/handoff/README.md` with today’s snapshot, then proceed.
