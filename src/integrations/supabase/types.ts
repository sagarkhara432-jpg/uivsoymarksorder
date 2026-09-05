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
          building: string | null
          city: string | null
          created_at: string
          house_no: string | null
          id: string
          is_default: boolean
          label: string | null
          landmark: string | null
          lat: number | null
          lng: number | null
          phone: string
          pincode: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          building?: string | null
          city?: string | null
          created_at?: string
          house_no?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone: string
          pincode?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          building?: string | null
          city?: string | null
          created_at?: string
          house_no?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string
          pincode?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string
          app_name: string
          base_delivery_fee: number
          checkout_theme_color: string
          commission_percent: number
          delivery_radius_km: number
          download_url: string | null
          free_delivery_over: number
          id: string
          logo_url: string | null
          payment_card_enabled: boolean
          payment_cod_enabled: boolean
          payment_online_enabled: boolean
          per_km_rate: number
          primary_color: string
          qr_logo_url: string | null
          rider_incentive_amount: number
          rider_incentive_km: number
          rider_payout_per_order: number
          service_enabled: boolean
          service_message: string | null
          splash_bg_color: string
          splash_url: string | null
          tax_percent: number
          updated_at: string
          upi_holder_name: string | null
          upi_id: string | null
          upi_merchant_name: string | null
          upi_qr_url: string | null
        }
        Insert: {
          accent_color?: string
          app_name?: string
          base_delivery_fee?: number
          checkout_theme_color?: string
          commission_percent?: number
          delivery_radius_km?: number
          download_url?: string | null
          free_delivery_over?: number
          id?: string
          logo_url?: string | null
          payment_card_enabled?: boolean
          payment_cod_enabled?: boolean
          payment_online_enabled?: boolean
          per_km_rate?: number
          primary_color?: string
          qr_logo_url?: string | null
          rider_incentive_amount?: number
          rider_incentive_km?: number
          rider_payout_per_order?: number
          service_enabled?: boolean
          service_message?: string | null
          splash_bg_color?: string
          splash_url?: string | null
          tax_percent?: number
          updated_at?: string
          upi_holder_name?: string | null
          upi_id?: string | null
          upi_merchant_name?: string | null
          upi_qr_url?: string | null
        }
        Update: {
          accent_color?: string
          app_name?: string
          base_delivery_fee?: number
          checkout_theme_color?: string
          commission_percent?: number
          delivery_radius_km?: number
          download_url?: string | null
          free_delivery_over?: number
          id?: string
          logo_url?: string | null
          payment_card_enabled?: boolean
          payment_cod_enabled?: boolean
          payment_online_enabled?: boolean
          per_km_rate?: number
          primary_color?: string
          qr_logo_url?: string | null
          rider_incentive_amount?: number
          rider_incentive_km?: number
          rider_payout_per_order?: number
          service_enabled?: boolean
          service_message?: string | null
          splash_bg_color?: string
          splash_url?: string | null
          tax_percent?: number
          updated_at?: string
          upi_holder_name?: string | null
          upi_id?: string | null
          upi_merchant_name?: string | null
          upi_qr_url?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          clicks: number
          created_at: string
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          is_sponsored: boolean
          link_url: string | null
          media_type: string
          menu_item_id: string | null
          restaurant_id: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          is_sponsored?: boolean
          link_url?: string | null
          media_type?: string
          menu_item_id?: string | null
          restaurant_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          is_sponsored?: boolean
          link_url?: string | null
          media_type?: string
          menu_item_id?: string | null
          restaurant_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      feature_flags: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          label: string
          restaurant_id: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          label: string
          restaurant_id?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          restaurant_id?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      impersonation_sessions: {
        Row: {
          admin_id: string
          created_at: string
          ended_at: string | null
          id: string
          restaurant_id: string | null
          started_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          restaurant_id?: string | null
          started_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          restaurant_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_notes: {
        Row: {
          created_at: string
          menu_item_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          menu_item_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          menu_item_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_notes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
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
          is_sponsored: boolean
          is_veg: boolean
          name: string
          out_of_stock: boolean
          price: number
          restaurant_id: string | null
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
          is_sponsored?: boolean
          is_veg?: boolean
          name: string
          out_of_stock?: boolean
          price: number
          restaurant_id?: string | null
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
          is_sponsored?: boolean
          is_veg?: boolean
          name?: string
          out_of_stock?: boolean
          price?: number
          restaurant_id?: string | null
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
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_modules: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          parent_id: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nav_modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nav_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          price: number
          qty: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          price: number
          qty: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          menu_item_id?: string | null
          name?: string
          notes?: string | null
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
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pickup_pins: {
        Row: {
          created_at: string
          order_id: string
          pin: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          order_id: string
          pin: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          order_id?: string
          pin?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_pickup_pins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pins: {
        Row: {
          created_at: string
          customer_id: string
          order_id: string
          pin: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          order_id: string
          pin: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          order_id?: string
          pin?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_pins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_line: string
          address_tag: string | null
          building: string | null
          city: string | null
          cod_collect_method: string | null
          commission_percent: number
          created_at: string
          customer_id: string
          customer_name: string | null
          delivered_at: string | null
          delivery_fee: number
          discount: number
          first_order_discount: boolean
          house_no: string | null
          id: string
          is_kitchen_verified: boolean
          kitchen_lat: number | null
          kitchen_lng: number | null
          kitchen_payout: number
          landmark: string | null
          lat: number | null
          lng: number | null
          out_for_delivery_at: string | null
          packed_at: string | null
          partner_id: string | null
          payment_method: string
          payment_status: string
          phone: string
          pincode: string | null
          placed_at: string
          prep_time_mins: number | null
          ready_at: string | null
          restaurant_id: string | null
          rider_payout: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address_line: string
          address_tag?: string | null
          building?: string | null
          city?: string | null
          cod_collect_method?: string | null
          commission_percent?: number
          created_at?: string
          customer_id: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          first_order_discount?: boolean
          house_no?: string | null
          id?: string
          is_kitchen_verified?: boolean
          kitchen_lat?: number | null
          kitchen_lng?: number | null
          kitchen_payout?: number
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          partner_id?: string | null
          payment_method?: string
          payment_status?: string
          phone: string
          pincode?: string | null
          placed_at?: string
          prep_time_mins?: number | null
          ready_at?: string | null
          restaurant_id?: string | null
          rider_payout?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax?: number
          total: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address_line?: string
          address_tag?: string | null
          building?: string | null
          city?: string | null
          cod_collect_method?: string | null
          commission_percent?: number
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          first_order_discount?: boolean
          house_no?: string | null
          id?: string
          is_kitchen_verified?: boolean
          kitchen_lat?: number | null
          kitchen_lng?: number | null
          kitchen_payout?: number
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          partner_id?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string
          pincode?: string | null
          placed_at?: string
          prep_time_mins?: number | null
          ready_at?: string | null
          restaurant_id?: string | null
          rider_payout?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          aadhaar_path: string | null
          admin_notes: string | null
          created_at: string
          dl_path: string | null
          full_name: string
          id: string
          id_proof_path: string
          phone: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          upi_id: string | null
          user_id: string
          vehicle_number: string | null
        }
        Insert: {
          aadhaar_path?: string | null
          admin_notes?: string | null
          created_at?: string
          dl_path?: string | null
          full_name: string
          id?: string
          id_proof_path: string
          phone: string
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          upi_id?: string | null
          user_id: string
          vehicle_number?: string | null
        }
        Update: {
          aadhaar_path?: string | null
          admin_notes?: string | null
          created_at?: string
          dl_path?: string | null
          full_name?: string
          id?: string
          id_proof_path?: string
          phone?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          partner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          partner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          partner_id?: string
          status?: string
          updated_at?: string
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
          upi_id: string | null
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
          upi_id?: string | null
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
          upi_id?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address_line: string | null
          city: string | null
          commission_percent: number | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_open: boolean
          is_sponsored: boolean
          landmark: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          pincode: string | null
          status: string
          store_type: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          commission_percent?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_open?: boolean
          is_sponsored?: boolean
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          status?: string
          store_type?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address_line?: string | null
          city?: string | null
          commission_percent?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_open?: boolean
          is_sponsored?: boolean
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          status?: string
          store_type?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      rider_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          partner_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          partner_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_banner_metric: {
        Args: { _banner_id: string; _kind: string }
        Returns: undefined
      }
      consume_delivery_pin: {
        Args: { _order_id: string; _pin: string }
        Returns: boolean
      }
      consume_pickup_pin: {
        Args: { _order_id: string; _pin: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "kitchen"
        | "delivery"
        | "admin"
        | "manager"
        | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "customer",
        "kitchen",
        "delivery",
        "admin",
        "manager",
        "editor",
      ],
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
