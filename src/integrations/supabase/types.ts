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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      archived_payments: {
        Row: {
          amount: number
          archived_at: string
          cash_received: number | null
          change_due: number | null
          created_at: string
          customer_name: string
          establishment_method: string | null
          id: string
          idempotency_key: string | null
          item_quantities: Json
          payment_method: string
          payment_target: string
          provider: string | null
          provider_order_id: string | null
          restaurant_slug: string
          service_fee_amount: number | null
          service_fee_changed: boolean | null
          service_fee_suggested: number | null
          service_rate_suggested: number | null
          status: string
          table_number: string
          waiter_id: string | null
        }
        Insert: {
          amount: number
          archived_at?: string
          cash_received?: number | null
          change_due?: number | null
          created_at: string
          customer_name: string
          establishment_method?: string | null
          id: string
          idempotency_key?: string | null
          item_quantities?: Json
          payment_method: string
          payment_target: string
          provider?: string | null
          provider_order_id?: string | null
          restaurant_slug: string
          service_fee_amount?: number | null
          service_fee_changed?: boolean | null
          service_fee_suggested?: number | null
          service_rate_suggested?: number | null
          status: string
          table_number: string
          waiter_id?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string
          cash_received?: number | null
          change_due?: number | null
          created_at?: string
          customer_name?: string
          establishment_method?: string | null
          id?: string
          idempotency_key?: string | null
          item_quantities?: Json
          payment_method?: string
          payment_target?: string
          provider?: string | null
          provider_order_id?: string | null
          restaurant_slug?: string
          service_fee_amount?: number | null
          service_fee_changed?: boolean | null
          service_fee_suggested?: number | null
          service_rate_suggested?: number | null
          status?: string
          table_number?: string
          waiter_id?: string | null
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          id: string
          kind: string
          reason: string | null
          restaurant_id: string
          session_id: string
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          id?: string
          kind: string
          reason?: string | null
          restaurant_id: string
          session_id: string
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          reason?: string | null
          restaurant_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          restaurant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          restaurant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_devices: {
        Row: {
          device_hash: string
          first_seen_at: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          device_hash: string
          first_seen_at?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          device_hash?: string
          first_seen_at?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lebre_limits: {
        Row: {
          id: string
          panel_daily: number
          public_daily: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          panel_daily?: number
          public_daily?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          panel_daily?: number
          public_daily?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lebre_usage: {
        Row: {
          alerted80: boolean
          day: string
          hits: number
          scope: string
        }
        Insert: {
          alerted80?: boolean
          day: string
          hits?: number
          scope: string
        }
        Update: {
          alerted80?: boolean
          day?: string
          hits?: number
          scope?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          amount: number
          created_at: string
          id: string
          payment_id: string
          restaurant_slug: string
          table_number: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_id: string
          restaurant_slug: string
          table_number: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          restaurant_slug?: string
          table_number?: string
        }
        Relationships: []
      }
      payment_incidents: {
        Row: {
          amount: number | null
          created_at: string
          detail: string
          id: string
          kind: string
          payment_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string
          table_number: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          detail?: string
          id?: string
          kind: string
          payment_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id: string
          table_number?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          payment_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string
          table_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_incidents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_connections: {
        Row: {
          adapter: string
          created_at: string
          credentials_encrypted: string | null
          last_error: string | null
          last_error_at: string | null
          last_sync_at: string | null
          restaurant_id: string
          status: string
          updated_at: string
          webhook_secret_hash: string | null
        }
        Insert: {
          adapter?: string
          created_at?: string
          credentials_encrypted?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string
          webhook_secret_hash?: string | null
        }
        Update: {
          adapter?: string
          created_at?: string
          credentials_encrypted?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          restaurant_id?: string
          status?: string
          updated_at?: string
          webhook_secret_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      totem_tokens: {
        Row: {
          restaurant_id: string
          rotated_at: string
          rotated_by: string | null
          token: string
        }
        Insert: {
          restaurant_id: string
          rotated_at?: string
          rotated_by?: string | null
          token: string
        }
        Update: {
          restaurant_id?: string
          rotated_at?: string
          rotated_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "totem_tokens_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_display_tokens: {
        Row: {
          restaurant_id: string
          rotated_at: string
          rotated_by: string | null
          token: string
        }
        Insert: {
          restaurant_id: string
          rotated_at?: string
          rotated_by?: string | null
          token: string
        }
        Update: {
          restaurant_id?: string
          rotated_at?: string
          rotated_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_display_tokens_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_events: {
        Row: {
          adapter: string
          created_at: string
          detail: string | null
          direction: string
          event_type: string
          external_event_id: string
          id: string
          restaurant_id: string
          status: string
        }
        Insert: {
          adapter: string
          created_at?: string
          detail?: string | null
          direction: string
          event_type: string
          external_event_id: string
          id?: string
          restaurant_id: string
          status?: string
        }
        Update: {
          adapter?: string
          created_at?: string
          detail?: string | null
          direction?: string
          event_type?: string
          external_event_id?: string
          id?: string
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_menu_items: {
        Row: {
          available: boolean
          category_id: string | null
          code: string
          created_at: string
          description: string | null
          image_url: string | null
          depth_url: string | null
          model_url: string | null
          badge: string | null
          allergens: string[]
          id: string
          name: string
          position: number
          price: number
          restaurant_id: string
          sector: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          image_url?: string | null
          depth_url?: string | null
          model_url?: string | null
          badge?: string | null
          allergens?: string[]
          id?: string
          name: string
          position?: number
          price: number
          restaurant_id: string
          sector?: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          image_url?: string | null
          depth_url?: string | null
          model_url?: string | null
          badge?: string | null
          allergens?: string[]
          id?: string
          name?: string
          position?: number
          price?: number
          restaurant_id?: string
          sector?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pdv_menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_order_items: {
        Row: {
          created_at: string
          id: string
          item_code: string
          item_name: string
          notes: string | null
          order_id: string
          quantity: number
          restaurant_id: string
          sector: string
          status: string
          status_at: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_code: string
          item_name: string
          notes?: string | null
          order_id: string
          quantity: number
          restaurant_id: string
          sector?: string
          status?: string
          status_at?: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string
          item_name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          restaurant_id?: string
          sector?: string
          status?: string
          status_at?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdv_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pdv_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_orders: {
        Row: {
          called_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_received: number | null
          cash_session_id: string | null
          change_due: number | null
          channel: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          payment_method: string | null
          picked_up_at: string | null
          request_id: string | null
          restaurant_id: string
          service_day: string | null
          table_number: string | null
          ticket_number: number | null
          total: number | null
          waiter_id: string | null
        }
        Insert: {
          called_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_received?: number | null
          cash_session_id?: string | null
          change_due?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          payment_method?: string | null
          picked_up_at?: string | null
          request_id?: string | null
          restaurant_id: string
          service_day?: string | null
          table_number?: string | null
          ticket_number?: number | null
          total?: number | null
          waiter_id?: string | null
        }
        Update: {
          called_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_received?: number | null
          cash_session_id?: string | null
          change_due?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          payment_method?: string | null
          picked_up_at?: string | null
          request_id?: string | null
          restaurant_id?: string
          service_day?: string | null
          table_number?: string | null
          ticket_number?: number | null
          total?: number | null
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_orders_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_payment_outbox: {
        Row: {
          adapter: string
          amount: number
          attempts: number
          created_at: string
          id: string
          item_quantities: Json
          last_error: string | null
          locked_until: string | null
          next_attempt_at: string
          payment_id: string
          payment_method: string
          restaurant_id: string
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          adapter: string
          amount: number
          attempts?: number
          created_at?: string
          id?: string
          item_quantities?: Json
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          payment_id: string
          payment_method: string
          restaurant_id: string
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          adapter?: string
          amount?: number
          attempts?: number
          created_at?: string
          id?: string
          item_quantities?: Json
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          payment_id?: string
          payment_method?: string
          restaurant_id?: string
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_payment_outbox_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_voids: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          item_code: string
          item_name: string
          quantity: number
          reason: string
          restaurant_id: string
          table_number: string
          unit_price: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          item_code: string
          item_name: string
          quantity: number
          reason: string
          restaurant_id: string
          table_number: string
          unit_price: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          item_code?: string
          item_name?: string
          quantity?: number
          reason?: string
          restaurant_id?: string
          table_number?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdv_voids_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_waiters: {
        Row: {
          active: boolean
          code: string
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          name: string
          restaurant_id: string
          source_adapter: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          name: string
          restaurant_id: string
          source_adapter?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          source_adapter?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdv_waiters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_catalog: {
        Row: {
          founder_price: number | null
          full_price: number | null
          id: string
          included_modules: string[]
          max_tables: number | null
          name: string
          position: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          founder_price?: number | null
          full_price?: number | null
          id: string
          included_modules?: string[]
          max_tables?: number | null
          name: string
          position?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          founder_price?: number | null
          full_price?: number | null
          id?: string
          included_modules?: string[]
          max_tables?: number | null
          name?: string
          position?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      plan_changes: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          new_limit: number | null
          new_plan: string | null
          old_limit: number | null
          old_plan: string | null
          restaurant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          new_limit?: number | null
          new_plan?: string | null
          old_limit?: number | null
          old_plan?: string | null
          restaurant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          new_limit?: number | null
          new_plan?: string | null
          old_limit?: number | null
          old_plan?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_changes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_integrations: {
        Row: {
          created_at: string
          id: string
          key_hash: string | null
          key_prefix: string | null
          last_sync_at: string | null
          provider: string
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash?: string | null
          key_prefix?: string | null
          last_sync_at?: string | null
          provider: string
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string | null
          key_prefix?: string | null
          last_sync_at?: string | null
          provider?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_integrations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sync_log: {
        Row: {
          created_at: string
          detail: string | null
          event: string
          id: string
          restaurant_id: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event: string
          id?: string
          restaurant_id: string
          status: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event?: string
          id?: string
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sync_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          created_at: string
          details: string | null
          email: string
          holder_category: string
          id: string
          name: string
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          email: string
          holder_category: string
          id?: string
          name: string
          request_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          email?: string
          holder_category?: string
          id?: string
          name?: string
          request_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start?: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      restaurant_leads: {
        Row: {
          acquirer: string | null
          calculator: Json | null
          city: string | null
          close_time: string | null
          contact_name: string
          contact_role: string | null
          created_at: string
          discovery_source: string | null
          email: string
          has_pagarme: string | null
          id: string
          instagram: string | null
          lost_reason: string | null
          marketing_opt_in: boolean
          message: string | null
          neighborhood: string | null
          next_contact_at: string | null
          notes: string | null
          origin_page: string | null
          pains: string[] | null
          pdv_system: string | null
          peak_queue: string | null
          peak_times: string[] | null
          phone: string | null
          privacy_accepted_at: string | null
          ref_code: string | null
          referred_by_code: string | null
          referrer_name: string | null
          restaurant_name: string
          stage2_completed_at: string | null
          state: string | null
          status: string
          tables_range: string | null
          ticket_range: string | null
          update_token: string | null
          updated_at: string
          used_simulator: boolean
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          venue_type: string | null
          waiters_range: string | null
        }
        Insert: {
          acquirer?: string | null
          calculator?: Json | null
          city?: string | null
          close_time?: string | null
          contact_name: string
          contact_role?: string | null
          created_at?: string
          discovery_source?: string | null
          email: string
          has_pagarme?: string | null
          id?: string
          instagram?: string | null
          lost_reason?: string | null
          marketing_opt_in?: boolean
          message?: string | null
          neighborhood?: string | null
          next_contact_at?: string | null
          notes?: string | null
          origin_page?: string | null
          pains?: string[] | null
          pdv_system?: string | null
          peak_queue?: string | null
          peak_times?: string[] | null
          phone?: string | null
          privacy_accepted_at?: string | null
          ref_code?: string | null
          referred_by_code?: string | null
          referrer_name?: string | null
          restaurant_name: string
          stage2_completed_at?: string | null
          state?: string | null
          status?: string
          tables_range?: string | null
          ticket_range?: string | null
          update_token?: string | null
          updated_at?: string
          used_simulator?: boolean
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          venue_type?: string | null
          waiters_range?: string | null
        }
        Update: {
          acquirer?: string | null
          calculator?: Json | null
          city?: string | null
          close_time?: string | null
          contact_name?: string
          contact_role?: string | null
          created_at?: string
          discovery_source?: string | null
          email?: string
          has_pagarme?: string | null
          id?: string
          instagram?: string | null
          lost_reason?: string | null
          marketing_opt_in?: boolean
          message?: string | null
          neighborhood?: string | null
          next_contact_at?: string | null
          notes?: string | null
          origin_page?: string | null
          pains?: string[] | null
          pdv_system?: string | null
          peak_queue?: string | null
          peak_times?: string[] | null
          phone?: string | null
          privacy_accepted_at?: string | null
          ref_code?: string | null
          referred_by_code?: string | null
          referrer_name?: string | null
          restaurant_name?: string
          stage2_completed_at?: string | null
          state?: string | null
          status?: string
          tables_range?: string | null
          ticket_range?: string | null
          update_token?: string | null
          updated_at?: string
          used_simulator?: boolean
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          venue_type?: string | null
          waiters_range?: string | null
        }
        Relationships: []
      }
      restaurant_module_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          from_status: string | null
          id: string
          module: string
          reason: string | null
          restaurant_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          created_at?: string
          from_status?: string | null
          id?: string
          module: string
          reason?: string | null
          restaurant_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          from_status?: string | null
          id?: string
          module?: string
          reason?: string | null
          restaurant_id?: string
          to_status?: string
        }
        Relationships: []
      }
      restaurant_modules: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          module: string
          reason: string | null
          restaurant_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          module: string
          reason?: string | null
          restaurant_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          module?: string
          reason?: string | null
          restaurant_id?: string
          status?: string
        }
        Relationships: []
      }
      restaurant_pagarme_accounts: {
        Row: {
          connected_at: string
          connected_by: string | null
          key_mode: string
          key_prefix: string
          restaurant_id: string
          secret_key_enc: string
          status: string
          updated_at: string
          webhook_token: string
        }
        Insert: {
          connected_at?: string
          connected_by?: string | null
          key_mode?: string
          key_prefix: string
          restaurant_id: string
          secret_key_enc: string
          status?: string
          updated_at?: string
          webhook_token: string
        }
        Update: {
          connected_at?: string
          connected_by?: string | null
          key_mode?: string
          key_prefix?: string
          restaurant_id?: string
          secret_key_enc?: string
          status?: string
          updated_at?: string
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_pagarme_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payout_accounts: {
        Row: {
          account_check_digit: string
          account_number: string
          account_number_enc: string | null
          account_type: string
          bank: string
          branch_check_digit: string | null
          branch_number: string
          created_at: string
          email: string
          holder_document: string
          holder_document_enc: string | null
          holder_name: string
          holder_type: string
          pagarme_recipient_id: string | null
          restaurant_id: string
          status: string
          status_detail: string | null
          updated_at: string
        }
        Insert: {
          account_check_digit: string
          account_number: string
          account_number_enc?: string | null
          account_type: string
          bank: string
          branch_check_digit?: string | null
          branch_number: string
          created_at?: string
          email: string
          holder_document: string
          holder_document_enc?: string | null
          holder_name: string
          holder_type: string
          pagarme_recipient_id?: string | null
          restaurant_id: string
          status?: string
          status_detail?: string | null
          updated_at?: string
        }
        Update: {
          account_check_digit?: string
          account_number?: string
          account_number_enc?: string | null
          account_type?: string
          bank?: string
          branch_check_digit?: string | null
          branch_number?: string
          created_at?: string
          email?: string
          holder_document?: string
          holder_document_enc?: string | null
          holder_name?: string
          holder_type?: string
          pagarme_recipient_id?: string | null
          restaurant_id?: string
          status?: string
          status_detail?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payout_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_subscriptions: {
        Row: {
          billing_period: string
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          custom_table_limit: number | null
          exempt: boolean
          exempt_reason: string | null
          founder_price: boolean
          founder_price_until: string | null
          past_due_since: string | null
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          restaurant_id: string
          status: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          billing_period?: string
          cancel_reason?: string | null
          canceled_at?: string | null
          exempt?: boolean
          exempt_reason?: string | null
          past_due_since?: string | null
          created_at?: string
          current_period_end?: string | null
          custom_table_limit?: number | null
          founder_price?: boolean
          founder_price_until?: string | null
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          restaurant_id: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          billing_period?: string
          cancel_reason?: string | null
          canceled_at?: string | null
          exempt?: boolean
          exempt_reason?: string | null
          past_due_since?: string | null
          created_at?: string
          current_period_end?: string | null
          custom_table_limit?: number | null
          founder_price?: boolean
          founder_price_until?: string | null
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          restaurant_id?: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          access_token: string
          active: boolean
          code: string
          created_at: string
          external_id: string | null
          id: string
          number: string
          restaurant_id: string
          session_token: string
          source_adapter: string
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          access_token?: string
          active?: boolean
          code: string
          created_at?: string
          external_id?: string | null
          id?: string
          number: string
          restaurant_id: string
          session_token?: string
          source_adapter?: string
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          access_token?: string
          active?: boolean
          code?: string
          created_at?: string
          external_id?: string | null
          id?: string
          number?: string
          restaurant_id?: string
          session_token?: string
          source_adapter?: string
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_waiter_fk"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          bill_payment_methods: string[]
          cnpj: string | null
          created_at: string
          google_review_url: string | null
          id: string
          name: string
          onboarding_step: string
          order_session_mode: string
          opening_hours: string | null
          phone: string | null
          pos_mode: string
          pos_provider: string
          self_order_enabled: boolean
          totem_enabled: boolean
          service_rate: number
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bill_payment_methods?: string[]
          cnpj?: string | null
          created_at?: string
          google_review_url?: string | null
          id?: string
          name: string
          onboarding_step?: string
          order_session_mode?: string
          opening_hours?: string | null
          phone?: string | null
          pos_mode?: string
          pos_provider?: string
          self_order_enabled?: boolean
          service_rate?: number
          slug: string
          totem_enabled?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          bill_payment_methods?: string[]
          cnpj?: string | null
          created_at?: string
          google_review_url?: string | null
          id?: string
          name?: string
          onboarding_step?: string
          order_session_mode?: string
          opening_hours?: string | null
          phone?: string | null
          pos_mode?: string
          pos_provider?: string
          self_order_enabled?: boolean
          service_rate?: number
          slug?: string
          totem_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      security_alert_state: {
        Row: {
          alert_type: string
          last_sent_at: string | null
          suppressed_count: number
        }
        Insert: {
          alert_type: string
          last_sent_at?: string | null
          suppressed_count?: number
        }
        Update: {
          alert_type?: string
          last_sent_at?: string | null
          suppressed_count?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          resource: string | null
          restaurant_id: string | null
          restaurant_slug: string | null
          result: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          resource?: string | null
          restaurant_id?: string | null
          restaurant_slug?: string | null
          result?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          resource?: string | null
          restaurant_id?: string | null
          restaurant_slug?: string | null
          result?: string
        }
        Relationships: []
      }
      service_fee_waivers: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          reason: string
          restaurant_id: string
          session_token: string
          table_number: string
          waived_amount: number
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          reason: string
          restaurant_id: string
          session_token: string
          table_number: string
          waived_amount?: number
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          reason?: string
          restaurant_id?: string
          session_token?: string
          table_number?: string
          waived_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_fee_waivers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          from_plan: string | null
          from_status: string | null
          id: string
          restaurant_id: string
          to_plan: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          from_plan?: string | null
          from_status?: string | null
          id?: string
          restaurant_id: string
          to_plan?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          from_plan?: string | null
          from_status?: string | null
          id?: string
          restaurant_id?: string
          to_plan?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_bill_items: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          item_code: string
          item_name: string
          notes: string | null
          ordered_at: string
          ordered_by: string
          ordered_quantity: number
          paid_portion: number
          paid_quantity: number
          reserved_portion: number
          reserved_quantity: number
          restaurant_slug: string
          source_adapter: string
          table_number: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          item_code: string
          item_name: string
          notes?: string | null
          ordered_at: string
          ordered_by: string
          ordered_quantity: number
          paid_portion?: number
          paid_quantity?: number
          reserved_portion?: number
          reserved_quantity?: number
          restaurant_slug: string
          source_adapter?: string
          table_number: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          item_code?: string
          item_name?: string
          notes?: string | null
          ordered_at?: string
          ordered_by?: string
          ordered_quantity?: number
          paid_portion?: number
          paid_quantity?: number
          reserved_portion?: number
          reserved_quantity?: number
          restaurant_slug?: string
          source_adapter?: string
          table_number?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      table_limit_blocks: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          source: string
          table_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          source: string
          table_number: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          source?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_limit_blocks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_order_devices: {
        Row: {
          created_at: string
          id: string
          session_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          token_hash?: string
        }
        Relationships: []
      }
      table_order_sessions: {
        Row: {
          bill_session: string
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          expires_at: string
          failed_attempts: number
          id: string
          opened_at: string
          opened_by: string | null
          requires_code: boolean
          restaurant_id: string
          short_code: string | null
          table_number: string
        }
        Insert: {
          bill_session: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          expires_at?: string
          failed_attempts?: number
          id?: string
          opened_at?: string
          opened_by?: string | null
          requires_code?: boolean
          restaurant_id: string
          short_code?: string | null
          table_number: string
        }
        Update: {
          bill_session?: string
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          expires_at?: string
          failed_attempts?: number
          id?: string
          opened_at?: string
          opened_by?: string | null
          requires_code?: boolean
          restaurant_id?: string
          short_code?: string | null
          table_number?: string
        }
        Relationships: []
      }
      table_payment_requests: {
        Row: {
          amount: number
          cash_received: number | null
          change_due: number | null
          created_at: string
          customer_name: string
          establishment_method: string | null
          id: string
          idempotency_key: string | null
          item_quantities: Json
          payment_method: string
          payment_target: string
          provider: string | null
          provider_order_id: string | null
          restaurant_slug: string
          service_fee_amount: number | null
          service_fee_changed: boolean | null
          service_fee_suggested: number | null
          service_rate_suggested: number | null
          status: string
          table_number: string
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          amount: number
          cash_received?: number | null
          change_due?: number | null
          created_at?: string
          customer_name: string
          establishment_method?: string | null
          id?: string
          idempotency_key?: string | null
          item_quantities?: Json
          payment_method: string
          payment_target: string
          provider?: string | null
          provider_order_id?: string | null
          restaurant_slug: string
          service_fee_amount?: number | null
          service_fee_changed?: boolean | null
          service_fee_suggested?: number | null
          service_rate_suggested?: number | null
          status?: string
          table_number: string
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          amount?: number
          cash_received?: number | null
          change_due?: number | null
          created_at?: string
          customer_name?: string
          establishment_method?: string | null
          id?: string
          idempotency_key?: string | null
          item_quantities?: Json
          payment_method?: string
          payment_target?: string
          provider?: string | null
          provider_order_id?: string | null
          restaurant_slug?: string
          service_fee_amount?: number | null
          service_fee_changed?: boolean | null
          service_fee_suggested?: number | null
          service_rate_suggested?: number | null
          status?: string
          table_number?: string
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_payment_requests_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_payout_accounts: {
        Row: {
          holder_document: string
          holder_document_enc: string | null
          holder_name: string
          pending_holder_document: string | null
          pending_holder_document_enc: string | null
          pending_holder_name: string | null
          pending_pix_key: string | null
          pending_pix_key_enc: string | null
          pending_pix_key_type: string | null
          pending_since: string | null
          pix_key: string
          pix_key_enc: string | null
          pix_key_type: string
          updated_at: string
          waiter_id: string
        }
        Insert: {
          holder_document: string
          holder_document_enc?: string | null
          holder_name: string
          pending_holder_document?: string | null
          pending_holder_document_enc?: string | null
          pending_holder_name?: string | null
          pending_pix_key?: string | null
          pending_pix_key_enc?: string | null
          pending_pix_key_type?: string | null
          pending_since?: string | null
          pix_key: string
          pix_key_enc?: string | null
          pix_key_type: string
          updated_at?: string
          waiter_id: string
        }
        Update: {
          holder_document?: string
          holder_document_enc?: string | null
          holder_name?: string
          pending_holder_document?: string | null
          pending_holder_document_enc?: string | null
          pending_holder_name?: string | null
          pending_pix_key?: string | null
          pending_pix_key_enc?: string | null
          pending_pix_key_type?: string | null
          pending_since?: string | null
          pix_key?: string
          pix_key_enc?: string | null
          pix_key_type?: string
          updated_at?: string
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_payout_accounts_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: true
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          restaurant_id: string
          stars: number
          table_number: string
          waiter_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          restaurant_id: string
          stars: number
          table_number: string
          waiter_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          restaurant_id?: string
          stars?: number
          table_number?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_ratings_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_withdrawal_events: {
        Row: {
          action: string
          actor_id: string | null
          amount: number
          created_at: string
          id: string
          pix_key_masked: string | null
          waiter_id: string
          withdrawal_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          amount: number
          created_at?: string
          id?: string
          pix_key_masked?: string | null
          waiter_id: string
          withdrawal_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          pix_key_masked?: string | null
          waiter_id?: string
          withdrawal_id?: string
        }
        Relationships: []
      }
      waiter_withdrawals: {
        Row: {
          amount: number
          blocked_until: string | null
          cycle_end: string
          holder_name: string
          id: string
          note: string | null
          pix_key: string
          pix_key_enc: string | null
          pix_key_type: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string
          scheduled_for: string
          status: string
          waiter_id: string
        }
        Insert: {
          amount: number
          blocked_until?: string | null
          cycle_end: string
          holder_name: string
          id?: string
          note?: string | null
          pix_key: string
          pix_key_enc?: string | null
          pix_key_type: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id: string
          scheduled_for: string
          status?: string
          waiter_id: string
        }
        Update: {
          amount?: number
          blocked_until?: string | null
          cycle_end?: string
          holder_name?: string
          id?: string
          note?: string | null
          pix_key?: string
          pix_key_enc?: string | null
          pix_key_type?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string
          scheduled_for?: string
          status?: string
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_withdrawals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_withdrawals_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "pdv_waiters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_table_ordering: {
        Args: { p_bill_session: string; p_code: string; p_slug: string; p_table: string }
        Returns: Json
      }
      close_table_ordering: {
        Args: { p_slug: string; p_table: string }
        Returns: undefined
      }
      open_table_ordering: {
        Args: { p_slug: string; p_table: string }
        Returns: Json
      }
      restaurant_has_module: {
        Args: { p_module: string; p_rid: string }
        Returns: boolean
      }
      set_restaurant_module: {
        Args: { p_actor: string | null; p_actor_kind: string; p_module: string; p_reason: string | null; p_rid: string; p_status: string }
        Returns: Json
      }
      table_ordering_block: {
        Args: { p_device: string | null; p_rid: string; p_table: string }
        Returns: string | null
      }
      archive_and_reopen_table: {
        Args: { p_slug: string; p_table: string }
        Returns: undefined
      }
      cash_close: {
        Args: {
          p_counted: number
          p_expected: number
          p_notes: string
          p_slug: string
        }
        Returns: undefined
      }
      cash_move: {
        Args: {
          p_amount: number
          p_kind: string
          p_reason: string
          p_slug: string
        }
        Returns: undefined
      }
      cash_open: { Args: { p_amount: number; p_slug: string }; Returns: string }
      claim_founder: { Args: never; Returns: boolean }
      finish_onboarding: { Args: { p_slug: string }; Returns: undefined }
      has_restaurant_role: {
        Args: {
          _restaurant_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_slug: {
        Args: { _slug: string; _user_id: string }
        Returns: boolean
      }
      is_restaurant_member: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      lebre_consume: {
        Args: { p_kind: string; p_scope: string }
        Returns: Json
      }
      next_payout_date: { Args: { p_after: string }; Returns: string }
      pdv_close_table: {
        Args: { p_slug: string; p_table: string }
        Returns: undefined
      }
      pdv_ingest_event: {
        Args: {
          p_adapter: string
          p_event: Json
          p_event_id: string
          p_restaurant: string
        }
        Returns: string
      }
      pdv_counter_cancel: {
        Args: { p_order: string; p_reason: string }
        Returns: undefined
      }
      pdv_counter_sale: {
        Args: {
          p_cash_received: number
          p_customer: string
          p_items: Json
          p_method: string
          p_request_id: string
          p_slug: string
        }
        Returns: Json
      }
      pdv_customer_order: {
        Args: {
          p_customer: string
          p_device?: string
          p_items: Json
          p_request_id: string
          p_slug: string
          p_table: string
        }
        Returns: Json
      }
      pdv_display_token: {
        Args: { p_rotate?: boolean; p_slug: string }
        Returns: string
      }
      pdv_launch_order: {
        Args: {
          p_items: Json
          p_slug: string
          p_table: string
          p_waiter: string
        }
        Returns: string
      }
      pdv_outbox_claim: {
        Args: { p_limit: number }
        Returns: {
          adapter: string
          amount: number
          attempts: number
          created_at: string
          id: string
          item_quantities: Json
          last_error: string | null
          locked_until: string | null
          next_attempt_at: string
          payment_id: string
          payment_method: string
          restaurant_id: string
          status: string
          table_number: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pdv_payment_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pdv_order_bump: {
        Args: { p_order: string; p_sector?: string; p_status: string }
        Returns: undefined
      }
      pdv_order_call: { Args: { p_order: string }; Returns: undefined }
      pdv_service_day: { Args: never; Returns: string }
      pdv_settle_totem_order: {
        Args: { p_cash_received: number; p_method: string; p_order: string }
        Returns: Json
      }
      pdv_totem_order: {
        Args: {
          p_customer: string
          p_items: Json
          p_request_id: string
          p_slug: string
        }
        Returns: Json
      }
      pdv_totem_token: {
        Args: { p_rotate?: boolean; p_slug: string }
        Returns: string
      }
      pdv_set_item_status: {
        Args: { p_item: string; p_status: string }
        Returns: undefined
      }
      pdv_transfer_table: {
        Args: { p_from: string; p_slug: string; p_to: string }
        Returns: undefined
      }
      pdv_void_item: {
        Args: {
          p_code: string
          p_qty: number
          p_reason: string
          p_slug: string
          p_table: string
        }
        Returns: undefined
      }
      pos_integration_set: {
        Args: {
          p_key_hash: string
          p_key_prefix: string
          p_provider: string
          p_slug: string
        }
        Returns: undefined
      }
      promote_pending_pix: {
        Args: { p_force?: boolean; p_waiter: string }
        Returns: boolean
      }
      provider_reverse_payment: {
        Args: { p_kind: string; p_order_id: string }
        Returns: string
      }
      provider_settle_payment: {
        Args: { p_order_id: string; p_paid: boolean }
        Returns: string
      }
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      record_payment_incident: {
        Args: { p_detail: string; p_kind: string; p_payment_id: string }
        Returns: string
      }
      register_table_payment: {
        Args: {
          p_amount: number
          p_customer_name: string
          p_idempotency_key: string
          p_item_quantities: Json
          p_payment_method: string
          p_payment_target: string
          p_restaurant_slug: string
          p_status: string
          p_table_number: string
        }
        Returns: string
      }
      resolve_payment_incident: {
        Args: { p_id: string; p_note: string }
        Returns: undefined
      }
      resolve_table_payment: {
        Args: { p_action: string; p_payment_id: string }
        Returns: undefined
      }
      restaurant_table_limit: { Args: { p_rid: string }; Returns: number }
      restaurant_access: { Args: { p_rid: string }; Returns: Json }
      restaurant_can_operate: { Args: { p_rid: string }; Returns: boolean }
      my_restaurant_access: { Args: { p_rid: string }; Returns: Json }
      signup_restaurant: {
        Args: {
          p_address: string
          p_cnpj: string
          p_display_name: string
          p_name: string
          p_phone: string
          p_plan: string
          p_slug: string
          p_tables: number
        }
        Returns: string
      }
      sync_bill_item_quantity_shadows: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      table_is_over_limit: {
        Args: { p_number: string; p_rid: string }
        Returns: boolean
      }
      tipe_cycle_start: { Args: { p_at?: string }; Returns: string }
      waiter_balance: {
        Args: { p_waiter: string }
        Returns: {
          available: number
          current_cycle: number
          withdrawn: number
        }[]
      }
      waiter_request_withdrawal: { Args: { p_waiter: string }; Returns: string }
      waive_service_fee: {
        Args: { p_reason: string; p_slug: string; p_table: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "founder" | "owner" | "manager" | "cashier" | "waiter"
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
      app_role: ["founder", "owner", "manager", "cashier", "waiter"],
    },
  },
} as const
