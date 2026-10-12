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
          created_at: string
          created_by: string | null
          id: string
          restaurant_id: string
          table_number: string
          waiter_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          restaurant_id: string
          table_number: string
          waiter_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          restaurant_id?: string
          table_number?: string
          waiter_id?: string | null
        }
        Relationships: [
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
          created_at: string
          current_period_end: string | null
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
          created_at?: string
          current_period_end?: string | null
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
          created_at?: string
          current_period_end?: string | null
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
          id: string
          name: string
          onboarding_step: string
          opening_hours: string | null
          phone: string | null
          pos_mode: string
          pos_provider: string
          service_rate: number
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bill_payment_methods?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          onboarding_step?: string
          opening_hours?: string | null
          phone?: string | null
          pos_mode?: string
          pos_provider?: string
          service_rate?: number
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bill_payment_methods?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_step?: string
          opening_hours?: string | null
          phone?: string | null
          pos_mode?: string
          pos_provider?: string
          service_rate?: number
          slug?: string
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
      pdv_launch_order: {
        Args: {
          p_items: Json
          p_slug: string
          p_table: string
          p_waiter: string
        }
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
      provider_settle_payment: {
        Args: { p_order_id: string; p_paid: boolean }
        Returns: string
      }
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
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
      resolve_table_payment: {
        Args: { p_action: string; p_payment_id: string }
        Returns: undefined
      }
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
    }
    Enums: {
      app_role: "founder" | "owner" | "cashier" | "waiter"
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
      app_role: ["founder", "owner", "cashier", "waiter"],
    },
  },
} as const
