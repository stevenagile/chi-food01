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
      daily_history: {
        Row: {
          created_at: string
          id: string
          prep_amount: number
          revenue_amount: number
          servings_count: number
          stat_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          prep_amount?: number
          revenue_amount?: number
          servings_count?: number
          stat_date: string
        }
        Update: {
          created_at?: string
          id?: string
          prep_amount?: number
          revenue_amount?: number
          servings_count?: number
          stat_date?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string
          current_stock: number
          id: string
          min_stock: number
          name: string
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          min_stock?: number
          name: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          min_stock?: number
          name?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          menu_item_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          menu_item_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_logs: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          from_status: string | null
          id: string
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id?: string
          to_status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          completed_at: string | null
          cooking_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          guest_count: number | null
          id: string
          is_archived: boolean
          items: Json
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          status: string
          table_number: string | null
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          cooking_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          guest_count?: number | null
          id: string
          is_archived?: boolean
          items?: Json
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: string
          table_number?: string | null
          total?: number
          type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          cooking_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          guest_count?: number | null
          id?: string
          is_archived?: boolean
          items?: Json
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: string
          table_number?: string | null
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_records: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          note: string | null
          purchase_date: string
          quantity: number
          supplier_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          note?: string | null
          purchase_date?: string
          quantity: number
          supplier_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          note?: string | null
          purchase_date?: string
          quantity?: number
          supplier_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_records_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_records: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          note: string | null
          purpose: string | null
          quantity: number
          requisition_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          note?: string | null
          purpose?: string | null
          quantity: number
          requisition_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          note?: string | null
          purpose?: string | null
          quantity?: number
          requisition_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_records_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_settled: boolean
          note: string | null
          payment_date: string
          payment_method: string | null
          purchase_record_id: string | null
          settled_at: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_settled?: boolean
          note?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_record_id?: string | null
          settled_at?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_settled?: boolean
          note?: string | null
          payment_date?: string
          payment_method?: string | null
          purchase_record_id?: string | null
          settled_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_record_id_fkey"
            columns: ["purchase_record_id"]
            isOneToOne: false
            referencedRelation: "purchase_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_all_orders: { Args: never; Returns: undefined }
      check_ingredient_availability: { Args: { p_items: Json }; Returns: Json }
      close_daily_stats: { Args: never; Returns: Json }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
