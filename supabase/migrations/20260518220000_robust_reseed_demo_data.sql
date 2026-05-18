-- Robust demo reseed
--
-- Why this exists:
--   The Gantt + Schedule pages query `jobs`, `job_assignments`, and
--   `schedule_calendar_items`. The earlier seed migration
--   (20260517194500_eob_ppc_personnel_jobs_seed.sql) inserts these rows, but a
--   schema-drift step (po_status / job_status enum reshape) can leave the prod
--   database with employees but no jobs, or no rows at all. The Refresh
--   migration (20260518200000_refresh_ppc_demo_dates.sql) only UPDATEs existing
--   jobs, so if rows are missing it silently does nothing and the demo
--   "May 2026" view stays empty.
--
-- What this does (idempotent — safe to re-run by hand in the SQL editor):
--   1. Detects `fc_number` vs legacy `customer_number` column on jobs.
--   2. Detects new (`Ongoing` / `Upcoming` …) vs legacy (`In Progress` …) job_status enum.
--   3. Wipes prior demo rows by known FC numbers and removes job_assignments
--      that reference them, so re-running doesn't duplicate.
--   4. Inserts the 50 PPC employees only if missing (matched on first/last name).
--   5. Inserts 11 PPC jobs with hardcoded May–Jun 2026 dates (current month is
--      May 2026 per system clock — three jobs straddle today, May 18).
--   6. Inserts 24 job_assignments tying employees to jobs.
--   7. Inserts 6 walk-down / meeting rows on `schedule_calendar_items` so the
--      Gantt's "FC / event" column has non-job entries to render too.

DO $$
DECLARE
  job_no text;
  job_status_kind text;
  js_active text;
  js_pipeline text;
  js_closed text;
BEGIN
  -- ---------------- 1. detect job_no column
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'jobs'
        AND c.column_name = 'fc_number'
    ) THEN 'fc_number'
    ELSE 'customer_number'
  END INTO job_no;

  -- ---------------- 2. detect job_status enum shape
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'job_status'
      AND e.enumlabel = 'Ongoing'
  ) THEN 'new' ELSE 'legacy' END
  INTO job_status_kind;

  IF job_status_kind = 'new' THEN
    js_active   := 'Ongoing';
    js_pipeline := 'Upcoming';
    js_closed   := 'Projects Returned-Invoicing';
  ELSE
    js_active   := 'In Progress';
    js_pipeline := 'Tentative';
    js_closed   := 'Completed';
  END IF;

  -- ---------------- 3. wipe known seed rows so this can re-run
  EXECUTE format($wipe$
    DELETE FROM public.job_assignments ja
    USING public.jobs j
    WHERE ja.job_id = j.id
      AND j.%I IN (
        '24-0000845','24-0000912','24-0000888','24-0000901','24-0000934',
        '204861','204814','204394','204708','203154','204856',
        '204601','204833','203876','204554','204890'
      )
  $wipe$, job_no);

  EXECUTE format($wipe$
    DELETE FROM public.jobs
    WHERE %I IN (
      '24-0000845','24-0000912','24-0000888','24-0000901','24-0000934',
      '204861','204814','204394','204708','203154','204856',
      '204601','204833','203876','204554','204890'
    )
  $wipe$, job_no);

  -- Wipe any prior demo employees so the (first_name,last_name) NOT EXISTS
  -- inserts below stay clean for the PPC roster.
  DELETE FROM public.job_assignments ja
  USING public.employees e
  WHERE ja.employee_id = e.id
    AND e.email LIKE '%bluefin.example';

  DELETE FROM public.time_off t
  USING public.employees e
  WHERE t.employee_id = e.id
    AND e.email LIKE '%bluefin.example';

  DELETE FROM public.employees WHERE email LIKE '%bluefin.example';

  -- Wipe prior calendar items by title so re-running this migration doesn't
  -- pile duplicates into the schedule.
  DELETE FROM public.schedule_calendar_items
  WHERE title IN (
    'Shintech walk-down',
    'JSM pipe flush walk-down',
    'New Fortress LNG walk-down',
    'Weekly ops sync',
    'Shell URSA pre-mob meeting',
    'Safety standdown — May'
  );

  -- ---------------- 4. PPC roster — insert only if missing (idempotent)
  INSERT INTO public.employees (first_name, last_name, position, email, phone, hire_date, notes, active)
  SELECT v.first_name, v.last_name, v.position::public.position_type, NULL, v.phone, NULL, v.notes, true
  FROM (VALUES
    ('Jason','Broussard','Project Manager',NULL,'PPC PM roster'),
    ('Crystal','Yoes','Project Manager',NULL,'PPC PM roster'),
    ('Greg','Leger','Project Manager',NULL,'HQ Projects master board'),
    ('Pat','Brennan','Project Manager',NULL,'HQ Projects master board'),
    ('Michael','Deegan','Project Manager',NULL,'PPC / Mike D. workstream'),
    ('Jarrod','Roy','Supervisor',NULL,'RP lead'),
    ('Bo','Waggoner','Supervisor','918-413-9151','Field crew lead'),
    ('Bruce','Hamilton','Supervisor','337-258-2769','Field crew lead'),
    ('Malik','Broussard','Supervisor','337-412-3424','Field crew lead'),
    ('Teddy','Owens','Supervisor','337-371-5078','Field crew lead (CDL)'),
    ('Brant','Jones','Engineer','337-853-2765','Engineers – PMs'),
    ('John','Olivier','Engineer','337-412-8043','Engineers – PMs'),
    ('Luke','Osborn','Engineer','337-354-5544','Engineers – PMs'),
    ('Chad','Venable','Engineer',NULL,'Shop / estimating'),
    ('Andy','Antley','Engineer',NULL,'Shop / estimating'),
    ('Josh','Spell','Engineer','337-581-9717','Shop / estimating'),
    ('Ben','Carter','Safety','337-308-9138','Field safety support'),
    ('Brett','Falgout','Safety','337-315-7142','Field safety support'),
    ('Jim','Goodyear','Safety',NULL,'Safety coordinator'),
    ('Adam','Jones','Safety',NULL,'Safety coordinator'),
    ('Albert','Cormier','Safety',NULL,'Safety coordinator'),
    ('Armando','Garza','Tech',NULL,'Field personnel'),
    ('Bailey','Buteau','Tech','337-255-5173','Field personnel'),
    ('Bailey','Garner','Tech','281-881-2545','Field personnel'),
    ('Bill','Rouse','Tech','936-900-4992','Field personnel'),
    ('Braindel','Edmond','Tech','580-579-0290','Field personnel'),
    ('Charles','Portier','Tech','337-330-6188','Field personnel'),
    ('Daniel','Dillard','Tech','337-277-1351','Field personnel'),
    ('Francisco','Torres','Tech','713-208-3450','Field personnel (Pipeline)'),
    ('Israel','Garza','Tech','713-818-2054','Field personnel'),
    ('Jake','Roy','Tech','337-356-3457','Field personnel'),
    ('John','Boss','Tech','337-351-6151','Field personnel'),
    ('Keith','Faust','Tech','337-654-1380','Field personnel'),
    ('Louis','Buteau','Tech','337-321-1859','Field personnel'),
    ('Max','Menendex','Tech','346-263-5010','Field personnel'),
    ('Sam','Champagne','Tech','337-501-2260','Field personnel'),
    ('Saul','Garza','Tech','832-412-5106','Field personnel'),
    ('Steve','Duhon','Tech','337-579-8199','Field personnel'),
    ('Stuart','Ambrose','Tech','337-380-2448','Field personnel'),
    ('Wes','Weirich','Tech','360-516-7778','Field personnel'),
    ('Willie','Jones','Tech','337-257-8014','Field personnel'),
    ('Zachary','Olivier','Tech','337-577-2717','Field personnel'),
    ('Tommy','Cooper','Tech',NULL,'Borrowed help'),
    ('Kevin','King','Tech',NULL,'Borrowed help'),
    ('James','Schulz','Tech',NULL,'Borrowed help'),
    ('Cameron','Contractor','Tech',NULL,'RP contractor'),
    ('Chad','Garner','Tech',NULL,'RP contractor'),
    ('Trevor','George','Tech',NULL,'RP contractor'),
    ('Mike','Mogerman','Tech',NULL,'RP contractor'),
    ('Lane','Broussard','Tech',NULL,'Roster pad')
  ) AS v(first_name, last_name, position, phone, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.first_name = v.first_name AND e.last_name = v.last_name
  );

  -- ---------------- 5. PPC jobs — insert with explicit May–Jun 2026 dates
  EXECUTE format($ins$
INSERT INTO public.jobs (
  %I, customer_name, site_name, site_city, site_state, tsm_psm, service_type,
  equipment_asset, mfu_type, mfu_qty, mhu_qty, pc_qty,
  mobe_date, delivery_date, est_completion_date, booking_date, service_order,
  po_status, safety_required, status, notes,
  sr_technicians, technicians
) VALUES
('204861','Shintech','Client site — chemical flushing','Houston','TX',NULL,'CC'::public.service_type,
 'September grid pick — chemical cleaning scope',NULL,2,1,0,
 DATE '2026-05-13', DATE '2026-05-12', DATE '2026-06-06', DATE '2026-05-01', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Sep 2023 PPC jobs column — FC 204861',1,3),
('204814','JSM Pipe flush','Pipe flush package','Lake Charles','LA',NULL,'CC'::public.service_type,
 'Pipe flush — imported FC board',NULL,2,0,0,
 DATE '2026-05-16', DATE '2026-05-15', DATE '2026-06-10', NULL, NULL,
 'Awarded'::public.po_status, false, %s::public.job_status,
 'Sep 2023 FC list — Num personnel 4',1,3),
('204394','New Fortress LNG','Commissioning support','Hackberry','LA',NULL,'PMO'::public.service_type,
 'LNG commissioning — umbrella schedule row',NULL,3,1,0,
 DATE '2026-05-20', DATE '2026-05-19', DATE '2026-06-14', DATE '2026-05-08', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Aug/Sep snapshots — peaks at 11 heads',2,9),
('204708','XTO Cowboy','Upstream flushing','Midland','TX',NULL,'Mult'::public.service_type,
 'Compression / flush scope per HQ board',NULL,2,0,0,
 DATE '2026-06-08', DATE '2026-06-07', DATE '2026-06-28', NULL, NULL,
 'Verbal'::public.po_status, false, %s::public.job_status,
 'Rolling FC board carry-over',1,3),
('203154','BlueWater Pennsylvania','Marcellus corridor work','Montrose','PA',NULL,'Mult'::public.service_type,
 'Remote northeast ops placeholder',NULL,2,0,0,
 DATE '2026-05-08', DATE '2026-05-07', DATE '2026-06-02', NULL, NULL,
 'None'::public.po_status, false, %s::public.job_status,
 'Imported FC board row',1,3),
('204856','Hose Source','Shop hose flush loop','New Iberia','LA',NULL,'CC'::public.service_type,
 'Hose circulation — August snapshot',NULL,1,0,0,
 DATE '2026-05-03', DATE '2026-05-02', DATE '2026-05-05', NULL, NULL,
 'Awarded'::public.po_status, false, %s::public.job_status,
 'Short turnaround',0,1),
('204601','Omega Tech Services','Omega Tech Services package','Port Arthur','TX',NULL,'CC'::public.service_type,
 'Omega Tech scope',NULL,2,1,0,
 DATE '2026-05-22', DATE '2026-05-21', DATE '2026-06-09', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'August FC snapshot — crew size 4',1,3),
('204833','Oxy Marco Polo','Marco Polo offshore logistics','Galveston','TX',NULL,'Mult'::public.service_type,
 'Deepwater flushing bundle',NULL,3,1,1,
 DATE '2026-06-02', DATE '2026-06-01', DATE '2026-06-27', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Imported FC row — offshore staffing spike',2,3),
('203876','RCS Fantasy Island','Tank farm flushing','Fourchon','LA',NULL,'CC'::public.service_type,
 'Tank flushing scope',NULL,3,2,0,
 DATE '2026-06-10', DATE '2026-06-09', DATE '2026-07-06', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'HQ historical twin row — FC 203876',2,4),
('204554','Shell URSA','Shell URSA glycol flush','Galveston','TX',NULL,'CC'::public.service_type,
 'Glycol flush — Shell Mars/Ursa storyline',NULL,3,1,1,
 DATE '2026-05-26', DATE '2026-05-25', DATE '2026-06-18', DATE '2026-05-15', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'May mobe prep',2,2),
('204890','LLOG WhoDat','Subsea commissioning assistance','Port Fourchon','LA',NULL,'PMO'::public.service_type,
 'WhoDat umbilical / flushing',NULL,2,1,0,
 DATE '2026-06-15', DATE '2026-06-14', DATE '2026-07-08', NULL, NULL,
 'None'::public.po_status, true, %s::public.job_status,
 'August FC snapshot row',1,2)
  $ins$,
    job_no,
    quote_literal(js_active),    quote_literal(js_active),    quote_literal(js_pipeline),
    quote_literal(js_pipeline),  quote_literal(js_pipeline),  quote_literal(js_closed),
    quote_literal(js_pipeline),  quote_literal(js_pipeline),  quote_literal(js_pipeline),
    quote_literal(js_pipeline),  quote_literal(js_pipeline));

  -- ---------------- 6. assignments tying employees to jobs
  EXECUTE format($a$
    INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
    SELECT j.id, e.id, v.role::public.position_type, v.start_d, v.end_d
    FROM (VALUES
      ('204861','Jason','Broussard','Project Manager', DATE '2026-05-13', DATE '2026-06-06'),
      ('204861','Bruce','Hamilton','Supervisor',       DATE '2026-05-13', DATE '2026-06-06'),
      ('204861','Bill','Rouse','Tech',                 DATE '2026-05-13', DATE '2026-06-06'),
      ('204861','Bailey','Garner','Tech',              DATE '2026-05-13', DATE '2026-06-06'),
      ('204861','Ben','Carter','Safety',               DATE '2026-05-13', DATE '2026-06-06'),
      ('204814','Pat','Brennan','Project Manager',     DATE '2026-05-16', DATE '2026-06-10'),
      ('204814','Charles','Portier','Tech',            DATE '2026-05-16', DATE '2026-06-10'),
      ('204394','Michael','Deegan','Project Manager',  DATE '2026-05-20', DATE '2026-06-14'),
      ('204394','Malik','Broussard','Supervisor',      DATE '2026-05-20', DATE '2026-06-14'),
      ('204394','Luke','Osborn','Engineer',            DATE '2026-05-20', DATE '2026-06-14'),
      ('204394','Francisco','Torres','Tech',           DATE '2026-05-20', DATE '2026-06-14'),
      ('204394','Israel','Garza','Tech',               DATE '2026-05-20', DATE '2026-06-14'),
      ('203154','Crystal','Yoes','Project Manager',    DATE '2026-05-11', DATE '2026-06-02'),
      ('203154','Bo','Waggoner','Supervisor',          DATE '2026-05-11', DATE '2026-06-02'),
      ('203154','Keith','Faust','Tech',                DATE '2026-05-11', DATE '2026-06-02'),
      ('204833','Wes','Weirich','Tech',                DATE '2026-06-03', DATE '2026-06-27'),
      ('204833','Teddy','Owens','Supervisor',          DATE '2026-06-03', DATE '2026-06-27'),
      ('204833','Brett','Falgout','Safety',            DATE '2026-06-03', DATE '2026-06-27'),
      ('204554','Greg','Leger','Project Manager',      DATE '2026-05-26', DATE '2026-06-18'),
      ('204554','Jarrod','Roy','Supervisor',           DATE '2026-05-26', DATE '2026-06-18'),
      ('204554','Brant','Jones','Engineer',            DATE '2026-05-26', DATE '2026-06-18'),
      ('204554','Zachary','Olivier','Tech',            DATE '2026-05-26', DATE '2026-06-18'),
      ('204554','Sam','Champagne','Tech',              DATE '2026-05-26', DATE '2026-06-18'),
      ('204601','Crystal','Yoes','Project Manager',    DATE '2026-05-22', DATE '2026-06-09')
    ) AS v(fc, first_name, last_name, role, start_d, end_d)
    JOIN public.jobs j      ON j.%I = v.fc
    JOIN public.employees e ON e.first_name = v.first_name AND e.last_name = v.last_name
  $a$, job_no);
END $$;

-- ---------------- 7. walk-down / meeting calendar items
INSERT INTO public.schedule_calendar_items
  (kind, title, site_or_customer, start_date, end_date, sr_technicians, technicians, notes)
VALUES
  ('walk_down', 'Shintech walk-down',         'Shintech — Houston, TX',     DATE '2026-05-06', DATE '2026-05-06', 1, 1, 'Pre-mob site walk for FC 204861'),
  ('walk_down', 'JSM pipe flush walk-down',   'JSM — Lake Charles, LA',     DATE '2026-05-11', DATE '2026-05-11', 1, 0, 'Scope review with client TSM'),
  ('walk_down', 'New Fortress LNG walk-down', 'New Fortress — Hackberry',   DATE '2026-05-14', DATE '2026-05-15', 1, 2, 'Two-day commissioning walk + safety brief'),
  ('meeting',   'Weekly ops sync',            'Lafayette HQ',               DATE '2026-05-19', DATE '2026-05-19', 0, 0, 'Recurring Tuesday standup'),
  ('meeting',   'Shell URSA pre-mob meeting', 'Shell — Galveston, TX',      DATE '2026-05-21', DATE '2026-05-21', 1, 0, 'Glycol flush kickoff for FC 204554'),
  ('meeting',   'Safety standdown — May',     'All sites',                  DATE '2026-05-28', DATE '2026-05-28', 0, 0, 'Quarterly safety standdown');
