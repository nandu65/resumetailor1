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
      application_events: {
        Row: {
          application_id: string
          created_at: string
          event_date: string
          event_title: string
          event_type: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          event_date?: string
          event_title: string
          event_type: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          event_date?: string
          event_title?: string
          event_type?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          dismissed_at: string | null
          email: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          dismissed_at?: string | null
          email?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          dismissed_at?: string | null
          email?: string | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience_count: number
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          segment: Json
          severity: string
          starts_at: string
          status: string
          subject: string
        }
        Insert: {
          audience_count?: number
          body: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          segment?: Json
          severity?: string
          starts_at?: string
          status?: string
          subject: string
        }
        Update: {
          audience_count?: number
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          segment?: Json
          severity?: string
          starts_at?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          code: string
          coupon_id: string
          created_at: string
          discount_paise: number
          id: string
          order_id: string | null
          payment_id: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          coupon_id: string
          created_at?: string
          discount_paise?: number
          id?: string
          order_id?: string | null
          payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          coupon_id?: string
          created_at?: string
          discount_paise?: number
          id?: string
          order_id?: string | null
          payment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          notes: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          plans: string[]
          rollout_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          plans?: string[]
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          plans?: string[]
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_date: string | null
          assessment_date: string | null
          ats_score: number | null
          company_name: string
          created_at: string
          follow_up_date: string | null
          id: string
          interview_date: string | null
          job_description: string | null
          job_title: string
          job_url: string | null
          location: string | null
          notes: string | null
          optimization_id: string | null
          recruiter_email: string | null
          recruiter_name: string | null
          recruiter_score: number | null
          salary_range: string | null
          status: string
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          application_date?: string | null
          assessment_date?: string | null
          ats_score?: number | null
          company_name: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          job_description?: string | null
          job_title: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          optimization_id?: string | null
          recruiter_email?: string | null
          recruiter_name?: string | null
          recruiter_score?: number | null
          salary_range?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          application_date?: string | null
          assessment_date?: string | null
          ats_score?: number | null
          company_name?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          job_description?: string | null
          job_title?: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          optimization_id?: string | null
          recruiter_email?: string | null
          recruiter_name?: string | null
          recruiter_score?: number | null
          salary_range?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_optimization_id_fkey"
            columns: ["optimization_id"]
            isOneToOne: false
            referencedRelation: "optimizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          granted: boolean
          id: string
          notes: string | null
          source: string
          status: string
          tags: string[]
        }
        Insert: {
          created_at?: string
          email: string
          granted?: boolean
          id?: string
          notes?: string | null
          source?: string
          status?: string
          tags?: string[]
        }
        Update: {
          created_at?: string
          email?: string
          granted?: boolean
          id?: string
          notes?: string | null
          source?: string
          status?: string
          tags?: string[]
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
      payments: {
        Row: {
          amount_paise: number
          contact: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          discount_paise: number
          email: string | null
          error_code: string | null
          error_desc: string | null
          id: string
          invoice_id: string | null
          method: string | null
          notes: Json | null
          order_id: string | null
          payment_id: string | null
          refund_id: string | null
          refunded_paise: number
          retried_at: string | null
          status: string
          subscription_id: string | null
          tier: string | null
          updated_at: string
          user_id: string | null
          variant: string | null
        }
        Insert: {
          amount_paise?: number
          contact?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_paise?: number
          email?: string | null
          error_code?: string | null
          error_desc?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: Json | null
          order_id?: string | null
          payment_id?: string | null
          refund_id?: string | null
          refunded_paise?: number
          retried_at?: string | null
          status?: string
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          amount_paise?: number
          contact?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_paise?: number
          email?: string | null
          error_code?: string | null
          error_desc?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: Json | null
          order_id?: string | null
          payment_id?: string | null
          refund_id?: string | null
          refunded_paise?: number
          retried_at?: string | null
          status?: string
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string | null
          variant?: string | null
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
          acquisition_source: string | null
          banned_at: string | null
          banned_reason: string | null
          bonus_scans: number
          country: string | null
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
          referral_code: string | null
          referred_by: string | null
          scan_period_start: string
          scans_used_month: number
          status: string
          subscription_status: string
          tags: string[]
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          acquisition_source?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bonus_scans?: number
          country?: string | null
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
          referral_code?: string | null
          referred_by?: string | null
          scan_period_start?: string
          scans_used_month?: number
          status?: string
          subscription_status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          acquisition_source?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bonus_scans?: number
          country?: string | null
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
          referral_code?: string | null
          referred_by?: string | null
          scan_period_start?: string
          scans_used_month?: number
          status?: string
          subscription_status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
          reward_granted: boolean
          reward_scans: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
          reward_granted?: boolean
          reward_scans?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_granted?: boolean
          reward_scans?: number
        }
        Relationships: []
      }
      resume_score_shares: {
        Row: {
          ats_score: number | null
          company: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          job_match_score: number | null
          optimization_id: string | null
          recruiter_score: number | null
          role: string | null
          score_breakdown: Json | null
          score_label: string | null
          share_token: string
          title: string | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          ats_score?: number | null
          company?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_match_score?: number | null
          optimization_id?: string | null
          recruiter_score?: number | null
          role?: string | null
          score_breakdown?: Json | null
          score_label?: string | null
          share_token: string
          title?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          ats_score?: number | null
          company?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_match_score?: number | null
          optimization_id?: string | null
          recruiter_score?: number | null
          role?: string | null
          score_breakdown?: Json | null
          score_label?: string | null
          share_token?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "resume_score_shares_optimization_id_fkey"
            columns: ["optimization_id"]
            isOneToOne: false
            referencedRelation: "optimizations"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_referral: {
        Args: { _code: string; _new_user: string }
        Returns: Json
      }
      consume_scan: { Args: { _user_id: string }; Returns: Json }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      get_shared_score: {
        Args: { _token: string }
        Returns: {
          ats_score: number
          company: string
          created_at: string
          job_match_score: number
          recruiter_score: number
          role: string
          score_label: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_share_view: { Args: { _token: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
