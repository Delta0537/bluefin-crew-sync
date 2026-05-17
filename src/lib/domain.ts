import type { Database } from "@/integrations/supabase/types";

export type Position = Database["public"]["Enums"]["position_type"];
export type ServiceType = Database["public"]["Enums"]["service_type"];
export type POStatus = Database["public"]["Enums"]["po_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type TimeOffType = Database["public"]["Enums"]["time_off_type"];

export const POSITIONS: Position[] = ["Tech", "Supervisor", "Project Manager", "Engineer", "Safety"];
/** Stored on jobs / DB using short codes; use SERVICE_TYPE_LABEL in selects. */
export const SERVICE_TYPES: ServiceType[] = ["CC", "HVOF", "PMO", "Mult"];
export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CC: "Chemical Clean",
  HVOF: "High Velocity Oil Flush",
  PMO: "Preventative Maintenance",
  Mult: "Multiple Services",
};
/** Pipeline PO: projecting (None), verbal go-ahead, or awarded contract. */
export const PO_STATUSES: POStatus[] = ["None", "Verbal", "Awarded"];
export const JOB_STATUSES: JobStatus[] = [
  "Upcoming",
  "Ongoing",
  "Bidding",
  "Lost",
  "Cross Utilization",
  "Projects Returned-Invoicing",
  "Other",
  "Cancelled",
];
export const TIME_OFF_TYPES: TimeOffType[] = ["PTO", "Sick", "Medical", "Vacation", "Bereavement", "Light Duty", "Out", "Other"];

export const POSITION_TOKEN: Record<Position, string> = {
  Tech: "pos-tech",
  Supervisor: "pos-supervisor",
  "Project Manager": "pos-pm",
  Engineer: "pos-engineer",
  Safety: "pos-safety",
};

export const POSITION_SHORT: Record<Position, string> = {
  Tech: "TECH",
  Supervisor: "SPV",
  "Project Manager": "PM",
  Engineer: "ENG",
  Safety: "SFTY",
};

export const JOB_STATUS_TONE: Record<JobStatus, string> = {
  Upcoming: "bg-muted text-muted-foreground border-border",
  Ongoing: "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
  Bidding: "bg-primary/15 text-primary border-primary/30",
  Lost: "bg-destructive/15 text-destructive border-destructive/30",
  "Cross Utilization": "bg-accent text-accent-foreground border-border",
  "Projects Returned-Invoicing": "bg-success/15 text-success border-success/30",
  Other: "bg-muted text-muted-foreground border-border",
  Cancelled: "bg-destructive/15 text-destructive/70 border-destructive/20",
};

export const PO_STATUS_TONE: Record<POStatus, string> = {
  None: "bg-muted text-muted-foreground border-border",
  Verbal: "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning",
  Awarded: "bg-success/15 text-success border-success/30",
};
