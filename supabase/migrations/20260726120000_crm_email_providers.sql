-- CRM leads expansion + email multi-provider foundation

-- ---------------------------------------------------------------------------
-- 1. CRM leads
-- ---------------------------------------------------------------------------
create type public.crm_lead_status as enum (
  'novo',
  'contatado',
  'qualificado',
  'convertido',
  'descartado'
);

alter table public.crm_leads
  add column if not exists status public.crm_lead_status not null default 'novo',
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists invite_token text,
  add column if not exists invite_sent_at timestamptz,
  add column if not exists converted_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists nurture_sent_at timestamptz,
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_crm_leads_invite_token
  on public.crm_leads (invite_token)
  where invite_token is not null;

create unique index if not exists idx_crm_leads_unsubscribe_token
  on public.crm_leads (unsubscribe_token);

create index if not exists idx_crm_leads_status on public.crm_leads (status);
create index if not exists idx_crm_leads_created_at on public.crm_leads (created_at desc);

drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
create trigger crm_leads_set_updated_at
  before update on public.crm_leads
  for each row execute function public.set_updated_at();

drop policy if exists crm_leads_select on public.crm_leads;
create policy crm_leads_select on public.crm_leads
  for select to authenticated
  using (public.is_admin());

drop policy if exists crm_leads_update on public.crm_leads;
create policy crm_leads_update on public.crm_leads
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Email providers / templates / sends
-- ---------------------------------------------------------------------------
create type public.email_provider_kind as enum ('smtp', 'http_api');
create type public.email_provider_status as enum ('active', 'planned', 'disabled');
create type public.email_template_category as enum ('crm', 'transactional');
create type public.email_send_status as enum ('queued', 'sent', 'failed');

create table if not exists public.email_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind public.email_provider_kind not null,
  is_enabled boolean not null default false,
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  secrets_ref text,
  status public.email_provider_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_email_providers_one_default
  on public.email_providers ((is_default))
  where is_default = true;

create trigger email_providers_set_updated_at
  before update on public.email_providers
  for each row execute function public.set_updated_at();

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category public.email_template_category not null,
  subject text not null,
  html_body text not null,
  text_body text,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  to_email text not null,
  lead_id uuid references public.crm_leads (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  provider_slug text not null,
  status public.email_send_status not null default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_sends_created on public.email_sends (created_at desc);
create index if not exists idx_email_sends_lead on public.email_sends (lead_id);

alter table public.email_providers enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_sends enable row level security;

create policy email_providers_select on public.email_providers
  for select to authenticated
  using (public.is_admin());

create policy email_providers_update on public.email_providers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy email_templates_select on public.email_templates
  for select to authenticated
  using (public.is_admin());

create policy email_templates_update on public.email_templates
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy email_sends_select on public.email_sends
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Seeds — providers
-- ---------------------------------------------------------------------------
insert into public.email_providers (slug, name, kind, is_enabled, is_default, config, secrets_ref, status)
values
  (
    'hostinger_smtp',
    'Hostinger SMTP',
    'smtp',
    true,
    true,
    jsonb_build_object(
      'host', 'smtp.hostinger.com',
      'port', 465,
      'from_email', 'noreply@xcomerce.com.br',
      'from_name', 'XCOMERCE'
    ),
    'SMTP_*',
    'active'
  ),
  (
    'brevo',
    'Brevo',
    'http_api',
    false,
    false,
    jsonb_build_object('api_base_url', 'https://api.brevo.com/v3'),
    'BREVO_API_KEY',
    'planned'
  ),
  (
    'resend',
    'Resend',
    'http_api',
    false,
    false,
    jsonb_build_object('api_base_url', 'https://api.resend.com'),
    'RESEND_API_KEY',
    'planned'
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Seeds — templates (CRM + transactional)
-- ---------------------------------------------------------------------------
insert into public.email_templates (key, name, category, subject, html_body, variables)
values
(
  'crm_lead_welcome',
  'CRM — Boas-vindas lead',
  'crm',
  'Recebemos seu contato — XCOMERCE',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Olá {{name}}!</h1><p>Obrigado pelo interesse na XCOMERCE. Nossa equipe comercial retorna em breve.</p><p style="margin-top:32px;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}">Cancelar e-mails</a></p></body></html>',
  '["name","email","profile_type","unsubscribe_url"]'::jsonb
),
(
  'crm_lead_invite',
  'CRM — Convite cadastro',
  'crm',
  'Seu convite para criar conta na XCOMERCE',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Olá {{name}}!</h1><p>Você foi convidado(a) a criar sua conta na XCOMERCE.</p><p style="margin-top:24px"><a href="{{invite_url}}" style="background:#222889;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Criar conta</a></p><p style="margin-top:32px;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}">Cancelar e-mails</a></p></body></html>',
  '["name","email","invite_url","profile_type","unsubscribe_url"]'::jsonb
),
(
  'crm_lead_nurture_d3',
  'CRM — Nurture D+3',
  'crm',
  'Ainda dá tempo de conhecer a XCOMERCE',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Oi {{name}},</h1><p>Passando para lembrar: na XCOMERCE você publica pedidos e recebe propostas de fornecedores verificados.</p><p style="margin-top:24px"><a href="{{invite_url}}" style="background:#222889;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Começar agora</a></p><p style="margin-top:32px;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}">Cancelar e-mails</a></p></body></html>',
  '["name","email","invite_url","unsubscribe_url"]'::jsonb
),
(
  'demand_matched',
  'Demanda compatível',
  'transactional',
  'Nova oportunidade de demanda',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Nova demanda compatível</h1><p>Olá {{supplier_name}},</p><p>Uma nova demanda foi publicada: <strong>{{demand_title}}</strong> ({{demand_city}}).</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Ver no board</a></p></body></html>',
  '["supplier_name","demand_title","demand_city","action_url"]'::jsonb
),
(
  'offer_received',
  'Proposta recebida',
  'transactional',
  'Nova proposta na sua demanda',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Proposta recebida</h1><p>Olá {{buyer_name}},</p><p>Você recebeu <strong>{{offer_count}}</strong> proposta(s) na demanda "{{demand_title}}".</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["buyer_name","offer_count","demand_title","action_url"]'::jsonb
),
(
  'chat_message',
  'Nova mensagem',
  'transactional',
  'Nova mensagem — {{demand_title}}',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Nova mensagem</h1><p><strong>{{sender_name}}</strong> enviou uma mensagem sobre "{{demand_title}}":</p><blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#4b5563">{{preview}}</blockquote><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["sender_name","demand_title","preview","action_url"]'::jsonb
),
(
  'order_status_changed',
  'Status do pedido',
  'transactional',
  'Pedido {{order_id}} — status atualizado',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Status do pedido atualizado</h1><p>O pedido <strong>{{order_id}}</strong> mudou para: <strong>{{new_status}}</strong>.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["order_id","new_status","action_url"]'::jsonb
),
(
  'sla_reminder',
  'Lembrete SLA',
  'transactional',
  'Lembrete de prazo SLA',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Prazo SLA se aproximando</h1><p>O pedido <strong>{{order_id}}</strong> exige a ação <strong>{{action_name}}</strong> até {{deadline_at}}.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["order_id","action_name","deadline_at","action_url"]'::jsonb
),
(
  'sla_expired',
  'SLA expirado',
  'transactional',
  'Prazo SLA expirado',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">SLA expirado</h1><p>O prazo para <strong>{{action_name}}</strong> no pedido <strong>{{order_id}}</strong> expirou.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["order_id","action_name","action_url"]'::jsonb
),
(
  'supplier_approved',
  'Fornecedor aprovado',
  'transactional',
  'Cadastro aprovado — XCOMERCE',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Parabéns, você foi aprovado!</h1><p>Olá {{supplier_name}}, seu cadastro de fornecedor foi aprovado.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["supplier_name","action_url"]'::jsonb
),
(
  'supplier_rejected',
  'Fornecedor recusado',
  'transactional',
  'Atualização do seu cadastro',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Cadastro não aprovado</h1><p>Olá {{supplier_name}}, infelizmente seu cadastro não foi aprovado.</p><p><strong>Motivo:</strong> {{reason}}</p></body></html>',
  '["supplier_name","reason"]'::jsonb
),
(
  'subscription_activated',
  'Assinatura ativada',
  'transactional',
  'Assinatura ativada',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Assinatura ativa</h1><p>Seu plano <strong>{{plan_name}}</strong> está ativo.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["plan_name","action_url"]'::jsonb
),
(
  'subscription_past_due',
  'Assinatura em atraso',
  'transactional',
  'Pagamento em atraso',
  '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Assinatura em atraso</h1><p>O pagamento do plano <strong>{{plan_name}}</strong> está em atraso.</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>',
  '["plan_name","action_url"]'::jsonb
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Invite helpers (SECURITY DEFINER — register público precisa ler/consumir)
-- ---------------------------------------------------------------------------
create or replace function public.get_lead_by_invite_token(p_token text)
returns setof public.crm_leads
language sql
security definer
set search_path = public
as $$
  select *
  from public.crm_leads
  where invite_token = p_token
  limit 1;
$$;

create or replace function public.consume_lead_invite(p_token text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return;
  end if;
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'FORBIDDEN';
  end if;

  update public.crm_leads
  set
    status = 'convertido',
    converted_user_id = p_user_id,
    updated_at = now()
  where invite_token = p_token
    and (converted_user_id is null or converted_user_id = p_user_id);
end;
$$;

revoke all on function public.get_lead_by_invite_token(text) from public;
revoke all on function public.consume_lead_invite(text, uuid) from public;
grant execute on function public.get_lead_by_invite_token(text) to anon, authenticated;
grant execute on function public.consume_lead_invite(text, uuid) to authenticated;
