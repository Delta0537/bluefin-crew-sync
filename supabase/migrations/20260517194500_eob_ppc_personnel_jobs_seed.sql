-- PPC / EOB roster + job seed (CSV export under Naming Information/All relevant Info)
-- Replaces demo @bluefin.example personnel and legacy snapshot jobs with ~50 PPC-aligned rows.
-- Schedule dates from source grids end Sep 2023; jobs here use explicit Mar–Aug 2026 as “recent + upcoming”.
-- Role counts: ≥5 Project Manager, Supervisor, Engineer, Safety; remainder Tech.
--
-- jobs.job-no column: supports BOTH `fc_number` (after migration 20260514182000) and legacy `customer_number`.
-- po_status: uses pipeline enum None | Verbal | Awarded (migration 20260517140000_po_status_pipeline.sql).
-- job_status: supports BOTH operational enum (20260514182000: Ongoing, Upcoming, …) and legacy seed enum
--   (In Progress, Tentative, Completed, …) by detecting pg_enum labels at runtime.

-- ------------------------------------------------------------
-- Remove demo seed rows from initial migration
-- ------------------------------------------------------------

DO $$
DECLARE
  job_no text;
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'jobs' AND c.column_name = 'fc_number'
    ) THEN 'fc_number'
    ELSE 'customer_number'
  END INTO job_no;

  EXECUTE format($sql$
    DELETE FROM public.job_assignments ja
    USING public.jobs j
    WHERE ja.job_id = j.id
      AND j.%I IN ('24-0000845', '24-0000912', '24-0000888', '24-0000901', '24-0000934')
  $sql$, job_no);

  DELETE FROM public.job_assignments ja
  USING public.employees e
  WHERE ja.employee_id = e.id
    AND e.email LIKE '%bluefin.example';

  DELETE FROM public.time_off t
  USING public.employees e
  WHERE t.employee_id = e.id
    AND e.email LIKE '%bluefin.example';

  EXECUTE format($sql$
    DELETE FROM public.jobs
    WHERE %I IN ('24-0000845', '24-0000912', '24-0000888', '24-0000901', '24-0000934')
  $sql$, job_no);

  DELETE FROM public.employees WHERE email LIKE '%bluefin.example';
END $$;

-- ------------------------------------------------------------
-- Personnel (50) — merged Personnel_Master_List + HQ PM names + roster extras + pad row
-- Phones normalized from Personnel_Roster.csv where available.
-- ------------------------------------------------------------

INSERT INTO public.employees (first_name, last_name, position, email, phone, hire_date, notes, active) VALUES
-- Project Managers (5)
('Jason', 'Broussard', 'Project Manager'::public.position_type, NULL, NULL, NULL, 'PPC Personnel-Jobs sheet — PM roster', true),
('Crystal', 'Yoes', 'Project Manager'::public.position_type, NULL, NULL, NULL, 'PPC Personnel-Jobs sheet — PM roster', true),
('Greg', 'Leger', 'Project Manager'::public.position_type, NULL, NULL, NULL, 'HQ Projects master board (PM initials Greg L)', true),
('Pat', 'Brennan', 'Project Manager'::public.position_type, NULL, NULL, NULL, 'HQ Projects master board (PM initials Pat B)', true),
('Michael', 'Deegan', 'Project Manager'::public.position_type, NULL, NULL, NULL, 'HQ Projects master board (PPC / Mike D. workstream)', true),

-- Supervisors (5)
('Jarrod', 'Roy', 'Supervisor'::public.position_type, NULL, NULL, NULL, 'RP lead (import: Jarrod Roy - IC)', true),
('Bo', 'Waggoner', 'Supervisor'::public.position_type, NULL, '918-413-9151', NULL, 'Field personnel → crew lead', true),
('Bruce', 'Hamilton', 'Supervisor'::public.position_type, NULL, '337-258-2769', NULL, 'Field personnel → crew lead', true),
('Malik', 'Broussard', 'Supervisor'::public.position_type, NULL, '337-412-3424', NULL, 'Field personnel → crew lead', true),
('Teddy', 'Owens', 'Supervisor'::public.position_type, NULL, '337-371-5078', NULL, 'Field personnel → crew lead (CDL)', true),

-- Engineers (6) — Engineers/PM category + estimating/shop engineering (min 5)
('Brant', 'Jones', 'Engineer'::public.position_type, NULL, '337-853-2765', NULL, 'Engineers – PMs (import)', true),
('John', 'Olivier', 'Engineer'::public.position_type, NULL, '337-412-8043', NULL, 'Engineers – PMs (import)', true),
('Luke', 'Osborn', 'Engineer'::public.position_type, NULL, '337-354-5544', NULL, 'Engineers – PMs (import)', true),
('Chad', 'Venable', 'Engineer'::public.position_type, NULL, NULL, NULL, 'Shop / estimating — field engineering support', true),
('Andy', 'Antley', 'Engineer'::public.position_type, NULL, NULL, NULL, 'Shop / estimating', true),
('Josh', 'Spell', 'Engineer'::public.position_type, NULL, '337-581-9717', NULL, 'Shop / estimating (roster)', true),

-- Safety (5) — roster + shop staff often covering HS&E on small HQ
('Ben', 'Carter', 'Safety'::public.position_type, NULL, '337-308-9138', NULL, 'Roster-only (not on category master); field safety support', true),
('Brett', 'Falgout', 'Safety'::public.position_type, NULL, '337-315-7142', NULL, 'Roster-only; field safety support', true),
('Jim', 'Goodyear', 'Safety'::public.position_type, NULL, NULL, NULL, 'Shop / estimating → safety coordinator (seed split)', true),
('Adam', 'Jones', 'Safety'::public.position_type, NULL, NULL, NULL, 'Shop / estimating → safety coordinator (seed split)', true),
('Albert', 'Cormier', 'Safety'::public.position_type, NULL, NULL, NULL, 'Shop / estimating → safety coordinator (seed split)', true),

-- Techs (29) — field, borrowed help, RP contractors, pad
('Armando', 'Garza', 'Tech'::public.position_type, NULL, NULL, NULL, 'Field personnel (PPC master list)', true),
('Bailey', 'Buteau', 'Tech'::public.position_type, NULL, '337-255-5173', NULL, 'Field personnel', true),
('Bailey', 'Garner', 'Tech'::public.position_type, NULL, '281-881-2545', NULL, 'Field personnel', true),
('Bill', 'Rouse', 'Tech'::public.position_type, NULL, '936-900-4992', NULL, 'Field personnel', true),
('Braindel', 'Edmond', 'Tech'::public.position_type, NULL, '580-579-0290', NULL, 'Field personnel', true),
('Charles', 'Portier', 'Tech'::public.position_type, NULL, '337-330-6188', NULL, 'Field personnel', true),
('Daniel', 'Dillard', 'Tech'::public.position_type, NULL, '337-277-1351', NULL, 'Field personnel', true),
('Francisco', 'Torres', 'Tech'::public.position_type, NULL, '713-208-3450', NULL, 'Field personnel (Pipeline)', true),
('Israel', 'Garza', 'Tech'::public.position_type, NULL, '713-818-2054', NULL, 'Field personnel', true),
('Jake', 'Roy', 'Tech'::public.position_type, NULL, '337-356-3457', NULL, 'Field personnel', true),
('John', 'Boss', 'Tech'::public.position_type, NULL, '337-351-6151', NULL, 'Field personnel', true),
('Keith', 'Faust', 'Tech'::public.position_type, NULL, '337-654-1380', NULL, 'Field personnel', true),
('Louis', 'Buteau', 'Tech'::public.position_type, NULL, '337-321-1859', NULL, 'Field personnel', true),
('Max', 'Menendex', 'Tech'::public.position_type, NULL, '346-263-5010', NULL, 'Field personnel', true),
('Sam', 'Champagne', 'Tech'::public.position_type, NULL, '337-501-2260', NULL, 'Field personnel', true),
('Saul', 'Garza', 'Tech'::public.position_type, NULL, '832-412-5106', NULL, 'Field personnel', true),
('Steve', 'Duhon', 'Tech'::public.position_type, NULL, '337-579-8199', NULL, 'Field personnel', true),
('Stuart', 'Ambrose', 'Tech'::public.position_type, NULL, '337-380-2448', NULL, 'Field personnel', true),
('Wes', 'Weirich', 'Tech'::public.position_type, NULL, '360-516-7778', NULL, 'Field personnel', true),
('Willie', 'Jones', 'Tech'::public.position_type, NULL, '337-257-8014', NULL, 'Field personnel', true),
('Zachary', 'Olivier', 'Tech'::public.position_type, NULL, '337-577-2717', NULL, 'Field personnel', true),
('Tommy', 'Cooper', 'Tech'::public.position_type, NULL, NULL, NULL, 'Borrowed help (US umbilical)', true),
('Kevin', 'King', 'Tech'::public.position_type, NULL, NULL, NULL, 'Borrowed help (US umbilical)', true),
('James', 'Schulz', 'Tech'::public.position_type, NULL, NULL, NULL, 'Borrowed help (US umbilical)', true),
('Cameron', 'Contractor', 'Tech'::public.position_type, NULL, NULL, NULL, 'River Parish contractor row (import)', true),
('Chad', 'Garner', 'Tech'::public.position_type, NULL, NULL, NULL, 'River Parish contractor (distinct from Chad Venable)', true),
('Trevor', 'George', 'Tech'::public.position_type, NULL, NULL, NULL, 'River Parish contractor', true),
('Mike', 'Mogerman', 'Tech'::public.position_type, NULL, NULL, NULL, 'River Parish contractor (import had ? suffix)', true),
('Lane', 'Broussard', 'Tech'::public.position_type, NULL, NULL, NULL, 'Roster pad to reach 50 imported rows — replace with real hire as needed', true);

-- ------------------------------------------------------------
-- Jobs + assignments (dynamic FC column name)
-- ------------------------------------------------------------

DO $$
DECLARE
  job_no text;
  job_status_kind text;
  js_active text;
  js_pipeline text;
  js_closed text;
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'jobs' AND c.column_name = 'fc_number'
    ) THEN 'fc_number'
    ELSE 'customer_number'
  END INTO job_no;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    INNER JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'job_status'
      AND e.enumlabel = 'Ongoing'
  ) THEN 'new' ELSE 'legacy' END
  INTO job_status_kind;

  IF job_status_kind = 'new' THEN
    js_active := 'Ongoing';
    js_pipeline := 'Upcoming';
    js_closed := 'Projects Returned-Invoicing';
  ELSE
    js_active := 'In Progress';
    js_pipeline := 'Tentative';
    js_closed := 'Completed';
  END IF;

  EXECUTE format($ins$
INSERT INTO public.jobs (
  %I, customer_name, site_name, site_city, site_state, tsm_psm, service_type,
  equipment_asset, mfu_type, mfu_qty, mhu_qty, pc_qty,
  mobe_date, delivery_date, est_completion_date, booking_date, service_order,
  po_status, safety_required, status, notes,
  sr_technicians, technicians
) VALUES
('204861', 'Shintech', 'Client site — chemical flushing', 'Houston', 'TX', NULL, 'CC'::public.service_type,
 'September grid pick — chemical cleaning scope', NULL, 2, 1, 0,
 DATE '2026-03-04', DATE '2026-03-03', DATE '2026-03-19', DATE '2026-02-01', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Imported from Sep 2023 PPC jobs column — FC 204861', 1, 3),

('204814', 'JSM Pipe flush', 'Pipe flush package', 'Lake Charles', 'LA', NULL, 'CC'::public.service_type,
 'Pipe flush — imported FC board', NULL, 2, 0, 0,
 DATE '2026-03-18', DATE '2026-03-17', DATE '2026-04-08', NULL, NULL,
 'Awarded'::public.po_status, false, %s::public.job_status,
 'Sep 2023 FC list — Num personnel 4', 1, 3),

('204394', 'New Fortress LNG', 'Commissioning support', 'Hackberry', 'LA', NULL, 'PMO'::public.service_type,
 'LNG commissioning — umbrella schedule row', NULL, 3, 1, 0,
 DATE '2026-04-02', DATE '2026-04-01', DATE '2026-04-15', DATE '2026-03-10', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Aug/Sep snapshots — peaks at 11 heads on Aug sheet', 2, 9),

('204708', 'XTO Cowboy', 'Upstream flushing', 'Midland', 'TX', NULL, 'Mult'::public.service_type,
 'Compression / flush scope per HQ board', NULL, 2, 0, 0,
 DATE '2026-04-12', DATE '2026-04-11', DATE '2026-05-02', NULL, NULL,
 'Verbal'::public.po_status, false, %s::public.job_status,
 'Rolling FC board carry-over job', 1, 3),

('203154', 'BlueWater Pennsylvania', 'Marcellus corridor work', 'Montrose', 'PA', NULL, 'Mult'::public.service_type,
 'Remote northeast ops placeholder geography', NULL, 2, 0, 0,
 DATE '2026-05-06', DATE '2026-05-05', DATE '2026-05-26', NULL, NULL,
 'None'::public.po_status, false, %s::public.job_status,
 'Imported FC board row — duration blank in CSV', 1, 3),

('204856', 'Hose Source', 'Shop hose flush loop', 'New Iberia', 'LA', NULL, 'CC'::public.service_type,
 'Hose circulation — August snapshot row', NULL, 1, 0, 0,
 DATE '2026-03-22', DATE '2026-03-21', DATE '2026-03-24', NULL, NULL,
 'Awarded'::public.po_status, false, %s::public.job_status,
 'Short turnaround per Aug sheet duration', 0, 1),

('204601', 'Omega Tech Services', 'Omega Tech Services package', 'Port Arthur', 'TX', NULL, 'CC'::public.service_type,
 'Omega Tech scope — imported FC row', NULL, 2, 1, 0,
 DATE '2026-05-20', DATE '2026-05-19', DATE '2026-06-05', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'August FC snapshot — crew size 4', 1, 3),

('204833', 'Oxy Marco Polo', 'Marco Polo offshore logistics', 'Galveston', 'TX', NULL, 'Mult'::public.service_type,
 'Deepwater flushing bundle', NULL, 3, 1, 1,
 DATE '2026-06-03', DATE '2026-06-02', DATE '2026-06-28', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Imported FC row — offshore staffing spike', 2, 3),

('203876', 'RCS Fantasy Island', 'Tank farm flushing package', 'Fourchon', 'LA', NULL, 'CC'::public.service_type,
 'Tank flushing scope — HQ historical twin row', NULL, 3, 2, 0,
 DATE '2026-06-17', DATE '2026-06-16', DATE '2026-07-14', NULL, NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'Mirrors HQ Fantasy Island narrative — FC 203876', 2, 4),

('204554', 'Shell URSA', 'Shell URSA glycol flush', 'Galveston', 'TX', NULL, 'CC'::public.service_type,
 'Glycol flush — PPC Shell Mars/Ursa storyline', NULL, 3, 1, 1,
 DATE '2026-07-08', DATE '2026-07-07', DATE '2026-07-23', DATE '2026-06-01', NULL,
 'Awarded'::public.po_status, true, %s::public.job_status,
 'HQ master notes referenced May mobe prep — staged July here', 2, 2),

('204890', 'LLOG WhoDat', 'Subsea commissioning assistance', 'Port Fourchon', 'LA', NULL, 'PMO'::public.service_type,
 'WhoDat umbilical / flushing placeholder', NULL, 2, 1, 0,
 DATE '2026-07-29', DATE '2026-07-28', DATE '2026-08-20', NULL, NULL,
 'None'::public.po_status, true, %s::public.job_status,
 'August FC snapshot row — durations blank in CSV', 1, 2)
  $ins$,
    job_no,
    quote_literal(js_active),
    quote_literal(js_active),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline),
    quote_literal(js_closed),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline),
    quote_literal(js_pipeline));

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, DATE '2026-03-04', DATE '2026-03-19'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Jason' AND e.last_name = 'Broussard'
WHERE j.%I = '204861'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Supervisor'::public.position_type, DATE '2026-03-04', DATE '2026-03-19'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Bruce' AND e.last_name = 'Hamilton'
WHERE j.%I = '204861'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-03-04', DATE '2026-03-19'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Bill' AND e.last_name = 'Rouse'
WHERE j.%I = '204861'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-03-04', DATE '2026-03-19'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Bailey' AND e.last_name = 'Garner'
WHERE j.%I = '204861'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Safety'::public.position_type, DATE '2026-03-04', DATE '2026-03-19'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Ben' AND e.last_name = 'Carter'
WHERE j.%I = '204861'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, DATE '2026-03-18', DATE '2026-04-08'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Pat' AND e.last_name = 'Brennan'
WHERE j.%I = '204814'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-03-18', DATE '2026-04-08'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Charles' AND e.last_name = 'Portier'
WHERE j.%I = '204814'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, DATE '2026-04-02', DATE '2026-04-15'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Michael' AND e.last_name = 'Deegan'
WHERE j.%I = '204394'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Supervisor'::public.position_type, DATE '2026-04-02', DATE '2026-04-15'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Malik' AND e.last_name = 'Broussard'
WHERE j.%I = '204394'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Engineer'::public.position_type, DATE '2026-04-02', DATE '2026-04-15'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Luke' AND e.last_name = 'Osborn'
WHERE j.%I = '204394'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-04-02', DATE '2026-04-15'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Francisco' AND e.last_name = 'Torres'
WHERE j.%I = '204394'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-04-02', DATE '2026-04-15'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Israel' AND e.last_name = 'Garza'
WHERE j.%I = '204394'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, DATE '2026-05-06', DATE '2026-05-26'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Crystal' AND e.last_name = 'Yoes'
WHERE j.%I = '203154'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Supervisor'::public.position_type, DATE '2026-05-06', DATE '2026-05-26'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Bo' AND e.last_name = 'Waggoner'
WHERE j.%I = '203154'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-05-06', DATE '2026-05-26'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Keith' AND e.last_name = 'Faust'
WHERE j.%I = '203154'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-06-03', DATE '2026-06-28'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Wes' AND e.last_name = 'Weirich'
WHERE j.%I = '204833'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Supervisor'::public.position_type, DATE '2026-06-03', DATE '2026-06-28'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Teddy' AND e.last_name = 'Owens'
WHERE j.%I = '204833'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Safety'::public.position_type, DATE '2026-06-03', DATE '2026-06-28'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Brett' AND e.last_name = 'Falgout'
WHERE j.%I = '204833'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, DATE '2026-07-08', DATE '2026-07-23'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Greg' AND e.last_name = 'Leger'
WHERE j.%I = '204554'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Supervisor'::public.position_type, DATE '2026-07-08', DATE '2026-07-23'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Jarrod' AND e.last_name = 'Roy'
WHERE j.%I = '204554'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Engineer'::public.position_type, DATE '2026-07-08', DATE '2026-07-23'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Brant' AND e.last_name = 'Jones'
WHERE j.%I = '204554'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-07-08', DATE '2026-07-23'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Zachary' AND e.last_name = 'Olivier'
WHERE j.%I = '204554'
  $q$, job_no);

  EXECUTE format($q$
INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Tech'::public.position_type, DATE '2026-07-08', DATE '2026-07-23'
FROM public.jobs j JOIN public.employees e ON e.first_name = 'Sam' AND e.last_name = 'Champagne'
WHERE j.%I = '204554'
  $q$, job_no);
END $$;
