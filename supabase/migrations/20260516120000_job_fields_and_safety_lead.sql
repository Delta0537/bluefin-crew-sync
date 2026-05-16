-- Follow-up to 20260514182000: add fields from the RRS Allied Oil sheet
-- (SPL, PL, Load Out) and rename position "Safety" to "Safety Lead".

-- 1) Add SPL (Sales/Service Project Lead), PL (Project Lead), and Load Out flag.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS spl TEXT,
  ADD COLUMN IF NOT EXISTS pl TEXT,
  ADD COLUMN IF NOT EXISTS load_out BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Rename position_type 'Safety' -> 'Safety Lead'.
--    RENAME VALUE preserves all referencing rows automatically.
ALTER TYPE public.position_type RENAME VALUE 'Safety' TO 'Safety Lead';
