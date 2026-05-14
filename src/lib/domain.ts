import type { Database } from "@/integrations/supabase/types";

export type Position = Database["public"]["Enums"]["position_type"];
export type ServiceType = Database["public"]["Enums"]["service_type"];
export type POStatus = Database["public"]["Enums"]["po_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type TimeOffType = Database["public"]["Enums"]["time_off_type"];

export const POSITIONS: Position[] = ["Tech", "Supervisor", "Project Manager", "Engineer", "Safety"];
export const SERVICE_TYPES: ServiceType[] = ["HVOF", "HVOFS", "OSPM", "CFS", "C-Out", "Other"];
export const PO_STATUSES: POStatus[] = ["Approved", "Received-Awaiting Approval", "Verbal", "Open", "Emergency", "Tentative"];
export const JOB_STATUSES: JobStatus[] = ["Tentative", "Confirmed", "In Progress", "Completed", "Cancelled"];
export const TIME_OFF_TYPES: TimeOffType[] = ["PTO", "Sick", "Medical", "Vacation", "Bereavement", "Other"];

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
  Tentative: "bg-muted text-muted-foreground border-border",
  Confirmed: "bg-primary/15 text-primary border-primary/30",
  "In Progress": "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
  Completed: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export const PO_STATUS_TONE: Record<POStatus, string> = {
  Approved: "bg-success/15 text-success border-success/30",
  "Received-Awaiting Approval": "bg-warning/20 text-warning-foreground dark:text-warning border-warning/40",
  Verbal: "bg-accent text-accent-foreground border-border",
  Open: "bg-muted text-muted-foreground border-border",
  Emergency: "bg-destructive/15 text-destructive border-destructive/30",
  Tentative: "bg-muted text-muted-foreground border-border",
};
