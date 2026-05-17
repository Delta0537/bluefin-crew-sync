# BlueFin Crew Sync — building with Claude Code (and Cursor)

You are **actively building** **bluefin-crew-sync**, the BlueFin Energy Services internal scheduling app. The owner uses **Cursor** and **Claude Code** as **two peers on the same product**—not a linear “pass the baton” workflow. Sessions switch between tools and people; **durable notes in the repo** keep everyone aligned while **shipping features, fixes, and ops**.

Write **clear, maintainable code** and **update shared docs** when you learn something non-obvious so the next session—human or agent—does not rediscover it. That is **shared project memory**, not paperwork only for handoffs.

## One repo, one canonical folder (read first)

- **GitHub:** There is a **single** app repository: **`Delta0537/bluefin-crew-sync`**. Lovable pushes to **that** repo; the **repository root** is the app root (no extra wrapper folder on GitHub).
- **Local:** The owner may use a Cursor workspace like **`BlueFin Schedule`** that contains **`bluefin-crew-sync/`** (the only directory with **`.git`**) plus optional extras (EOB `.xlsm`, or a stray **`bluefin-crew-glass/`** copy without git). **All git and dev commands run inside `bluefin-crew-sync/`.**
- **Do not** “merge two GitHub folders” — consolidate **local duplicates** only, per **`docs/handoff/REPO-STRUCTURE.md`**.

## Shared context in the repo (mandatory)

- **Assume** tomorrow’s session might be Cursor, Claude Code, Lovable, or the owner with only the repo—while **everyone is still building**, not closing the project.
- **Maintain** a thin **continuity layer** in git (not only chat) so active development does not depend on one thread:

  1. **`docs/handoff/README.md`** — living snapshot: branch, deploy target, Supabase project nickname, env var **names** (never values), open risks, “next 3 tasks.”
  2. **`docs/handoff/decisions.md`** — dated ADRs: schema choices, why `fc_number` not `customer_number`, job status enum, RLS model.
  3. **`prompts/`** — reusable task prompts: migrations, security audit, deploy Railway/Vercel, Lovable sync—each with prerequisites and verification.
  4. **`skills/`** (repo root or `.claude/skills/`) — **`SKILL.md`** files for **repeatable procedures** the team runs often: trigger phrases, prerequisites, steps, verification, rollback.

- **Rule:** After **non-trivial** work (schema, deploy, auth, major UX), refresh `docs/handoff/README.md`. When you lock in a **repeatable** procedure, add or extend **`skills/.../SKILL.md`** so Cursor and Claude both apply it the same way.

Suggested initial skills to author (minimum):

- `skills/bluefin-supabase-migrations/SKILL.md` — order of migrations, SQL editor vs CLI, how to confirm `fc_number`, enums, RLS.
- `skills/bluefin-eob-schedule/SKILL.md` — what `/schedule` vs `/schedule-v2` are, data model mapping to the EOB spreadsheet.
- `skills/bluefin-security-supply-chain/SKILL.md` — secrets rotation, dependency audit, “what to check after a key leak,” Git history hygiene.
- `skills/bluefin-deploy-railway-or-vercel/SKILL.md` — env vars, build command, Node version, Supabase URLs, preview vs prod.

## Product context

- **Users:** ~5–10 internal; **no production** requirement yet; dev via `npm run dev` against **shared hosted Supabase**.
- **Lovable.dev:** Project is connected to GitHub **`Delta0537/bluefin-crew-sync`** (confirm in Lovable Git settings). Treat **GitHub as integration hub** between Lovable and local dev; **Supabase is the live data backend** for the app.
- **Stack:** Vite + React + TypeScript, TanStack Router (file routes under `src/routes/`), Supabase (auth + Postgres + RLS), shadcn/ui + Tailwind, sonner toasts.
- **Deploy target:** **Railway** — see **`docs/handoff/RAILWAY-DEPLOY.md`** (Nitro `node-server`, `npm run build` + `npm start`). **Vercel** remains optional via `VERCEL=1`; see **`docs/handoff/VERCEL-DEPLOY.md`**.
- **Local vs prod build:** Lovable’s preset defaults to a **Cloudflare Worker** on plain `vite build`. **Railway** sets `RAILWAY_ENVIRONMENT`, which switches the build to **Nitro + `.output/`** for Node.

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

## Git / GitHub (keep `main` honest)

- Local `main` may diverge from `origin/main`. **Run `git status`**, **`git fetch origin`**, and reconcile (push / pull / rebase per team practice) so GitHub and **Lovable** reflect what you are building.
- After a push, confirm **Lovable** shows the branch and commits you expect.

## First tasks when you pick up the repo (suggested)

1. **Reconcile GitHub vs local** — push or pull; align `main` with team intent.
2. **Verify Supabase** — tables exist, `jobs.fc_number` present, enums match the app, RLS sane.
3. **Grow `docs/handoff/` and `skills/`** as above; keep root `README.md` pointing at them so both Cursor and Claude land in the same place.
4. **Supabase keys** — if not already done after historical `.env` exposure, rotate; note status and date in `docs/handoff/README.md` (**no** secret values).
5. **Deploy** — **Railway** when ready; see **`docs/handoff/RAILWAY-DEPLOY.md`** (optional Vercel: **`VERCEL-DEPLOY.md`**).
6. Optional: **EOB `.xlsm` import** — spec in `docs/handoff/` once schema and core flows are stable.

## When you sync with the owner

- Short summary: what you **built or changed**, where docs/skills live, what remains **unsafe** or **unverified**, and the **exact next command** they should run (if any).

**On first touch:** (1) confirm git remote and divergence from `origin/main`, (2) list `supabase/migrations/`, (3) update `docs/handoff/README.md` with today’s snapshot, then **continue building** (features, fixes, deploy, audits—whatever the owner asks).
