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
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string
          created_at: string
          details: Json | null
          id: string
          ip: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string
          details?: Json | null
          id?: string
          ip?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          cost_inr: number
          created_at: string
          duration_ms: number | null
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          plan: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          cost_inr?: number
          created_at?: string
          duration_ms?: number | null
          feature: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          plan?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          cost_inr?: number
          created_at?: string
          duration_ms?: number | null
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          plan?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          granted: boolean
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          granted?: boolean
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          granted?: boolean
          id?: string
          source?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string | null
          error: string | null
          id: string
          ip: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      optimizations: {
        Row: {
          ats_score: number | null
          company: string | null
          company_brief: Json | null
          cover_letter: string | null
          created_at: string
          flag_reason: string | null
          flagged: boolean
          id: string
          improved_bullets: Json | null
          job_description: string
          keyword_density: Json | null
          missing_keywords: Json | null
          moderated_at: string | null
          moderated_by: string | null
          previous_ats_score: number | null
          professional_summary: string | null
          recommendations: Json | null
          recruiter_score: number | null
          resume_text: string
          rewrite_level: string
          role: string | null
          score_breakdown: Json | null
          skill_gaps: Json | null
          skills_to_add: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          company?: string | null
          company_brief?: Json | null
          cover_letter?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          improved_bullets?: Json | null
          job_description: string
          keyword_density?: Json | null
          missing_keywords?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          previous_ats_score?: number | null
          professional_summary?: string | null
          recommendations?: Json | null
          recruiter_score?: number | null
          resume_text: string
          rewrite_level?: string
          role?: string | null
          score_breakdown?: Json | null
          skill_gaps?: Json | null
          skills_to_add?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          company?: string | null
          company_brief?: Json | null
          cover_letter?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          improved_bullets?: Json | null
          job_description?: string
          keyword_density?: Json | null
          missing_keywords?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          previous_ats_score?: number | null
          professional_summary?: string | null
          recommendations?: Json | null
          recruiter_score?: number | null
          resume_text?: string
          rewrite_level?: string
          role?: string | null
          score_breakdown?: Json | null
          skill_gaps?: Json | null
          skills_to_add?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_experiments: {
        Row: {
          created_at: string
          event: string
          id: string
          session_id: string | null
          tier: string | null
          user_id: string | null
          variant: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          session_id?: string | null
          tier?: string | null
          user_id?: string | null
          variant: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          session_id?: string | null
          tier?: string | null
          user_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned_at: string | null
          banned_reason: string | null
          bonus_scans: number
          created_at: string
          current_period_end: string | null
          display_name: string | null
          email: string | null
          id: string
          notes: string | null
          optimizations_used: number
          payment_failed: boolean
          pending_plan: string | null
          plan: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          scan_period_start: string
          scans_used_month: number
          status: string
          subscription_status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_reason?: string | null
          bonus_scans?: number
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          optimizations_used?: number
          payment_failed?: boolean
          pending_plan?: string | null
          plan?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          scan_period_start?: string
          scans_used_month?: number
          status?: string
          subscription_status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_reason?: string | null
          bonus_scans?: number
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          optimizations_used?: number
          payment_failed?: boolean
          pending_plan?: string | null
          plan?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          scan_period_start?: string
          scans_used_month?: number
          status?: string
          subscription_status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      razorpay_plans: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          id: string
          interval: string
          razorpay_plan_id: string
          tier: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          razorpay_plan_id: string
          tier: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          razorpay_plan_id?: string
          tier?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen: string
          path: string | null
          user_id: string
        }
        Insert: {
          last_seen?: string
          path?: string | null
          user_id: string
        }
        Update: {
          last_seen?: string
          path?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_scan: { Args: { _user_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
