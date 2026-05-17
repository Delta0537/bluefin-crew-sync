-- PO status for pipeline vs awarded work: None (projecting), Verbal, Awarded.
-- Replaces legacy procurement-focused enum.

CREATE TYPE public.job_po_sale AS ENUM ('None', 'Verbal', 'Awarded');

ALTER TABLE public.jobs
  ADD COLUMN _po_new public.job_po_sale NOT NULL DEFAULT 'None';

UPDATE public.jobs
SET _po_new = CASE po_status::text
  WHEN 'Verbal' THEN 'Verbal'::public.job_po_sale
  WHEN 'Approved' THEN 'Awarded'::public.job_po_sale
  WHEN 'Received-Awaiting Approval' THEN 'Awarded'::public.job_po_sale
  WHEN 'Emergency' THEN 'Awarded'::public.job_po_sale
  ELSE 'None'::public.job_po_sale
END;

ALTER TABLE public.jobs DROP COLUMN po_status;

DROP TYPE public.po_status;

ALTER TYPE public.job_po_sale RENAME TO po_status;

ALTER TABLE public.jobs RENAME COLUMN _po_new TO po_status;

ALTER TABLE public.jobs
  ALTER COLUMN po_status SET DEFAULT 'None'::public.po_status;
