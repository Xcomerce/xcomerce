-- Keve Marketplace B2B — Init schema (estrutura apenas, sem RLS)
-- Ref: docs/SCHEMA.md

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'buyer',
  'supplier',
  'commercial',
  'admin'
);

create type public.supplier_status as enum (
  'pendente',
  'em_revisao',
  'aprovado',
  'recusado'
);

create type public.demand_status as enum (
  'RASCUNHO',
  'PUBLICADA',
  'OFERTAS_RECEBIDAS',
  'EM_NEGOCIACAO',
  'PROPOSTA_ACEITA',
  'CANCELADO',
  'EXPIRADO'
);

create type public.offer_status as enum (
  'enviada',
  'aceita',
  'rejeitada',
  'expirada',
  'cancelada'
);

create type public.order_status as enum (
  'PROPOSTA_ACEITA',
  'AGUARDANDO_CONFIRMACAO_EXTERNA',
  'PAGAMENTO_INFORMADO',
  'ENVIO_INFORMADO',
  'ENTREGUE',
  'CONCLUIDO',
  'CANCELADO',
  'EXPIRADO'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled'
);

create type public.document_type as enum (
  'cnpj_card',
  'address_proof',
  'other'
);

create type public.document_review_status as enum (
  'pendente',
  'aprovado',
  'recusado'
);

create type public.order_attachment_type as enum (
  'payment_proof',
  'tracking_info',
  'other'
);

create type public.sla_action as enum (
  'inform_payment',
  'inform_shipping',
  'confirm_delivery',
  'confirm_completion'
);

create type public.sla_status as enum (
  'pending',
  'completed',
  'expired'
);

create type public.match_status as enum (
  'notified',
  'viewed',
  'offer_sent',
  'dismissed'
);

create type public.usage_counter_type as enum (
  'demands_published',
  'offers_sent'
);

create type public.reputation_event_type as enum (
  'sla_missed',
  'order_canceled',
  'order_completed',
  'positive_rating',
  'negative_rating'
);

create type public.device_type as enum (
  'ios',
  'android',
  'web'
);

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Identidade & RBAC
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null,
  phone text,
  avatar_url text,
  primary_role public.user_role,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_email on public.profiles (email) where email is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index idx_user_roles_role on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- 2. Empresas & perfis comprador/fornecedor
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj char(14) not null,
  razao_social text not null,
  nome_fantasia text,
  situacao text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text not null,
  uf char(2) not null,
  cep char(8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_cnpj_unique unique (cnpj),
  constraint companies_cnpj_digits check (cnpj ~ '^[0-9]{14}$')
);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.buyer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  city text,
  uf char(2),
  avg_rating numeric(3, 2) not null default 0,
  total_ratings integer not null default 0,
  orders_completed integer not null default 0,
  cancel_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger buyer_profiles_set_updated_at
  before update on public.buyer_profiles
  for each row execute function public.set_updated_at();

create table public.supplier_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  status public.supplier_status not null default 'pendente',
  verified_at timestamptz,
  service_city text,
  service_uf char(2),
  service_radius_km integer not null default 50,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  rejection_reason text,
  avg_rating numeric(3, 2) not null default 0,
  total_ratings integer not null default 0,
  orders_completed integer not null default 0,
  cancel_count integer not null default 0,
  response_rate numeric(5, 2) not null default 0,
  sla_compliance_rate numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_profiles_company_unique unique (company_id)
);

create trigger supplier_profiles_set_updated_at
  before update on public.supplier_profiles
  for each row execute function public.set_updated_at();

create index idx_supplier_profiles_status on public.supplier_profiles (status);
create index idx_supplier_profiles_geo on public.supplier_profiles (service_uf, service_city);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  document_type public.document_type not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer,
  review_status public.document_review_status not null default 'pendente',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create index idx_documents_supplier on public.documents (supplier_id);
create index idx_documents_review on public.documents (review_status);

-- ---------------------------------------------------------------------------
-- 3. Catálogo
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_unique unique (slug)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index idx_categories_parent on public.categories (parent_id);

create table public.supplier_categories (
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (supplier_id, category_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  nome text not null,
  sku text,
  descricao text,
  marca text,
  preco_referencia numeric(12, 2),
  image_url text,
  cidade text not null,
  uf char(2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index idx_products_supplier on public.products (supplier_id);
create index idx_products_category on public.products (category_id);
create index idx_products_active on public.products (supplier_id, is_active);
create unique index idx_products_supplier_sku_unique on public.products (supplier_id, sku)
  where sku is not null;

-- ---------------------------------------------------------------------------
-- 4. Billing (planos & assinaturas)
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  max_demands_monthly integer,
  max_offers_monthly integer,
  max_catalog_items integer not null,
  match_priority boolean not null default false,
  price numeric(10, 2) not null default 0,
  trial_days integer not null default 0,
  asaas_plan_id text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_code_unique unique (code)
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'active',
  asaas_subscription_id text,
  asaas_customer_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_unique unique (user_id),
  constraint subscriptions_asaas_sub_unique unique (asaas_subscription_id)
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index idx_subscriptions_status on public.subscriptions (status);
create index idx_subscriptions_plan on public.subscriptions (plan_id);
create index idx_subscriptions_asaas_customer on public.subscriptions (asaas_customer_id)
  where asaas_customer_id is not null;

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  counter_type public.usage_counter_type not null,
  period_year smallint not null,
  period_month smallint not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_counters_period_check check (period_month between 1 and 12),
  constraint usage_counters_unique unique (user_id, counter_type, period_year, period_month)
);

create trigger usage_counters_set_updated_at
  before update on public.usage_counters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Demandas & match
-- ---------------------------------------------------------------------------
create table public.demands (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyer_profiles (user_id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  titulo text not null,
  descricao text not null,
  quantidade integer not null,
  unidade text not null default 'un',
  cidade text not null,
  uf char(2) not null,
  raio_km integer not null default 50,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  prazo_desejado date,
  observacoes text,
  status public.demand_status not null default 'RASCUNHO',
  published_at timestamptz,
  match_processed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demands_quantidade_positive check (quantidade > 0),
  constraint demands_raio_positive check (raio_km > 0)
);

create trigger demands_set_updated_at
  before update on public.demands
  for each row execute function public.set_updated_at();

create index idx_demands_buyer on public.demands (buyer_id);
create index idx_demands_status on public.demands (status);
create index idx_demands_category on public.demands (category_id);
create index idx_demands_geo on public.demands (uf, cidade);
create index idx_demands_published on public.demands (published_at desc) where status = 'PUBLICADA';

create table public.demand_attachments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer,
  created_at timestamptz not null default now()
);

create index idx_demand_attachments_demand on public.demand_attachments (demand_id);

create table public.demand_matches (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  score integer not null default 0,
  status public.match_status not null default 'notified',
  notified_at timestamptz not null default now(),
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint demand_matches_unique unique (demand_id, supplier_id)
);

create index idx_demand_matches_supplier on public.demand_matches (supplier_id);
create index idx_demand_matches_demand on public.demand_matches (demand_id);
create index idx_demand_matches_supplier_status on public.demand_matches (supplier_id, status);

-- ---------------------------------------------------------------------------
-- 6. Propostas & chat
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  valor numeric(12, 2) not null,
  prazo_entrega_dias integer not null,
  validade_dias integer not null default 7,
  validade_ate timestamptz not null,
  quantidade integer not null,
  mensagem text,
  status public.offer_status not null default 'enviada',
  contact_revealed boolean not null default false,
  contact_revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_valor_positive check (valor >= 0),
  constraint offers_prazo_positive check (prazo_entrega_dias > 0),
  constraint offers_validade_positive check (validade_dias > 0),
  constraint offers_quantidade_positive check (quantidade > 0)
);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- Apenas 1 proposta ativa por fornecedor/demanda (permite reenvio após expirada/cancelada)
create unique index idx_offers_active_supplier_demand on public.offers (demand_id, supplier_id)
  where status in ('enviada', 'aceita');

create index idx_offers_demand on public.offers (demand_id);
create index idx_offers_supplier on public.offers (supplier_id);
create index idx_offers_status on public.offers (status);

create table public.offer_messages (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  attachment_path text,
  blocked_by_filter boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint offer_messages_no_self check (sender_id <> recipient_id)
);

create index idx_offer_messages_thread on public.offer_messages (demand_id, supplier_id, created_at);
create index idx_offer_messages_demand on public.offer_messages (demand_id, created_at);
create index idx_offer_messages_offer on public.offer_messages (offer_id);
create index idx_offer_messages_recipient_unread on public.offer_messages (recipient_id, read_at)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- 7. Pedidos, SLA & anexos
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete restrict,
  offer_id uuid not null references public.offers (id) on delete restrict,
  buyer_id uuid not null references public.buyer_profiles (user_id) on delete restrict,
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete restrict,
  status public.order_status not null default 'PROPOSTA_ACEITA',
  cancel_reason text,
  canceled_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_offer_unique unique (offer_id),
  constraint orders_demand_unique unique (demand_id)
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index idx_orders_buyer on public.orders (buyer_id);
create index idx_orders_supplier on public.orders (supplier_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_demand on public.orders (demand_id);

create table public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_order_status_logs_order on public.order_status_logs (order_id, created_at);

create table public.order_sla_deadlines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  action public.sla_action not null,
  responsible_user_id uuid not null references public.profiles (id) on delete cascade,
  deadline_at timestamptz not null,
  status public.sla_status not null default 'pending',
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger order_sla_deadlines_set_updated_at
  before update on public.order_sla_deadlines
  for each row execute function public.set_updated_at();

create index idx_order_sla_pending on public.order_sla_deadlines (status, deadline_at)
  where status = 'pending';

create table public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  attachment_type public.order_attachment_type not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  tracking_code text,
  tracking_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_order_attachments_order on public.order_attachments (order_id);

-- ---------------------------------------------------------------------------
-- 8. Reputação
-- ---------------------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_id uuid not null references public.profiles (id) on delete cascade,
  rater_role public.user_role not null,
  score smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_score_range check (score between 1 and 5),
  constraint ratings_comment_length check (char_length(comment) <= 500),
  constraint ratings_unique_per_rater unique (order_id, rater_id),
  constraint ratings_no_self check (rater_id <> rated_id)
);

create index idx_ratings_rated on public.ratings (rated_id);

create table public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  event_type public.reputation_event_type not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_reputation_events_user on public.reputation_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Notificações
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  group_key text,
  group_count integer not null default 1,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread on public.notifications (user_id, created_at desc)
  where read_at is null;
create index idx_notifications_group on public.notifications (user_id, group_key)
  where group_key is not null;

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_type)
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Admin, leads & infra
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index idx_audit_logs_actor on public.audit_logs (actor_id, created_at desc);

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  source text not null default 'landing',
  profile_type text,
  lgpd_consent boolean not null default false,
  lgpd_consent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint crm_leads_profile_type_check check (
    profile_type is null or profile_type in ('buyer', 'supplier')
  ),
  constraint crm_leads_lgpd_consent_required check (
    lgpd_consent = false or lgpd_consent_at is not null
  )
);

create index idx_crm_leads_email on public.crm_leads (email);

create table public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  device_type public.device_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_token_unique unique (token)
);

create trigger user_push_tokens_set_updated_at
  before update on public.user_push_tokens
  for each row execute function public.set_updated_at();

create index idx_user_push_tokens_user on public.user_push_tokens (user_id)
  where is_active = true;

create table public.cnpj_cache (
  cnpj char(14) primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  constraint cnpj_cache_digits check (cnpj ~ '^[0-9]{14}$')
);

create table public.idempotency_keys (
  key text primary key,
  scope text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_idempotency_expires on public.idempotency_keys (expires_at);

-- V2: fluxos configuráveis no admin
create table public.workflow_configs (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  config jsonb not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_configs_code_unique unique (code)
);

create trigger workflow_configs_set_updated_at
  before update on public.workflow_configs
  for each row execute function public.set_updated_at();
