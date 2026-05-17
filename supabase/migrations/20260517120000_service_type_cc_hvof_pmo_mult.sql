
-- ============================================================
-- Replace service_type enum: CC, HVOF, PMO, Mult (+ data map)
-- ============================================================

ALTER TABLE public.jobs ADD COLUMN _service_type_tmp TEXT;
UPDATE public.jobs SET _service_type_tmp = service_type::TEXT;

ALTER TABLE public.jobs ALTER COLUMN service_type TYPE TEXT USING service_type::TEXT;

DROP TYPE public.service_type;

CREATE TYPE public.service_type AS ENUM ('CC', 'HVOF', 'PMO', 'Mult');

UPDATE public.jobs
SET service_type = CASE _service_type_tmp
  WHEN 'HVOF' THEN 'HVOF'
  WHEN 'HVOFS' THEN 'HVOF'
  WHEN 'OSPM' THEN 'PMO'
  WHEN 'CFS' THEN 'CC'
  WHEN 'C-Out' THEN 'CC'
  WHEN 'Other' THEN 'Mult'
  ELSE 'Mult'
END;

ALTER TABLE public.jobs
  ALTER COLUMN service_type TYPE public.service_type
  USING service_type::public.service_type;

ALTER TABLE public.jobs
  ALTER COLUMN service_type SET NOT NULL;

ALTER TABLE public.jobs DROP COLUMN _service_type_tmp;
