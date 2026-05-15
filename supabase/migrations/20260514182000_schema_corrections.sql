
-- ============================================================
-- MIGRATION: Schema corrections
--   1. Rename jobs.customer_number -> jobs.fc_number
--   2. Replace job_status enum with the 8 operational values
--   3. Add 'Light Duty' and 'Out' to time_off_type enum
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rename jobs.customer_number -> fc_number
-- ------------------------------------------------------------
ALTER TABLE public.jobs RENAME COLUMN customer_number TO fc_number;


-- ------------------------------------------------------------
-- 2. Replace job_status enum
--    Postgres cannot drop enum values, so we:
--      a. Stash current value as text
--      b. Cast column to text
--      c. Drop old type
--      d. Create new type with correct values
--      e. Map old -> new, cast back
-- ------------------------------------------------------------

-- 2a. Stash
ALTER TABLE public.jobs ADD COLUMN _status_tmp TEXT;
UPDATE public.jobs SET _status_tmp = status::TEXT;

-- 2b. Remove default + cast to text
ALTER TABLE public.jobs ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.jobs ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- 2c. Drop old type
DROP TYPE public.job_status;

-- 2d. Create correct type
CREATE TYPE public.job_status AS ENUM (
  'Upcoming',
  'Ongoing',
  'Bidding',
  'Lost',
  'Cross Utilization',
  'Projects Returned-Invoicing',
  'Other',
  'Cancelled'
);

-- 2e. Map old values to new values, cast back, restore default
UPDATE public.jobs
SET status = CASE _status_tmp
  WHEN 'Tentative'   THEN 'Upcoming'
  WHEN 'Confirmed'   THEN 'Upcoming'
  WHEN 'In Progress' THEN 'Ongoing'
  WHEN 'Completed'   THEN 'Projects Returned-Invoicing'
  WHEN 'Cancelled'   THEN 'Cancelled'
  ELSE 'Other'
END;

ALTER TABLE public.jobs
  ALTER COLUMN status TYPE public.job_status
  USING status::public.job_status;

ALTER TABLE public.jobs
  ALTER COLUMN status SET DEFAULT 'Upcoming';

ALTER TABLE public.jobs
  ALTER COLUMN status SET NOT NULL;

-- 2f. Drop temp column
ALTER TABLE public.jobs DROP COLUMN _status_tmp;


-- ------------------------------------------------------------
-- 3. Add 'Light Duty' and 'Out' to time_off_type enum
--    ALTER TYPE ... ADD VALUE is safe in Postgres 9.1+
-- ------------------------------------------------------------
ALTER TYPE public.time_off_type ADD VALUE IF NOT EXISTS 'Light Duty';
ALTER TYPE public.time_off_type ADD VALUE IF NOT EXISTS 'Out';
