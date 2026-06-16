export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string
          phone: string | null
          avatar_url: string | null
          primary_role: 'buyer' | 'supplier' | 'commercial' | 'admin' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string
          full_name: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      plans: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          max_demands_monthly: number | null
          max_offers_monthly: number | null
          max_catalog_items: number
          match_priority: boolean
          price: number
          trial_days: number
          is_active: boolean
          sort_order: number
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'trialing' | 'active' | 'past_due' | 'canceled'
          asaas_subscription_id: string | null
          asaas_customer_id: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
        }
      }
      usage_counters: {
        Row: {
          id: string
          user_id: string
          counter_type: 'demands_published' | 'offers_sent'
          period_year: number
          period_month: number
          count: number
        }
      }
      categories: {
        Row: {
          id: string
          parent_id: string | null
          name: string
          slug: string
          description: string | null
          sort_order: number
          is_active: boolean
        }
      }
      companies: {
        Row: {
          id: string
          cnpj: string
          razao_social: string
          nome_fantasia: string | null
          situacao: string | null
          cidade: string
          uf: string
          logradouro: string | null
          numero: string | null
          bairro: string | null
          cep: string | null
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['companies']['Row']>
      }
      buyer_profiles: {
        Row: {
          user_id: string
          company_id: string | null
          city: string | null
          uf: string | null
          avg_rating: number
          total_ratings: number
          orders_completed: number
        }
      }
      supplier_profiles: {
        Row: {
          user_id: string
          company_id: string
          status: 'pendente' | 'em_revisao' | 'aprovado' | 'recusado'
          service_city: string | null
          service_uf: string | null
          service_radius_km: number
          rejection_reason: string | null
          verified_at: string | null
          avg_rating: number
          total_ratings: number
        }
        Insert: Partial<Database['public']['Tables']['supplier_profiles']['Row']> & {
          user_id: string
          company_id: string
        }
        Update: Partial<Database['public']['Tables']['supplier_profiles']['Row']>
      }
      documents: {
        Row: {
          id: string
          supplier_id: string
          document_type: 'cnpj_card' | 'address_proof' | 'other'
          storage_path: string
          file_name: string
          mime_type: string
          review_status: 'pendente' | 'aprovado' | 'recusado'
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'review_status'> & {
          id?: string
          review_status?: 'pendente' | 'aprovado' | 'recusado'
        }
      }
      supplier_categories: {
        Row: { supplier_id: string; category_id: string }
        Insert: { supplier_id: string; category_id: string }
      }
      products: {
        Row: {
          id: string
          supplier_id: string
          category_id: string
          nome: string
          sku: string | null
          descricao: string | null
          marca: string | null
          preco_referencia: number | null
          image_url: string | null
          cidade: string
          uf: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }
      demands: {
        Row: {
          id: string
          buyer_id: string
          category_id: string
          titulo: string
          descricao: string
          quantidade: number
          unidade: string
          cidade: string
          uf: string
          raio_km: number
          status: 'RASCUNHO' | 'PUBLICADA' | 'OFERTAS_RECEBIDAS' | 'EM_NEGOCIACAO' | 'PROPOSTA_ACEITA' | 'CANCELADO' | 'EXPIRADO'
          prazo_desejado: string | null
          observacoes: string | null
          preco_referencia_mercado: number | null
          published_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['demands']['Row'], 'id' | 'status'> & {
          id?: string
          status?: Database['public']['Tables']['demands']['Row']['status']
        }
        Update: Partial<Database['public']['Tables']['demands']['Row']>
      }
      demand_matches: {
        Row: {
          id: string
          demand_id: string
          supplier_id: string
          score: number
          status: 'notified' | 'viewed' | 'offer_sent' | 'dismissed'
          notified_at: string
          viewed_at: string | null
          created_at: string
        }
        Update: Partial<Database['public']['Tables']['demand_matches']['Row']>
      }
      offers: {
        Row: {
          id: string
          demand_id: string
          supplier_id: string
          valor: number
          prazo_entrega_dias: number
          validade_dias: number
          validade_ate: string
          quantidade: number
          mensagem: string | null
          status: 'enviada' | 'aceita' | 'rejeitada' | 'expirada' | 'cancelada'
          source: 'manual' | 'auto'
          contact_revealed: boolean
          contact_revealed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'status' | 'contact_revealed' | 'contact_revealed_at' | 'validade_ate'> & {
          id?: string
          validade_ate?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Row']>
      }
      supplier_auto_offer_settings: {
        Row: {
          supplier_id: string
          enabled: boolean
          discount_percent: number
          min_demand_quantity: number
          max_demand_quantity: number | null
          delivery_days: number
          validity_days: number
          default_message: string | null
          category_ids: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['supplier_auto_offer_settings']['Row'],
          'created_at' | 'updated_at'
        > & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['supplier_auto_offer_settings']['Row']>
      }
      supplier_auto_offer_logs: {
        Row: {
          id: string
          supplier_id: string
          demand_id: string
          status: 'sent' | 'skipped' | 'failed'
          reason: string
          offer_id: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['supplier_auto_offer_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['supplier_auto_offer_logs']['Row']>
      }
      offer_messages: {
        Row: {
          id: string
          demand_id: string
          offer_id: string | null
          supplier_id: string
          sender_id: string
          recipient_id: string
          body: string
          attachment_path: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['offer_messages']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
      }
      orders: {
        Row: {
          id: string
          demand_id: string
          offer_id: string
          buyer_id: string
          supplier_id: string
          status: 'PROPOSTA_ACEITA' | 'AGUARDANDO_CONFIRMACAO_EXTERNA' | 'PAGAMENTO_INFORMADO' | 'ENVIO_INFORMADO' | 'ENTREGUE' | 'CONCLUIDO' | 'CANCELADO' | 'EXPIRADO'
          cancel_reason: string | null
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'status'> & {
          id?: string
          status?: Database['public']['Tables']['orders']['Row']['status']
        }
        Update: Partial<Database['public']['Tables']['orders']['Row']>
      }
      order_status_logs: {
        Row: {
          id: string
          order_id: string
          from_status: Database['public']['Tables']['orders']['Row']['status'] | null
          to_status: Database['public']['Tables']['orders']['Row']['status']
          notes: string | null
          created_at: string
        }
      }
      order_sla_deadlines: {
        Row: {
          id: string
          order_id: string
          action: 'inform_payment' | 'inform_shipping' | 'confirm_delivery' | 'confirm_completion'
          responsible_user_id: string
          deadline_at: string
          status: 'pending' | 'completed' | 'expired'
        }
      }
      ratings: {
        Row: {
          id: string
          order_id: string
          rater_id: string
          rated_id: string
          score: number
          comment: string | null
        }
        Insert: Omit<Database['public']['Tables']['ratings']['Row'], 'id'> & { id?: string; rater_role: string }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          data: Json
          group_key: string | null
          read_at: string | null
          created_at: string
        }
        Update: { read_at?: string | null }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & { id?: string }
      }
      crm_leads: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          source: string
          profile_type: string | null
          lgpd_consent: boolean
          lgpd_consent_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['crm_leads']['Row'], 'id' | 'created_at' | 'source'> & {
          id?: string
          source?: string
        }
      }
    }
    Views: {
      v_offers_public: {
        Row: {
          id: string
          demand_id: string
          supplier_id: string
          valor: number
          prazo_entrega_dias: number
          quantidade: number
          mensagem: string | null
          status: string
          contact_revealed: boolean
          supplier_name: string | null
          supplier_avg_rating: number | null
          supplier_total_ratings: number | null
          supplier_phone: string | null
          supplier_email: string | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
