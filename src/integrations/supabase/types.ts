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
      bucket_item_places: {
        Row: {
          bucket_item_id: string
          created_at: string
          id: string
          place_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          bucket_item_id: string
          created_at?: string
          id?: string
          place_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          bucket_item_id?: string
          created_at?: string
          id?: string
          place_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_item_places_bucket_item_id_fkey"
            columns: ["bucket_item_id"]
            isOneToOne: false
            referencedRelation: "bucket_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucket_item_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_list_items: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          ideal_season: string | null
          is_archived: boolean
          notes: string | null
          progress_pct: number
          related_trip_id: string | null
          requirements: string | null
          sort_order: number
          status: Database["public"]["Enums"]["bucket_status"]
          title: string
          updated_at: string
          user_id: string
          vacation_days_needed: number | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          ideal_season?: string | null
          is_archived?: boolean
          notes?: string | null
          progress_pct?: number
          related_trip_id?: string | null
          requirements?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["bucket_status"]
          title: string
          updated_at?: string
          user_id: string
          vacation_days_needed?: number | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          ideal_season?: string | null
          is_archived?: boolean
          notes?: string | null
          progress_pct?: number
          related_trip_id?: string | null
          requirements?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["bucket_status"]
          title?: string
          updated_at?: string
          user_id?: string
          vacation_days_needed?: number | null
        }
        Relationships: []
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
          rsu_balance: number
          rsu_contribution: number
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
          rsu_balance?: number
          rsu_contribution?: number
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
          rsu_balance?: number
          rsu_contribution?: number
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
      personal_dates: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_recurring: boolean
          kind: Database["public"]["Enums"]["personal_date_kind"]
          name: string
          notes: string | null
          on_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_recurring?: boolean
          kind?: Database["public"]["Enums"]["personal_date_kind"]
          name: string
          notes?: string | null
          on_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_recurring?: boolean
          kind?: Database["public"]["Enums"]["personal_date_kind"]
          name?: string
          notes?: string | null
          on_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          category: string
          created_at: string
          estimated_cost: number | null
          google_place_id: string | null
          id: string
          is_archived: boolean
          lat: number | null
          lng: number | null
          maps_url: string | null
          name: string
          notes: string | null
          photos: Json
          rating: number | null
          status: string
          tags: string[]
          travel_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          estimated_cost?: number | null
          google_place_id?: string | null
          id?: string
          is_archived?: boolean
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name: string
          notes?: string | null
          photos?: Json
          rating?: number | null
          status?: string
          tags?: string[]
          travel_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          estimated_cost?: number | null
          google_place_id?: string | null
          id?: string
          is_archived?: boolean
          lat?: number | null
          lng?: number | null
          maps_url?: string | null
          name?: string
          notes?: string | null
          photos?: Json
          rating?: number | null
          status?: string
          tags?: string[]
          travel_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
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
          category: string | null
          completed_at: string | null
          created_at: string
          due_on: string | null
          food_id: string | null
          id: string
          is_done: boolean
          kind: Database["public"]["Enums"]["task_kind"]
          next_due_on: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project: string | null
          project_id: string | null
          quantity: number | null
          recurrence: string | null
          recurrence_rule: Json | null
          sort_order: number
          source_module: string | null
          source_ref: Json | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          food_id?: string | null
          id?: string
          is_done?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          next_due_on?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          project_id?: string | null
          quantity?: number | null
          recurrence?: string | null
          recurrence_rule?: Json | null
          sort_order?: number
          source_module?: string | null
          source_ref?: Json | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          food_id?: string | null
          id?: string
          is_done?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          next_due_on?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          project_id?: string | null
          quantity?: number | null
          recurrence?: string | null
          recurrence_rule?: Json | null
          sort_order?: number
          source_module?: string | null
          source_ref?: Json | null
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
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      trip_budget_allocations: {
        Row: {
          allocated: number
          category: string
          created_at: string
          id: string
          sort_order: number
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated?: number
          category: string
          created_at?: string
          id?: string
          sort_order?: number
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated?: number
          category?: string
          created_at?: string
          id?: string
          sort_order?: number
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_budget_allocations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          incurred_on: string
          notes: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          id?: string
          incurred_on?: string
          notes?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          incurred_on?: string
          notes?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_flights: {
        Row: {
          airline: string | null
          arrive_airport: string | null
          arrive_at: string | null
          confirmation_code: string | null
          cost: number | null
          created_at: string
          depart_airport: string | null
          depart_at: string | null
          flight_number: string | null
          id: string
          notes: string | null
          seat: string | null
          sort_order: number
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airline?: string | null
          arrive_airport?: string | null
          arrive_at?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string
          depart_airport?: string | null
          depart_at?: string | null
          flight_number?: string | null
          id?: string
          notes?: string | null
          seat?: string | null
          sort_order?: number
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string | null
          arrive_airport?: string | null
          arrive_at?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string
          depart_airport?: string | null
          depart_at?: string | null
          flight_number?: string | null
          id?: string
          notes?: string | null
          seat?: string | null
          sort_order?: number
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_items: {
        Row: {
          all_day: boolean
          check_in_at: string | null
          check_out_at: string | null
          confirmation_code: string | null
          cost: number
          created_at: string
          end_time: string | null
          ends_at: string | null
          estimated_cost: number | null
          id: string
          kind: Database["public"]["Enums"]["trip_item_kind"]
          location: string | null
          notes: string | null
          on_date: string | null
          place_id: string | null
          provider: string | null
          reservation_url: string | null
          sort_order: number
          start_time: string | null
          starts_at: string | null
          timezone: string | null
          title: string
          trip_id: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean
          check_in_at?: string | null
          check_out_at?: string | null
          confirmation_code?: string | null
          cost?: number
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          estimated_cost?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          location?: string | null
          notes?: string | null
          on_date?: string | null
          place_id?: string | null
          provider?: string | null
          reservation_url?: string | null
          sort_order?: number
          start_time?: string | null
          starts_at?: string | null
          timezone?: string | null
          title: string
          trip_id: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean
          check_in_at?: string | null
          check_out_at?: string | null
          confirmation_code?: string | null
          cost?: number
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          estimated_cost?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["trip_item_kind"]
          location?: string | null
          notes?: string | null
          on_date?: string | null
          place_id?: string | null
          provider?: string | null
          reservation_url?: string | null
          sort_order?: number
          start_time?: string | null
          starts_at?: string | null
          timezone?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_items_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_packing_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          needs_action: boolean
          packed: boolean
          quantity: number
          sort_order: number
          task_id: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          needs_action?: boolean
          packed?: boolean
          quantity?: number
          sort_order?: number
          task_id?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          needs_action?: boolean
          packed?: boolean
          quantity?: number
          sort_order?: number
          task_id?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_photos: {
        Row: {
          caption: string | null
          created_at: string
          external_id: string | null
          id: string
          place_id: string | null
          sort_order: number
          source: string
          source_metadata: Json
          taken_on: string | null
          trip_id: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          place_id?: string | null
          sort_order?: number
          source?: string
          source_metadata?: Json
          taken_on?: string | null
          trip_id: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          place_id?: string | null
          sort_order?: number
          source?: string
          source_metadata?: Json
          taken_on?: string | null
          trip_id?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_photos_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_photos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_places: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          note: string | null
          place_id: string
          sort_order: number
          trip_id: string
          updated_at: string
          user_id: string
          visited: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          note?: string | null
          place_id: string
          sort_order?: number
          trip_id: string
          updated_at?: string
          user_id: string
          visited?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          note?: string | null
          place_id?: string
          sort_order?: number
          trip_id?: string
          updated_at?: string
          user_id?: string
          visited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trip_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_travelers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          role: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget: number
          color: string | null
          cover_place_id: string | null
          cover_url: string | null
          created_at: string
          destination: string | null
          destination_place_id: string | null
          destination_text: string | null
          end_date: string | null
          final_expenses: number | null
          home_lat: number | null
          home_lng: number | null
          id: string
          is_archived: boolean
          lessons_learned: string | null
          name: string
          notes: string | null
          rating: number | null
          related_project_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          timezone: string | null
          trip_type: string
          updated_at: string
          user_id: string
          would_visit_again: boolean | null
        }
        Insert: {
          budget?: number
          color?: string | null
          cover_place_id?: string | null
          cover_url?: string | null
          created_at?: string
          destination?: string | null
          destination_place_id?: string | null
          destination_text?: string | null
          end_date?: string | null
          final_expenses?: number | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          is_archived?: boolean
          lessons_learned?: string | null
          name: string
          notes?: string | null
          rating?: number | null
          related_project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          timezone?: string | null
          trip_type?: string
          updated_at?: string
          user_id: string
          would_visit_again?: boolean | null
        }
        Update: {
          budget?: number
          color?: string | null
          cover_place_id?: string | null
          cover_url?: string | null
          created_at?: string
          destination?: string | null
          destination_place_id?: string | null
          destination_text?: string | null
          end_date?: string | null
          final_expenses?: number | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          is_archived?: boolean
          lessons_learned?: string | null
          name?: string
          notes?: string | null
          rating?: number | null
          related_project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          timezone?: string | null
          trip_type?: string
          updated_at?: string
          user_id?: string
          would_visit_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_cover_place_id_fkey"
            columns: ["cover_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_destination_place_id_fkey"
            columns: ["destination_place_id"]
            isOneToOne: false
            referencedRelation: "places"
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
      vault_entries: {
        Row: {
          area: string
          attachments: Json
          created_at: string
          fields: Json
          id: string
          is_archived: boolean
          is_pinned: boolean
          notes: string | null
          parent_id: string | null
          related_project_id: string | null
          related_task_ids: string[]
          related_trip_ids: string[]
          sort_order: number
          subtitle: string | null
          tags: string[]
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          attachments?: Json
          created_at?: string
          fields?: Json
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          notes?: string | null
          parent_id?: string | null
          related_project_id?: string | null
          related_task_ids?: string[]
          related_trip_ids?: string[]
          sort_order?: number
          subtitle?: string | null
          tags?: string[]
          template?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          attachments?: Json
          created_at?: string
          fields?: Json
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          notes?: string | null
          parent_id?: string | null
          related_project_id?: string | null
          related_task_ids?: string[]
          related_trip_ids?: string[]
          sort_order?: number
          subtitle?: string | null
          tags?: string[]
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vault_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_reminder_runs: {
        Row: {
          cycle_key: string
          ran_at: string
          reminder_id: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          cycle_key: string
          ran_at?: string
          reminder_id: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          cycle_key?: string
          ran_at?: string
          reminder_id?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_reminder_runs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "vault_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_reminders: {
        Row: {
          active: boolean
          created_at: string
          entry_id: string
          field_key: string | null
          id: string
          label: string
          last_generated_cycle: string | null
          last_generated_task_id: string | null
          lead_days: number
          mileage_interval: number | null
          mileage_last_at: number | null
          next_fire_on: string | null
          repeat: string
          trigger_kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entry_id: string
          field_key?: string | null
          id?: string
          label: string
          last_generated_cycle?: string | null
          last_generated_task_id?: string | null
          lead_days?: number
          mileage_interval?: number | null
          mileage_last_at?: number | null
          next_fire_on?: string | null
          repeat?: string
          trigger_kind?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entry_id?: string
          field_key?: string | null
          id?: string
          label?: string
          last_generated_cycle?: string | null
          last_generated_task_id?: string | null
          lead_days?: number
          mileage_interval?: number | null
          mileage_last_at?: number | null
          next_fire_on?: string | null
          repeat?: string
          trigger_kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_reminders_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "vault_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
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
      bucket_status: "idea" | "planned" | "in_progress" | "done"
      nutrition_source: "usda" | "manual" | "barcode" | "imported"
      personal_date_kind:
        | "birthday"
        | "anniversary"
        | "holiday"
        | "vacation"
        | "countdown"
        | "other"
      privacy_mode: "private" | "guest" | "wall"
      storage_location: "pantry" | "fridge" | "freezer" | "other"
      task_kind: "general" | "shopping"
      task_priority: "low" | "normal" | "high"
      trip_item_kind: "lodging" | "travel" | "activity" | "food" | "note"
      trip_status:
        | "planning"
        | "upcoming"
        | "active"
        | "completed"
        | "cancelled"
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
      bucket_status: ["idea", "planned", "in_progress", "done"],
      nutrition_source: ["usda", "manual", "barcode", "imported"],
      personal_date_kind: [
        "birthday",
        "anniversary",
        "holiday",
        "vacation",
        "countdown",
        "other",
      ],
      privacy_mode: ["private", "guest", "wall"],
      storage_location: ["pantry", "fridge", "freezer", "other"],
      task_kind: ["general", "shopping"],
      task_priority: ["low", "normal", "high"],
      trip_item_kind: ["lodging", "travel", "activity", "food", "note"],
      trip_status: ["planning", "upcoming", "active", "completed", "cancelled"],
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
