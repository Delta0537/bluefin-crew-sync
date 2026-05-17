export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: Database["public"]["Enums"]["position_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position: Database["public"]["Enums"]["position_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: Database["public"]["Enums"]["position_type"]
          updated_at?: string
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          job_id: string
          role_on_job: Database["public"]["Enums"]["position_type"]
          start_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          job_id: string
          role_on_job: Database["public"]["Enums"]["position_type"]
          start_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          job_id?: string
          role_on_job?: Database["public"]["Enums"]["position_type"]
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          booking_date: string | null
          created_at: string
          customer_name: string
          fc_number: string
          delivery_date: string
          equipment_asset: string
          est_completion_date: string
          id: string
          mfu_qty: number
          mfu_type: string | null
          mhu_qty: number
          mobe_date: string
          notes: string | null
          pc_qty: number
          po_status: Database["public"]["Enums"]["po_status"]
          safety_required: boolean
          service_order: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          site_city: string
          site_name: string | null
          site_state: string
          status: Database["public"]["Enums"]["job_status"]
          tsm_psm: string | null
          updated_at: string
        }
        Insert: {
          booking_date?: string | null
          created_at?: string
          customer_name: string
          fc_number: string
          delivery_date: string
          equipment_asset: string
          est_completion_date: string
          id?: string
          mfu_qty?: number
          mfu_type?: string | null
          mhu_qty?: number
          mobe_date: string
          notes?: string | null
          pc_qty?: number
          po_status?: Database["public"]["Enums"]["po_status"]
          safety_required?: boolean
          service_order?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          site_city: string
          site_name?: string | null
          site_state: string
          status?: Database["public"]["Enums"]["job_status"]
          tsm_psm?: string | null
          updated_at?: string
        }
        Update: {
          booking_date?: string | null
          created_at?: string
          customer_name?: string
          fc_number?: string
          delivery_date?: string
          equipment_asset?: string
          est_completion_date?: string
          id?: string
          mfu_qty?: number
          mfu_type?: string | null
          mhu_qty?: number
          mobe_date?: string
          notes?: string | null
          pc_qty?: number
          po_status?: Database["public"]["Enums"]["po_status"]
          safety_required?: boolean
          service_order?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          site_city?: string
          site_name?: string | null
          site_state?: string
          status?: Database["public"]["Enums"]["job_status"]
          tsm_psm?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_off: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          type: Database["public"]["Enums"]["time_off_type"]
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          type: Database["public"]["Enums"]["time_off_type"]
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["time_off_type"]
        }
        Relationships: [
          {
            foreignKeyName: "time_off_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utilization_snapshots: {
        Row: {
          assigned: number
          created_at: string
          id: string
          position: string
          snapshot_date: string
          total_active: number
          utilization_pct: number
        }
        Insert: {
          assigned: number
          created_at?: string
          id?: string
          position: string
          snapshot_date: string
          total_active: number
          utilization_pct: number
        }
        Update: {
          assigned?: number
          created_at?: string
          id?: string
          position?: string
          snapshot_date?: string
          total_active?: number
          utilization_pct?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_modify: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer"
      job_status:
        | "Upcoming"
        | "Ongoing"
        | "Bidding"
        | "Lost"
        | "Cross Utilization"
        | "Projects Returned-Invoicing"
        | "Other"
        | "Cancelled"
      po_status: "None" | "Verbal" | "Awarded"
      position_type:
        | "Tech"
        | "Supervisor"
        | "Project Manager"
        | "Engineer"
        | "Safety"
      service_type: "CC" | "HVOF" | "PMO" | "Mult"
      time_off_type:
        | "PTO"
        | "Sick"
        | "Medical"
        | "Vacation"
        | "Bereavement"
        | "Light Duty"
        | "Out"
        | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "viewer"],
      job_status: [
        "Upcoming",
        "Ongoing",
        "Bidding",
        "Lost",
        "Cross Utilization",
        "Projects Returned-Invoicing",
        "Other",
        "Cancelled",
      ],
      po_status: ["None", "Verbal", "Awarded"],
      position_type: [
        "Tech",
        "Supervisor",
        "Project Manager",
        "Engineer",
        "Safety",
      ],
      service_type: ["CC", "HVOF", "PMO", "Mult"],
      time_off_type: [
        "PTO",
        "Sick",
        "Medical",
        "Vacation",
        "Bereavement",
        "Light Duty",
        "Out",
        "Other",
      ],
    },
  },
} as const
