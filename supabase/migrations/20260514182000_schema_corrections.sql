-- Schema corrections to align with EOB workbook + handoff spec.
-- Safe to run on top of 20260514180347_* and 20260514180410_*.

-- 1) Rename jobs.customer_number -> jobs.fc_number (FC = "FC Number" column in EOB).
ALTER TABLE public.jobs RENAME COLUMN customer_number TO fc_number;

-- 2) Replace job_status enum with the 8 EOB values.
ALTER TABLE public.jobs ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.jobs ALTER COLUMN status TYPE TEXT;

UPDATE public.jobs
SET status = CASE status
  WHEN 'Tentative'   THEN 'Bidding'
  WHEN 'Confirmed'   THEN 'Upcoming'
  WHEN 'In Progress' THEN 'Ongoing'
  WHEN 'Completed'   THEN 'Projects Returned-Invoicing'
  WHEN 'Cancelled'   THEN 'Cancelled'
  ELSE 'Other'
END;

DROP TYPE public.job_status;

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

ALTER TABLE public.jobs
  ALTER COLUMN status TYPE public.job_status USING status::public.job_status;
ALTER TABLE public.jobs
  ALTER COLUMN status SET DEFAULT 'Upcoming'::public.job_status;

-- 3) Add Light Duty and Out to time_off_type.
--    These ADD VALUE statements run fine outside the same query that references them.
ALTER TYPE public.time_off_type ADD VALUE IF NOT EXISTS 'Light Duty';
ALTER TYPE public.time_off_type ADD VALUE IF NOT EXISTS 'Out';
