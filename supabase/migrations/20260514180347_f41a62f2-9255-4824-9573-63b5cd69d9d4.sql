
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE public.position_type AS ENUM ('Tech', 'Supervisor', 'Project Manager', 'Engineer', 'Safety');
CREATE TYPE public.service_type AS ENUM ('HVOF', 'HVOFS', 'OSPM', 'CFS', 'C-Out', 'Other');
CREATE TYPE public.po_status AS ENUM ('Approved', 'Received-Awaiting Approval', 'Verbal', 'Open', 'Emergency', 'Tentative');
CREATE TYPE public.job_status AS ENUM ('Tentative', 'Confirmed', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE public.time_off_type AS ENUM ('PTO', 'Sick', 'Medical', 'Vacation', 'Bereavement', 'Other');

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_modify(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'manager'))
$$;

-- Auto-create profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EMPLOYEES
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position public.position_type NOT NULL,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_employees_position ON public.employees(position);
CREATE INDEX idx_employees_active ON public.employees(active);
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- JOBS
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  site_name TEXT,
  site_city TEXT NOT NULL,
  site_state TEXT NOT NULL,
  tsm_psm TEXT,
  service_type public.service_type NOT NULL,
  equipment_asset TEXT NOT NULL,
  mfu_type TEXT,
  mfu_qty INT NOT NULL DEFAULT 1,
  mhu_qty INT NOT NULL DEFAULT 0,
  pc_qty INT NOT NULL DEFAULT 0,
  mobe_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  est_completion_date DATE NOT NULL,
  booking_date DATE,
  service_order TEXT,
  po_status public.po_status NOT NULL DEFAULT 'Open',
  safety_required BOOLEAN NOT NULL DEFAULT false,
  status public.job_status NOT NULL DEFAULT 'Tentative',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_dates ON public.jobs(mobe_date, est_completion_date);
CREATE INDEX idx_jobs_service_type ON public.jobs(service_type);
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- JOB ASSIGNMENTS
CREATE TABLE public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role_on_job public.position_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_assignments_employee_dates ON public.job_assignments(employee_id, start_date, end_date);
CREATE INDEX idx_assignments_job ON public.job_assignments(job_id);

-- TIME OFF
CREATE TABLE public.time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type public.time_off_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_time_off_employee_dates ON public.time_off(employee_id, start_date, end_date);

-- UTILIZATION SNAPSHOTS
CREATE TABLE public.utilization_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  position TEXT NOT NULL,
  total_active INT NOT NULL,
  assigned INT NOT NULL,
  utilization_pct NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.utilization_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_util_date ON public.utilization_snapshots(snapshot_date);

-- RLS POLICIES
CREATE POLICY "Anyone signed in can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Signed-in users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Signed-in can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.can_modify(auth.uid()));
CREATE POLICY "Managers can update employees" ON public.employees FOR UPDATE TO authenticated USING (public.can_modify(auth.uid()));
CREATE POLICY "Managers can delete employees" ON public.employees FOR DELETE TO authenticated USING (public.can_modify(auth.uid()));

CREATE POLICY "Signed-in can view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.can_modify(auth.uid()));
CREATE POLICY "Managers can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.can_modify(auth.uid()));
CREATE POLICY "Managers can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (public.can_modify(auth.uid()));

CREATE POLICY "Signed-in can view assignments" ON public.job_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert assignments" ON public.job_assignments FOR INSERT TO authenticated WITH CHECK (public.can_modify(auth.uid()));
CREATE POLICY "Managers can update assignments" ON public.job_assignments FOR UPDATE TO authenticated USING (public.can_modify(auth.uid()));
CREATE POLICY "Managers can delete assignments" ON public.job_assignments FOR DELETE TO authenticated USING (public.can_modify(auth.uid()));

CREATE POLICY "Signed-in can view time off" ON public.time_off FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert time off" ON public.time_off FOR INSERT TO authenticated WITH CHECK (public.can_modify(auth.uid()));
CREATE POLICY "Managers can update time off" ON public.time_off FOR UPDATE TO authenticated USING (public.can_modify(auth.uid()));
CREATE POLICY "Managers can delete time off" ON public.time_off FOR DELETE TO authenticated USING (public.can_modify(auth.uid()));

CREATE POLICY "Signed-in can view snapshots" ON public.utilization_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert snapshots" ON public.utilization_snapshots FOR INSERT TO authenticated WITH CHECK (public.can_modify(auth.uid()));

-- SEED DATA
INSERT INTO public.employees (first_name, last_name, position, email, phone, hire_date, notes) VALUES
  ('Marcus', 'Reyes', 'Project Manager'::public.position_type, 'mreyes@bluefin.example', '555-0101', '2019-03-15', 'Senior PM, refinery specialist'),
  ('Dana', 'Whitfield', 'Project Manager'::public.position_type, 'dwhitfield@bluefin.example', '555-0102', '2021-07-01', NULL),
  ('Tyrell', 'Brooks', 'Supervisor'::public.position_type, 'tbrooks@bluefin.example', '555-0103', '2018-09-20', 'HVOF lead'),
  ('Priya', 'Shah', 'Supervisor'::public.position_type, 'pshah@bluefin.example', '555-0104', '2020-01-10', NULL),
  ('Jordan', 'Mills', 'Tech'::public.position_type, 'jmills@bluefin.example', '555-0105', '2022-04-04', NULL),
  ('Casey', 'Nguyen', 'Tech'::public.position_type, 'cnguyen@bluefin.example', '555-0106', '2022-11-12', NULL),
  ('Sam', 'Okafor', 'Tech'::public.position_type, 'sokafor@bluefin.example', '555-0107', '2023-02-18', NULL),
  ('Riley', 'Park', 'Tech'::public.position_type, 'rpark@bluefin.example', '555-0108', '2023-06-01', NULL),
  ('Ava', 'Lindstrom', 'Engineer'::public.position_type, 'alindstrom@bluefin.example', '555-0109', '2020-08-22', 'Mechanical engineer'),
  ('Owen', 'Calloway', 'Safety'::public.position_type, 'ocalloway@bluefin.example', '555-0110', '2021-05-05', 'Certified safety officer');

INSERT INTO public.jobs (customer_number, customer_name, site_name, site_city, site_state, tsm_psm, service_type, equipment_asset, mfu_type, mfu_qty, mhu_qty, pc_qty, mobe_date, delivery_date, est_completion_date, booking_date, service_order, po_status, safety_required, status, notes) VALUES
  ('24-0000845', 'Total Refinery', 'Port Arthur Complex', 'Port Arthur', 'TX', 'J. Martinez', 'HVOF'::public.service_type, '55C-301 Wet Gas Compressor', '790', 2, 1, 1, CURRENT_DATE + 3, CURRENT_DATE + 2, CURRENT_DATE + 14, CURRENT_DATE - 30, 'SO-44821', 'Approved'::public.po_status, true, 'Confirmed'::public.job_status, 'Critical path turnaround'),
  ('24-0000912', 'Chevron Phillips', 'Cedar Bayou Plant', 'Baytown', 'TX', 'K. Lopez', 'CFS'::public.service_type, 'Steam Turbine T-201', '1000', 1, 0, 0, CURRENT_DATE + 7, CURRENT_DATE + 6, CURRENT_DATE + 21, CURRENT_DATE - 14, 'SO-44890', 'Received-Awaiting Approval'::public.po_status, false, 'Tentative'::public.job_status, NULL),
  ('24-0000888', 'Marathon Petroleum', 'Garyville Refinery', 'Garyville', 'LA', 'B. Singh', 'HVOFS'::public.service_type, 'Lube Oil System LOS-12', '2000', 1, 1, 2, CURRENT_DATE - 2, CURRENT_DATE - 3, CURRENT_DATE + 10, CURRENT_DATE - 21, 'SO-44765', 'Approved'::public.po_status, true, 'In Progress'::public.job_status, 'Crew already onsite'),
  ('24-0000901', 'Valero Energy', 'Corpus Christi East', 'Corpus Christi', 'TX', 'J. Martinez', 'OSPM'::public.service_type, 'Recip Compressor C-405', '700', 1, 0, 0, CURRENT_DATE + 14, CURRENT_DATE + 13, CURRENT_DATE + 28, NULL, NULL, 'Verbal'::public.po_status, false, 'Tentative'::public.job_status, 'Awaiting PO'),
  ('24-0000934', 'Shell Deer Park', 'Deer Park Chemical', 'Deer Park', 'TX', 'A. Reilly', 'C-Out'::public.service_type, 'Hydrogen Compressor H-101', '5000', 1, 1, 1, CURRENT_DATE + 21, CURRENT_DATE + 20, CURRENT_DATE + 35, CURRENT_DATE - 7, 'SO-44950', 'Emergency'::public.po_status, true, 'Confirmed'::public.job_status, 'Emergency mobilization');

INSERT INTO public.job_assignments (job_id, employee_id, role_on_job, start_date, end_date)
SELECT j.id, e.id, 'Project Manager'::public.position_type, CURRENT_DATE + 3, CURRENT_DATE + 14
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000845' AND e.first_name = 'Marcus' AND e.last_name = 'Reyes'
UNION ALL
SELECT j.id, e.id, 'Supervisor'::public.position_type, CURRENT_DATE + 3, CURRENT_DATE + 14
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000845' AND e.first_name = 'Tyrell' AND e.last_name = 'Brooks'
UNION ALL
SELECT j.id, e.id, 'Tech'::public.position_type, CURRENT_DATE + 3, CURRENT_DATE + 14
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000845' AND e.first_name = 'Jordan' AND e.last_name = 'Mills'
UNION ALL
SELECT j.id, e.id, 'Tech'::public.position_type, CURRENT_DATE + 3, CURRENT_DATE + 14
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000845' AND e.first_name = 'Casey' AND e.last_name = 'Nguyen'
UNION ALL
SELECT j.id, e.id, 'Safety'::public.position_type, CURRENT_DATE + 3, CURRENT_DATE + 14
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000845' AND e.first_name = 'Owen' AND e.last_name = 'Calloway'
UNION ALL
SELECT j.id, e.id, 'Project Manager'::public.position_type, CURRENT_DATE - 2, CURRENT_DATE + 10
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000888' AND e.first_name = 'Dana' AND e.last_name = 'Whitfield'
UNION ALL
SELECT j.id, e.id, 'Supervisor'::public.position_type, CURRENT_DATE - 2, CURRENT_DATE + 10
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000888' AND e.first_name = 'Priya' AND e.last_name = 'Shah'
UNION ALL
SELECT j.id, e.id, 'Tech'::public.position_type, CURRENT_DATE - 2, CURRENT_DATE + 10
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000888' AND e.first_name = 'Sam' AND e.last_name = 'Okafor'
UNION ALL
SELECT j.id, e.id, 'Tech'::public.position_type, CURRENT_DATE - 2, CURRENT_DATE + 10
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000888' AND e.first_name = 'Riley' AND e.last_name = 'Park'
UNION ALL
SELECT j.id, e.id, 'Engineer'::public.position_type, CURRENT_DATE - 2, CURRENT_DATE + 10
FROM public.jobs j, public.employees e WHERE j.customer_number = '24-0000888' AND e.first_name = 'Ava' AND e.last_name = 'Lindstrom';

INSERT INTO public.time_off (employee_id, type, start_date, end_date, notes)
SELECT id, 'PTO'::public.time_off_type, CURRENT_DATE + 30, CURRENT_DATE + 34, 'Family trip' FROM public.employees WHERE first_name = 'Jordan' AND last_name = 'Mills'
UNION ALL
SELECT id, 'Sick'::public.time_off_type, CURRENT_DATE, CURRENT_DATE + 1, NULL FROM public.employees WHERE first_name = 'Priya' AND last_name = 'Shah';
