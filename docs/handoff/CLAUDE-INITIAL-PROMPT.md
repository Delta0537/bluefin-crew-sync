# Claude initial prompt — BlueFin Crew Sync

Paste this at the top of a new Claude Code session when working on this repo.

---

This is **BlueFin Crew Sync**, an internal scheduling app for BlueFin Energy
Services (HVOF, chemical cleaning, commissioning). Stack: Vite + React +
TanStack Start + TanStack Router + Supabase (Postgres + auth + RLS) + Tailwind +
shadcn/ui. Code lives in `src/`. SQL migrations in `supabase/migrations/`.

**Domain primer.** Jobs have an FC number, customer, site, equipment, PO status,
and job status (Upcoming / Ongoing / Bidding / Lost / Cross Utilization /
Projects Returned-Invoicing / Other / Cancelled). Crew members ("employees")
have one of 5 positions: Tech, Supervisor, Project Manager, Engineer,
Safety Lead. Assignments (`job_assignments`) link an employee to a job for a
date range with a `role_on_job`. Time off (`time_off`) blocks days
(PTO / Sick / Medical / Vacation / Bereavement / Light Duty / Out / Other).
Anyone on time off does not count toward utilization on those days.

**Permissions.** RLS + an `app_role` enum (`admin`, `manager`, `viewer`). Use
the `canModify` hook (`src/hooks/use-auth.tsx`) for any write UI. Only ~4 people
have modify access; everyone else is read-only.

**What to read first when starting work:**
- `src/lib/domain.ts` — canonical enums and display tones
- `src/integrations/supabase/types.ts` — generated DB types
- `supabase/migrations/` (latest two files) — most recent schema state
- `docs/handoff/VERCEL-DEPLOY.md` if anything deploy-related is in play

**Deploy note.** The Vite setup uses Lovable's preset with a Cloudflare-Workers-
oriented TanStack Start build (see `vite.config.ts` / `wrangler.jsonc`). If we
deploy to Vercel and the first build fails with "output directory not found",
do not guess `vercel.json` — read `docs/handoff/VERCEL-DEPLOY.md`, capture the
full Vercel build log, and adjust `vercel.json` in one pass from the actual
emitted output path. Owner will supply the log if needed.

**Style rules:**
- Don't write handoff docs unless asked.
- Don't add fields, abstractions, or fallbacks that weren't requested.
- Don't replicate the source Excel sheets' look — keep the modern Linear/Notion
  feel that's already in place.
- Match existing component patterns (`src/components/job-dialog.tsx`,
  `src/components/time-off-dialog.tsx`) for any new CRUD UI.
