-- Keve Marketplace B2B — Row Level Security
-- Ref: docs/SCHEMA.md · docs/ARQUITETURA.md §5.2

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — evitam recursão em user_roles)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.has_role(p_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = p_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role in ('admin', 'commercial')
  );
$$;

create or replace function public.is_demand_buyer(p_demand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.demands d
    where d.id = p_demand_id
      and d.buyer_id = (select auth.uid())
  );
$$;

create or replace function public.is_demand_matched_supplier(p_demand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.demand_matches dm
    where dm.demand_id = p_demand_id
      and dm.supplier_id = (select auth.uid())
  );
$$;

create or replace function public.is_demand_participant(p_demand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_demand_buyer(p_demand_id)
    or public.is_demand_matched_supplier(p_demand_id)
    or exists (
      select 1
      from public.offers o
      where o.demand_id = p_demand_id
        and o.supplier_id = (select auth.uid())
    );
$$;

create or replace function public.is_order_participant(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.buyer_id = (select auth.uid())
        or o.supplier_id = (select auth.uid())
      )
  );
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_profile_id = (select auth.uid())
    or public.is_staff()
    or exists (
      select 1
      from public.supplier_profiles sp
      where sp.user_id = p_profile_id
        and sp.status = 'aprovado'
    )
    or exists (
      select 1
      from public.orders o
      where (
        o.buyer_id = (select auth.uid()) and o.supplier_id = p_profile_id
      ) or (
        o.supplier_id = (select auth.uid()) and o.buyer_id = p_profile_id
      )
    )
    or exists (
      select 1
      from public.demands d
      join public.offers o on o.demand_id = d.id
      where d.buyer_id = (select auth.uid())
        and o.supplier_id = p_profile_id
    )
    or exists (
      select 1
      from public.demand_matches dm
      join public.demands d on d.id = dm.demand_id
      where dm.supplier_id = (select auth.uid())
        and d.buyer_id = p_profile_id
    );
$$;

create or replace function public.can_view_supplier_contact(p_supplier_id uuid, p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.offers o
    join public.demands d on d.id = o.demand_id
    where o.id = p_offer_id
      and o.supplier_id = p_supplier_id
      and o.contact_revealed = true
      and d.buyer_id = (select auth.uid())
  )
  or public.is_staff();
$$;

create or replace function public.owns_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.buyer_profiles bp
    where bp.user_id = (select auth.uid())
      and bp.company_id = p_company_id
  )
  or exists (
    select 1
    from public.supplier_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.company_id = p_company_id
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.has_role(public.user_role) from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_demand_buyer(uuid) from public;
revoke all on function public.is_demand_matched_supplier(uuid) from public;
revoke all on function public.is_demand_participant(uuid) from public;
revoke all on function public.is_order_participant(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.can_view_supplier_contact(uuid, uuid) from public;
revoke all on function public.owns_company(uuid) from public;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.has_role(public.user_role) to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_demand_buyer(uuid) to authenticated, anon;
grant execute on function public.is_demand_matched_supplier(uuid) to authenticated, anon;
grant execute on function public.is_demand_participant(uuid) to authenticated, anon;
grant execute on function public.is_order_participant(uuid) to authenticated, anon;
grant execute on function public.can_view_profile(uuid) to authenticated, anon;
grant execute on function public.can_view_supplier_contact(uuid, uuid) to authenticated, anon;
grant execute on function public.owns_company(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- View: propostas com contato mascarado (Reveal Contact)
-- ---------------------------------------------------------------------------
create or replace view public.v_offers_public
with (security_invoker = true)
as
select
  o.id,
  o.demand_id,
  o.supplier_id,
  o.valor,
  o.prazo_entrega_dias,
  o.validade_dias,
  o.validade_ate,
  o.quantidade,
  o.mensagem,
  o.status,
  o.contact_revealed,
  o.contact_revealed_at,
  o.created_at,
  o.updated_at,
  p.full_name as supplier_name,
  sp.avg_rating as supplier_avg_rating,
  sp.total_ratings as supplier_total_ratings,
  sp.status as supplier_status,
  case
    when public.can_view_supplier_contact(o.supplier_id, o.id) then p.phone
    else null
  end as supplier_phone,
  case
    when public.can_view_supplier_contact(o.supplier_id, o.id) then p.email
    else null
  end as supplier_email
from public.offers o
join public.supplier_profiles sp on sp.user_id = o.supplier_id
join public.profiles p on p.id = o.supplier_id;

grant select on public.v_offers_public to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.documents enable row level security;
alter table public.categories enable row level security;
alter table public.supplier_categories enable row level security;
alter table public.products enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.demands enable row level security;
alter table public.demand_attachments enable row level security;
alter table public.demand_matches enable row level security;
alter table public.offers enable row level security;
alter table public.offer_messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_logs enable row level security;
alter table public.order_sla_deadlines enable row level security;
alter table public.order_attachments enable row level security;
alter table public.ratings enable row level security;
alter table public.reputation_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;
alter table public.crm_leads enable row level security;
alter table public.user_push_tokens enable row level security;
alter table public.cnpj_cache enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.workflow_configs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.can_view_profile(id));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

create policy user_roles_admin_insert on public.user_roles
  for insert to authenticated
  with check (public.is_admin());

create policy user_roles_admin_delete on public.user_roles
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create policy companies_select on public.companies
  for select to authenticated
  using (
    public.owns_company(id)
    or public.is_staff()
    or exists (
      select 1
      from public.supplier_profiles sp
      where sp.company_id = companies.id
        and sp.status = 'aprovado'
    )
  );

create policy companies_insert on public.companies
  for insert to authenticated
  with check (true);

create policy companies_update on public.companies
  for update to authenticated
  using (public.owns_company(id) or public.is_admin())
  with check (public.owns_company(id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- buyer_profiles
-- ---------------------------------------------------------------------------
create policy buyer_profiles_select on public.buyer_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_staff()
    or exists (
      select 1
      from public.orders o
      where o.buyer_id = buyer_profiles.user_id
        and o.supplier_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.demands d
      join public.offers o on o.demand_id = d.id
      where d.buyer_id = buyer_profiles.user_id
        and o.supplier_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.demands d
      join public.demand_matches dm on dm.demand_id = d.id
      where d.buyer_id = buyer_profiles.user_id
        and dm.supplier_id = (select auth.uid())
    )
  );

create policy buyer_profiles_insert on public.buyer_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy buyer_profiles_update on public.buyer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- supplier_profiles
-- ---------------------------------------------------------------------------
create policy supplier_profiles_select on public.supplier_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_staff()
    or status = 'aprovado'
    or exists (
      select 1
      from public.demand_matches dm
      join public.demands d on d.id = dm.demand_id
      where dm.supplier_id = supplier_profiles.user_id
        and d.buyer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.offers o
      join public.demands d on d.id = o.demand_id
      where o.supplier_id = supplier_profiles.user_id
        and d.buyer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.orders o
      where o.supplier_id = supplier_profiles.user_id
        and o.buyer_id = (select auth.uid())
    )
  );

create policy supplier_profiles_insert on public.supplier_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy supplier_profiles_update_owner on public.supplier_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy supplier_profiles_update_admin on public.supplier_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create policy documents_select on public.documents
  for select to authenticated
  using (supplier_id = (select auth.uid()) or public.is_staff());

create policy documents_insert on public.documents
  for insert to authenticated
  with check (supplier_id = (select auth.uid()));

create policy documents_update_supplier on public.documents
  for update to authenticated
  using (supplier_id = (select auth.uid()))
  with check (supplier_id = (select auth.uid()));

create policy documents_update_admin on public.documents
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create policy categories_select on public.categories
  for select to authenticated, anon
  using (is_active = true or public.is_staff());

create policy categories_admin_all on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- supplier_categories
-- ---------------------------------------------------------------------------
create policy supplier_categories_select on public.supplier_categories
  for select to authenticated
  using (
    supplier_id = (select auth.uid())
    or public.is_staff()
    or exists (
      select 1
      from public.supplier_profiles sp
      where sp.user_id = supplier_categories.supplier_id
        and sp.status = 'aprovado'
    )
  );

create policy supplier_categories_insert on public.supplier_categories
  for insert to authenticated
  with check (supplier_id = (select auth.uid()));

create policy supplier_categories_delete on public.supplier_categories
  for delete to authenticated
  using (supplier_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create policy products_select on public.products
  for select to authenticated
  using (
    supplier_id = (select auth.uid())
    or public.is_staff()
    or (
      is_active = true
      and exists (
        select 1
        from public.supplier_profiles sp
        where sp.user_id = products.supplier_id
          and sp.status = 'aprovado'
      )
    )
  );

create policy products_insert on public.products
  for insert to authenticated
  with check (
    supplier_id = (select auth.uid())
    and exists (
      select 1
      from public.supplier_profiles sp
      where sp.user_id = (select auth.uid())
    )
  );

create policy products_update on public.products
  for update to authenticated
  using (supplier_id = (select auth.uid()) or public.is_admin())
  with check (supplier_id = (select auth.uid()) or public.is_admin());

create policy products_delete on public.products
  for delete to authenticated
  using (supplier_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create policy plans_select on public.plans
  for select to authenticated, anon
  using (is_active = true or public.is_admin());

create policy plans_admin_all on public.plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

create policy subscriptions_insert on public.subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy subscriptions_update on public.subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- usage_counters (leitura própria; escrita via service role / triggers)
-- ---------------------------------------------------------------------------
create policy usage_counters_select on public.usage_counters
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- ---------------------------------------------------------------------------
-- demands
-- ---------------------------------------------------------------------------
create policy demands_select on public.demands
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.is_demand_matched_supplier(id)
    or exists (
      select 1
      from public.offers o
      where o.demand_id = demands.id
        and o.supplier_id = (select auth.uid())
    )
    or public.is_staff()
  );

create policy demands_insert on public.demands
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and (
      public.has_role('buyer')
      or exists (
        select 1 from public.buyer_profiles bp
        where bp.user_id = (select auth.uid())
      )
    )
  );

create policy demands_update on public.demands
  for update to authenticated
  using (buyer_id = (select auth.uid()) or public.is_admin())
  with check (buyer_id = (select auth.uid()) or public.is_admin());

create policy demands_delete on public.demands
  for delete to authenticated
  using (buyer_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- demand_attachments
-- ---------------------------------------------------------------------------
create policy demand_attachments_select on public.demand_attachments
  for select to authenticated
  using (public.is_demand_participant(demand_id) or public.is_staff());

create policy demand_attachments_insert on public.demand_attachments
  for insert to authenticated
  with check (public.is_demand_buyer(demand_id));

create policy demand_attachments_delete on public.demand_attachments
  for delete to authenticated
  using (public.is_demand_buyer(demand_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- demand_matches (escrita via service role — match-demand)
-- ---------------------------------------------------------------------------
create policy demand_matches_select on public.demand_matches
  for select to authenticated
  using (
    supplier_id = (select auth.uid())
    or public.is_demand_buyer(demand_id)
    or public.is_staff()
  );

create policy demand_matches_update_supplier on public.demand_matches
  for update to authenticated
  using (supplier_id = (select auth.uid()))
  with check (supplier_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create policy offers_select on public.offers
  for select to authenticated
  using (
    supplier_id = (select auth.uid())
    or public.is_demand_buyer(demand_id)
    or public.is_staff()
  );

create policy offers_insert on public.offers
  for insert to authenticated
  with check (
    supplier_id = (select auth.uid())
    and (
      public.has_role('supplier')
      or exists (
        select 1 from public.supplier_profiles sp
        where sp.user_id = (select auth.uid())
      )
    )
    and public.is_demand_matched_supplier(demand_id)
    and exists (
      select 1
      from public.demands d
      where d.id = demand_id
        and d.status in ('PUBLICADA', 'OFERTAS_RECEBIDAS', 'EM_NEGOCIACAO')
    )
  );

create policy offers_update_supplier on public.offers
  for update to authenticated
  using (supplier_id = (select auth.uid()))
  with check (supplier_id = (select auth.uid()));

create policy offers_update_buyer_reveal on public.offers
  for update to authenticated
  using (public.is_demand_buyer(demand_id))
  with check (public.is_demand_buyer(demand_id));

-- ---------------------------------------------------------------------------
-- offer_messages
-- ---------------------------------------------------------------------------
create policy offer_messages_select on public.offer_messages
  for select to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_id = (select auth.uid())
    or public.is_staff()
  );

create policy offer_messages_insert on public.offer_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> sender_id
    and exists (
      select 1
      from public.offers o
      where o.demand_id = offer_messages.demand_id
        and o.supplier_id = offer_messages.supplier_id
        and o.status in ('enviada', 'aceita')
    )
    and (
      (
        public.is_demand_buyer(demand_id)
        and recipient_id = offer_messages.supplier_id
      )
      or (
        supplier_id = (select auth.uid())
        and recipient_id = (
          select d.buyer_id
          from public.demands d
          where d.id = demand_id
        )
      )
    )
  );

create policy offer_messages_update_read on public.offer_messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create policy orders_select on public.orders
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or supplier_id = (select auth.uid())
    or public.is_staff()
  );

create policy orders_insert on public.orders
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and public.is_demand_buyer(demand_id)
    and exists (
      select 1
      from public.offers o
      where o.id = offer_id
        and o.demand_id = demand_id
        and o.supplier_id = orders.supplier_id
        and o.status = 'enviada'
    )
  );

create policy orders_update on public.orders
  for update to authenticated
  using (
    buyer_id = (select auth.uid())
    or supplier_id = (select auth.uid())
    or public.is_admin()
  )
  with check (
    buyer_id = (select auth.uid())
    or supplier_id = (select auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- order_status_logs (leitura participantes; insert via trigger/service)
-- ---------------------------------------------------------------------------
create policy order_status_logs_select on public.order_status_logs
  for select to authenticated
  using (
    public.is_order_participant(order_id)
    or public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- order_sla_deadlines
-- ---------------------------------------------------------------------------
create policy order_sla_select on public.order_sla_deadlines
  for select to authenticated
  using (
    responsible_user_id = (select auth.uid())
    or public.is_order_participant(order_id)
    or public.is_staff()
  );

create policy order_sla_update on public.order_sla_deadlines
  for update to authenticated
  using (
    responsible_user_id = (select auth.uid())
    or public.is_admin()
  )
  with check (
    responsible_user_id = (select auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- order_attachments
-- ---------------------------------------------------------------------------
create policy order_attachments_select on public.order_attachments
  for select to authenticated
  using (
    public.is_order_participant(order_id)
    or public.is_staff()
  );

create policy order_attachments_insert on public.order_attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.is_order_participant(order_id)
  );

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------
create policy ratings_select on public.ratings
  for select to authenticated
  using (
    rater_id = (select auth.uid())
    or rated_id = (select auth.uid())
    or public.is_order_participant(order_id)
    or public.is_staff()
    or exists (
      select 1
      from public.supplier_profiles sp
      where sp.user_id = ratings.rated_id
        and sp.status = 'aprovado'
    )
  );

create policy ratings_insert on public.ratings
  for insert to authenticated
  with check (
    rater_id = (select auth.uid())
    and public.is_order_participant(order_id)
  );

-- ---------------------------------------------------------------------------
-- reputation_events
-- ---------------------------------------------------------------------------
create policy reputation_events_select on public.reputation_events
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------
create policy notification_preferences_select on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

create policy notification_preferences_insert on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy notification_preferences_update on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notification_preferences_delete on public.notification_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.is_staff());

create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (actor_id = (select auth.uid()) or public.is_staff());

-- ---------------------------------------------------------------------------
-- crm_leads (landing — insert anônimo com consentimento)
-- ---------------------------------------------------------------------------
create policy crm_leads_insert on public.crm_leads
  for insert to anon, authenticated
  with check (lgpd_consent = true and lgpd_consent_at is not null);

create policy crm_leads_select on public.crm_leads
  for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- user_push_tokens
-- ---------------------------------------------------------------------------
create policy user_push_tokens_select on public.user_push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy user_push_tokens_insert on public.user_push_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_push_tokens_update on public.user_push_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy user_push_tokens_delete on public.user_push_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- cnpj_cache (leitura autenticada; escrita service role)
-- ---------------------------------------------------------------------------
create policy cnpj_cache_select on public.cnpj_cache
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- idempotency_keys — sem acesso client (service role bypassa RLS)
-- ---------------------------------------------------------------------------
-- nenhuma policy = deny all para authenticated/anon

-- ---------------------------------------------------------------------------
-- workflow_configs
-- ---------------------------------------------------------------------------
create policy workflow_configs_select on public.workflow_configs
  for select to authenticated
  using (is_active = true or public.is_admin());

create policy workflow_configs_admin on public.workflow_configs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants base
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- Anon: somente leitura pública necessária (RLS restringe o restante)
grant select on public.categories to anon;
grant select on public.plans to anon;

grant select on public.v_offers_public to authenticated;
