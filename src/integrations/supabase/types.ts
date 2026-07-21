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
      accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          institution: string | null
          is_archived: boolean
          name: string
          sort_order: number
          starting_balance: number
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_archived?: boolean
          name: string
          sort_order?: number
          starting_balance?: number
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_archived?: boolean
          name?: string
          sort_order?: number
          starting_balance?: number
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          amount: number | null
          created_at: string
          detail: string | null
          id: string
          is_private: boolean
          kind: Database["public"]["Enums"]["activity_kind"]
          occurred_at: string
          ref_id: string | null
          ref_table: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: string
          is_private?: boolean
          kind: Database["public"]["Enums"]["activity_kind"]
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: string
          is_private?: boolean
          kind?: Database["public"]["Enums"]["activity_kind"]
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      balance_snapshots: {
        Row: {
          account_id: string | null
          balance: number
          category_id: string | null
          created_at: string
          id: string
          label: string | null
          on_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          balance: number
          category_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          on_date?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          balance?: number
          category_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          on_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_snapshots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string
          goal_amount: number | null
          id: string
          is_archived: boolean
          kind: string
          monthly_limit: number
          name: string
          rollover: boolean
          rollover_balance: number
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          goal_amount?: number | null
          id?: string
          is_archived?: boolean
          kind?: string
          monthly_limit?: number
          name: string
          rollover?: boolean
          rollover_balance?: number
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          goal_amount?: number | null
          id?: string
          is_archived?: boolean
          kind?: string
          monthly_limit?: number
          name?: string
          rollover?: boolean
          rollover_balance?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          created_at: string
          fun_to_fun_pct: number
          fun_to_sts_pct: number
          fun_to_vacation_pct: number
          last_month_closed: string | null
          rules: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fun_to_fun_pct?: number
          fun_to_sts_pct?: number
          fun_to_vacation_pct?: number
          last_month_closed?: string | null
          rules?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fun_to_fun_pct?: number
          fun_to_sts_pct?: number
          fun_to_vacation_pct?: number
          last_month_closed?: string | null
          rules?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs_g: number | null
          created_at: string
          density_g_per_ml: number | null
          external_id: string | null
          fat_g: number | null
          fiber_g: number | null
          grams_per_serving: number | null
          household_measures: Json
          id: string
          is_archived: boolean
          n_calories: number | null
          n_carbs_g: number | null
          n_fat_g: number | null
          n_fiber_g: number | null
          n_protein_g: number | null
          n_sodium_mg: number | null
          n_sugar_g: number | null
          name: string
          notes: string | null
          nutrient_basis: string
          protein_g: number | null
          serving_size: number | null
          serving_unit: string | null
          sodium_mg: number | null
          source: Database["public"]["Enums"]["nutrition_source"]
          sugar_g: number | null
          updated_at: string
          usda_data_type: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          density_g_per_ml?: number | null
          external_id?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          grams_per_serving?: number | null
          household_measures?: Json
          id?: string
          is_archived?: boolean
          n_calories?: number | null
          n_carbs_g?: number | null
          n_fat_g?: number | null
          n_fiber_g?: number | null
          n_protein_g?: number | null
          n_sodium_mg?: number | null
          n_sugar_g?: number | null
          name: string
          notes?: string | null
          nutrient_basis?: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["nutrition_source"]
          sugar_g?: number | null
          updated_at?: string
          usda_data_type?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          density_g_per_ml?: number | null
          external_id?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          grams_per_serving?: number | null
          household_measures?: Json
          id?: string
          is_archived?: boolean
          n_calories?: number | null
          n_carbs_g?: number | null
          n_fat_g?: number | null
          n_fiber_g?: number | null
          n_protein_g?: number | null
          n_sodium_mg?: number | null
          n_sugar_g?: number | null
          name?: string
          notes?: string | null
          nutrient_basis?: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: Database["public"]["Enums"]["nutrition_source"]
          sugar_g?: number | null
          updated_at?: string
          usda_data_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          budget: number
          created_at: string
          ess_allocated: number
          ess_spent: number
          fed_balance: number
          fed_earnings: number
          fun_allocated: number
          fun_spent: number
          housing: number
          id: string
          income: number
          lts_balance: number
          lts_contribution: number
          month: string
          notes: string | null
          regions_balance: number
          source: string
          sts_allocated: number
          sts_balance: number
          sts_spent: number
          updated_at: string
          user_id: string
          vac_balance: number
        }
        Insert: {
          budget?: number
          created_at?: string
          ess_allocated?: number
          ess_spent?: number
          fed_balance?: number
          fed_earnings?: number
          fun_allocated?: number
          fun_spent?: number
          housing?: number
          id?: string
          income?: number
          lts_balance?: number
          lts_contribution?: number
          month: string
          notes?: string | null
          regions_balance?: number
          source?: string
          sts_allocated?: number
          sts_balance?: number
          sts_spent?: number
          updated_at?: string
          user_id: string
          vac_balance?: number
        }
        Update: {
          budget?: number
          created_at?: string
          ess_allocated?: number
          ess_spent?: number
          fed_balance?: number
          fed_earnings?: number
          fun_allocated?: number
          fun_spent?: number
          housing?: number
          id?: string
          income?: number
          lts_balance?: number
          lts_contribution?: number
          month?: string
          notes?: string | null
          regions_balance?: number
          source?: string
          sts_allocated?: number
          sts_balance?: number
          sts_spent?: number
          updated_at?: string
          user_id?: string
          vac_balance?: number
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          created_at: string
          expires_on: string | null
          food_id: string | null
          id: string
          is_consumed: boolean
          location: Database["public"]["Enums"]["storage_location"]
          name: string
          notes: string | null
          opened_on: string | null
          purchased_on: string | null
          quantity: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          food_id?: string | null
          id?: string
          is_consumed?: boolean
          location?: Database["public"]["Enums"]["storage_location"]
          name: string
          notes?: string | null
          opened_on?: string | null
          purchased_on?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          food_id?: string | null
          id?: string
          is_consumed?: boolean
          location?: Database["public"]["Enums"]["storage_location"]
          name?: string
          notes?: string | null
          opened_on?: string | null
          purchased_on?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_imports: {
        Row: {
          content_type: string | null
          created_at: string
          filename: string
          id: string
          imported_rows: number
          kind: string
          size_bytes: number | null
          storage_path: string | null
          summary: Json
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          filename: string
          id?: string
          imported_rows?: number
          kind?: string
          size_bytes?: number | null
          storage_path?: string | null
          summary?: Json
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          imported_rows?: number
          kind?: string
          size_bytes?: number | null
          storage_path?: string | null
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          food_id: string | null
          id: string
          name_override: string | null
          note: string | null
          quantity: number
          recipe_id: string
          sort_order: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          id?: string
          name_override?: string | null
          note?: string | null
          quantity?: number
          recipe_id: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          id?: string
          name_override?: string | null
          note?: string | null
          quantity?: number
          recipe_id?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_minutes: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_archived: boolean
          prep_minutes: number | null
          servings: number
          source_url: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_archived?: boolean
          prep_minutes?: number | null
          servings?: number
          source_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_archived?: boolean
          prep_minutes?: number | null
          servings?: number
          source_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_on: string | null
          food_id: string | null
          id: string
          is_done: boolean
          kind: Database["public"]["Enums"]["task_kind"]
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project: string | null
          quantity: number | null
          recurrence: string | null
          sort_order: number
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          food_id?: string | null
          id?: string
          is_done?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          quantity?: number | null
          recurrence?: string | null
          sort_order?: number
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          food_id?: string | null
          id?: string
          is_done?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          quantity?: number | null
          recurrence?: string | null
          sort_order?: number
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          id: string
          merchant: string
          note: string | null
          occurred_on: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          merchant: string
          note?: string | null
          occurred_on?: string
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          merchant?: string
          note?: string | null
          occurred_on?: string
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
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
      user_settings: {
        Row: {
          created_at: string
          location_city: string | null
          location_lat: number | null
          location_lon: number | null
          owner_pin_hash: string | null
          privacy_mode: Database["public"]["Enums"]["privacy_mode"]
          updated_at: string
          user_id: string
          wall_display_device_id: string | null
        }
        Insert: {
          created_at?: string
          location_city?: string | null
          location_lat?: number | null
          location_lon?: number | null
          owner_pin_hash?: string | null
          privacy_mode?: Database["public"]["Enums"]["privacy_mode"]
          updated_at?: string
          user_id: string
          wall_display_device_id?: string | null
        }
        Update: {
          created_at?: string
          location_city?: string | null
          location_lat?: number | null
          location_lon?: number | null
          owner_pin_hash?: string | null
          privacy_mode?: Database["public"]["Enums"]["privacy_mode"]
          updated_at?: string
          user_id?: string
          wall_display_device_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit"
        | "investment"
        | "retirement"
        | "cash"
        | "other"
      activity_kind: "transaction" | "task" | "pantry" | "grocery" | "system"
      app_role: "owner" | "member" | "guest"
      nutrition_source: "usda" | "manual" | "barcode" | "imported"
      privacy_mode: "private" | "guest" | "wall"
      storage_location: "pantry" | "fridge" | "freezer" | "other"
      task_kind: "general" | "shopping"
      task_priority: "low" | "normal" | "high"
      txn_type:
        | "expense"
        | "income"
        | "transfer"
        | "savings_contribution"
        | "investment_contribution"
        | "adjustment"
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
      account_type: [
        "checking",
        "savings",
        "credit",
        "investment",
        "retirement",
        "cash",
        "other",
      ],
      activity_kind: ["transaction", "task", "pantry", "grocery", "system"],
      app_role: ["owner", "member", "guest"],
      nutrition_source: ["usda", "manual", "barcode", "imported"],
      privacy_mode: ["private", "guest", "wall"],
      storage_location: ["pantry", "fridge", "freezer", "other"],
      task_kind: ["general", "shopping"],
      task_priority: ["low", "normal", "high"],
      txn_type: [
        "expense",
        "income",
        "transfer",
        "savings_contribution",
        "investment_contribution",
        "adjustment",
      ],
    },
  },
} as const
