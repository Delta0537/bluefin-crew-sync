-- Headcount fields on jobs (legacy project form parity) + walk-down / meeting rows for schedules

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS sr_technicians integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS technicians integer NOT NULL DEFAULT 0;

CREATE TYPE public.calendar_item_kind AS ENUM ('walk_down', 'meeting');

CREATE TABLE public.schedule_calendar_items (
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

CREATE INDEX idx_schedule_calendar_items_dates
  ON public.schedule_calendar_items (start_date, end_date);

CREATE TRIGGER update_schedule_calendar_items_updated_at
  BEFORE UPDATE ON public.schedule_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Signed-in can view calendar items"
  ON public.schedule_calendar_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers insert calendar items"
  ON public.schedule_calendar_items FOR INSERT TO authenticated
  WITH CHECK (public.can_modify(auth.uid()));

CREATE POLICY "Managers update calendar items"
  ON public.schedule_calendar_items FOR UPDATE TO authenticated
  USING (public.can_modify(auth.uid()));

CREATE POLICY "Managers delete calendar items"
  ON public.schedule_calendar_items FOR DELETE TO authenticated
  USING (public.can_modify(auth.uid()));
