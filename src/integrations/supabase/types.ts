export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          body_type: string | null
          budget_range: string | null
          color_preferences: string[] | null
          created_at: string
          favorite_brands: string[] | null
          gender: string | null
          id: string
          last_subscription_event: string | null
          last_subscription_update: string | null
          main_goal: string | null
          onboarding_completed: boolean | null
          referral_source: string | null
          size_info: Json | null
          style_preference: string | null
          style_preferences: string[] | null
          subscription_entitlement_id: string | null
          subscription_expiry: string | null
          subscription_platform: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          body_type?: string | null
          budget_range?: string | null
          color_preferences?: string[] | null
          created_at?: string
          favorite_brands?: string[] | null
          gender?: string | null
          id: string
          last_subscription_event?: string | null
          last_subscription_update?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          size_info?: Json | null
          style_preference?: string | null
          style_preferences?: string[] | null
          subscription_entitlement_id?: string | null
          subscription_expiry?: string | null
          subscription_platform?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          body_type?: string | null
          budget_range?: string | null
          color_preferences?: string[] | null
          created_at?: string
          favorite_brands?: string[] | null
          gender?: string | null
          id?: string
          last_subscription_event?: string | null
          last_subscription_update?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          size_info?: Json | null
          style_preference?: string | null
          style_preferences?: string[] | null
          subscription_entitlement_id?: string | null
          subscription_expiry?: string | null
          subscription_platform?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      profiles_backup: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          body_type: string | null
          budget_range: string | null
          color_preferences: string[] | null
          created_at: string | null
          favorite_brands: string[] | null
          gender: string | null
          id: string | null
          main_goal: string | null
          onboarding_completed: boolean | null
          referral_source: string | null
          size_info: Json | null
          style_preference: string | null
          style_preferences: string[] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          body_type?: string | null
          budget_range?: string | null
          color_preferences?: string[] | null
          created_at?: string | null
          favorite_brands?: string[] | null
          gender?: string | null
          id?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          size_info?: Json | null
          style_preference?: string | null
          style_preferences?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          body_type?: string | null
          budget_range?: string | null
          color_preferences?: string[] | null
          created_at?: string | null
          favorite_brands?: string[] | null
          gender?: string | null
          id?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          size_info?: Json | null
          style_preference?: string | null
          style_preferences?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      saved_outfits: {
        Row: {
          created_at: string
          id: string
          image_url: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_outfits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      style_analyses: {
        Row: {
          breakdown: Json
          created_at: string
          feedback: string
          id: string
          image_url: string
          last_scan_date: string | null
          raw_analysis: string | null
          scan_date: string | null
          streak_count: number | null
          thumbnail_url: string | null
          tips: Json | null
          total_score: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          breakdown: Json
          created_at?: string
          feedback: string
          id?: string
          image_url: string
          last_scan_date?: string | null
          raw_analysis?: string | null
          scan_date?: string | null
          streak_count?: number | null
          thumbnail_url?: string | null
          tips?: Json | null
          total_score: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          breakdown?: Json
          created_at?: string
          feedback?: string
          id?: string
          image_url?: string
          last_scan_date?: string | null
          raw_analysis?: string | null
          scan_date?: string | null
          streak_count?: number | null
          thumbnail_url?: string | null
          tips?: Json | null
          total_score?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      temp_onboard_users: {
        Row: {
          account_choice: string | null
          age_range: string | null
          budget: string | null
          clothing_category: string | null
          color_palette: string | null
          color_preference: string | null
          completed: boolean | null
          created_at: string | null
          device_id: string
          favorite_brands: string[] | null
          gender: string | null
          heard_about: string | null
          id: string
          instant_suggestions: boolean | null
          occasions: string[] | null
          onboarding_step: number | null
          selfie_url: string | null
          shop_frequency: string | null
          style_goal: string | null
          weekly_reports: boolean | null
        }
        Insert: {
          account_choice?: string | null
          age_range?: string | null
          budget?: string | null
          clothing_category?: string | null
          color_palette?: string | null
          color_preference?: string | null
          completed?: boolean | null
          created_at?: string | null
          device_id: string
          favorite_brands?: string[] | null
          gender?: string | null
          heard_about?: string | null
          id?: string
          instant_suggestions?: boolean | null
          occasions?: string[] | null
          onboarding_step?: number | null
          selfie_url?: string | null
          shop_frequency?: string | null
          style_goal?: string | null
          weekly_reports?: boolean | null
        }
        Update: {
          account_choice?: string | null
          age_range?: string | null
          budget?: string | null
          clothing_category?: string | null
          color_palette?: string | null
          color_preference?: string | null
          completed?: boolean | null
          created_at?: string | null
          device_id?: string
          favorite_brands?: string[] | null
          gender?: string | null
          heard_about?: string | null
          id?: string
          instant_suggestions?: boolean | null
          occasions?: string[] | null
          onboarding_step?: number | null
          selfie_url?: string | null
          shop_frequency?: string | null
          style_goal?: string | null
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achieved_at: string
          achievement_type: string
          id: string
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_and_data: {
        Args: Record<PropertyKey, never> | { uid: string }
        Returns: undefined
      }
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
