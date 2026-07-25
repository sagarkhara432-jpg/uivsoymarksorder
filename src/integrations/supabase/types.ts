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
      addresses: {
        Row: {
          address_line: string
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          lat: number | null
          lng: number | null
          phone: string
          pincode: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          phone: string
          pincode?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string
          pincode?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      first_order_flags: {
        Row: {
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_order_flags_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_bestseller: boolean
          is_veg: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_bestseller?: boolean
          is_veg?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_bestseller?: boolean
          is_veg?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          price: number
          qty: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          price: number
          qty: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          price?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_line: string
          city: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          delivered_at: string | null
          delivery_fee: number
          discount: number
          first_order_discount: boolean
          id: string
          lat: number | null
          lng: number | null
          out_for_delivery_at: string | null
          packed_at: string | null
          partner_id: string | null
          phone: string
          pincode: string | null
          placed_at: string
          prep_time_mins: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address_line: string
          city?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          first_order_discount?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          partner_id?: string | null
          phone: string
          pincode?: string | null
          placed_at?: string
          prep_time_mins?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address_line?: string
          city?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          first_order_discount?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          partner_id?: string | null
          phone?: string
          pincode?: string | null
          placed_at?: string
          prep_time_mins?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_status: {
        Row: {
          is_online: boolean
          last_lat: number | null
          last_lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_lat?: number | null
          last_lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_lat?: number | null
          last_lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_verifications: {
        Row: {
          admin_notes: string | null
          created_at: string
          full_name: string
          id: string
          id_proof_path: string
          phone: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
          vehicle_number: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          full_name: string
          id?: string
          id_proof_path: string
          phone: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
          vehicle_number?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_proof_path?: string
          phone?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          lat: number | null
          lng: number | null
          phone: string | null
          pincode: string | null
          profile_completed: boolean
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean
          lat?: number | null
          lng?: number | null
          phone?: string | null
          pincode?: string | null
          profile_completed?: boolean
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          lat?: number | null
          lng?: number | null
          phone?: string | null
          pincode?: string | null
          profile_completed?: boolean
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "kitchen" | "delivery" | "admin"
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "packed"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["customer", "kitchen", "delivery", "admin"],
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
