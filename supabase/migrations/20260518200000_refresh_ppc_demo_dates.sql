-- Re-anchor PPC demo jobs + assignments to May–Jun 2026 so Schedule/Gantt overlap default calendar windows.
-- Safe when jobs row uses fc_number OR customer_number (only one exists).

DO $$
DECLARE
  job_col text;
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'jobs' AND c.column_name = 'fc_number'
    ) THEN 'fc_number'
    ELSE 'customer_number'
  END INTO job_col;

  EXECUTE format($jobs$
    UPDATE public.jobs AS j SET
      mobe_date = v.mobe,
      delivery_date = v.delivery,
      est_completion_date = v.est,
      booking_date = COALESCE(v.booking, j.booking_date)
    FROM (VALUES
      ('204861', DATE '2026-05-13', DATE '2026-05-12', DATE '2026-06-06', DATE '2026-05-01'),
      ('204814', DATE '2026-05-16', DATE '2026-05-15', DATE '2026-06-10', NULL::date),
      ('204394', DATE '2026-05-20', DATE '2026-05-19', DATE '2026-06-14', DATE '2026-05-08'),
      ('204708', DATE '2026-06-08', DATE '2026-06-07', DATE '2026-06-28', NULL::date),
      ('203154', DATE '2026-05-08', DATE '2026-05-07', DATE '2026-06-02', NULL::date),
      ('204856', DATE '2026-05-03', DATE '2026-05-02', DATE '2026-05-05', NULL::date),
      ('204601', DATE '2026-05-22', DATE '2026-05-21', DATE '2026-06-09', NULL::date),
      ('204833', DATE '2026-06-02', DATE '2026-06-01', DATE '2026-06-27', NULL::date),
      ('203876', DATE '2026-06-10', DATE '2026-06-09', DATE '2026-07-06', NULL::date),
      ('204554', DATE '2026-05-26', DATE '2026-05-25', DATE '2026-06-18', DATE '2026-05-15'),
      ('204890', DATE '2026-06-15', DATE '2026-06-14', DATE '2026-07-08', NULL::date)
    ) AS v(fc, mobe, delivery, est, booking)
    WHERE j.%I = v.fc
  $jobs$, job_col);

  EXECUTE format($assign$
    UPDATE public.job_assignments AS a SET
      start_date = v.start_d,
      end_date = v.end_d
    FROM public.jobs j,
    (VALUES
      ('204861', DATE '2026-05-13', DATE '2026-06-06'),
      ('204814', DATE '2026-05-16', DATE '2026-06-10'),
      ('204394', DATE '2026-05-20', DATE '2026-06-14'),
      ('203154', DATE '2026-05-11', DATE '2026-06-02'),
      ('204833', DATE '2026-06-03', DATE '2026-06-27'),
      ('204554', DATE '2026-05-26', DATE '2026-06-18')
    ) AS v(fc, start_d, end_d)
    WHERE a.job_id = j.id AND j.%I = v.fc
  $assign$, job_col);
END $$;
