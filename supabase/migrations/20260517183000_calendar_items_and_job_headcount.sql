-- Headcount fields on jobs (legacy project form parity) + walk-down / meeting rows for schedules
-- Idempotent: safe to re-run in SQL editor / local reset scenarios.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS sr_technicians integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS technicians integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'calendar_item_kind'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.calendar_item_kind AS ENUM ('walk_down', 'meeting');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.schedule_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.calendar_item_kind NOT NULL,
  title text NOT NULL,
  site_or_customer text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  po_reference text,
  sr_technicians integer NOT NULL DEFAULT 0,
  technicians integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_calendar_items_dates_chk CHECK (end_date >= start_date)
);

ALTER TABLE public.schedule_calendar_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_schedule_calendar_items_dates
  ON public.schedule_calendar_items (start_date, end_date);

DROP TRIGGER IF EXISTS update_schedule_calendar_items_updated_at ON public.schedule_calendar_items;
CREATE TRIGGER update_schedule_calendar_items_updated_at
  BEFORE UPDATE ON public.schedule_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Signed-in can view calendar items" ON public.schedule_calendar_items;
CREATE POLICY "Signed-in can view calendar items"
  ON public.schedule_calendar_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers insert calendar items" ON public.schedule_calendar_items;
CREATE POLICY "Managers insert calendar items"
  ON public.schedule_calendar_items FOR INSERT TO authenticated
  WITH CHECK (public.can_modify(auth.uid()));

DROP POLICY IF EXISTS "Managers update calendar items" ON public.schedule_calendar_items;
CREATE POLICY "Managers update calendar items"
  ON public.schedule_calendar_items FOR UPDATE TO authenticated
  USING (public.can_modify(auth.uid()));

DROP POLICY IF EXISTS "Managers delete calendar items" ON public.schedule_calendar_items;
CREATE POLICY "Managers delete calendar items"
  ON public.schedule_calendar_items FOR DELETE TO authenticated
  USING (public.can_modify(auth.uid()));
