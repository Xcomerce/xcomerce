-- Keve Marketplace B2B — Triggers de negócio
-- Ref: docs/SCHEMA.md · docs/MODULOS.md · docs/EDGE_FUNCTIONS.md

-- pg_net para invocar match-demand (opcional; webhook também suportado)
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers: cotas mensais
-- ---------------------------------------------------------------------------
create or replace function public.get_plan_limit(
  p_user_id uuid,
  p_counter_type public.usage_counter_type
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case p_counter_type
    when 'demands_published' then p.max_demands_monthly
    when 'offers_sent' then p.max_offers_monthly
  end
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
  limit 1;
$$;

create or replace function public.get_usage_count(
  p_user_id uuid,
  p_counter_type public.usage_counter_type
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(uc.count, 0)
  from public.usage_counters uc
  where uc.user_id = p_user_id
    and uc.counter_type = p_counter_type
    and uc.period_year = extract(year from now())::smallint
    and uc.period_month = extract(month from now())::smallint;
$$;

create or replace function public.bump_usage_counter(
  p_user_id uuid,
  p_counter_type public.usage_counter_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year smallint := extract(year from now())::smallint;
  v_month smallint := extract(month from now())::smallint;
begin
  insert into public.usage_counters (user_id, counter_type, period_year, period_month, count)
  values (p_user_id, p_counter_type, v_year, v_month, 1)
  on conflict (user_id, counter_type, period_year, period_month)
  do update set
    count = public.usage_counters.count + 1,
    updated_at = now();
end;
$$;

create or replace function public.assert_monthly_quota(
  p_user_id uuid,
  p_counter_type public.usage_counter_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  v_limit := public.get_plan_limit(p_user_id, p_counter_type);
  if v_limit is null then
    return;
  end if;

  v_used := public.get_usage_count(p_user_id, p_counter_type);
  if v_used >= v_limit then
    raise exception 'QUOTA_EXCEEDED: limite mensal atingido para %', p_counter_type
      using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: filtro anti-contato (chat M8)
-- ---------------------------------------------------------------------------
create or replace function public.contains_blocked_contact(p_text text)
returns boolean
language sql
immutable
as $$
  select
    p_text is not null
    and btrim(p_text) <> ''
    and (
      p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or p_text ~ '(\(?\d{2}\)?[\s.-]?)?(\d{4,5}[\s.-]?\d{4}|\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})'
      or p_text ~* '(https?://|www\.)[^\s]+'
      or p_text ~ '@\w{2,}'
    );
$$;

-- ---------------------------------------------------------------------------
-- Helper: invocar Edge Function match-demand (pg_net, se configurado)
-- Configure via:
--   alter database postgres set app.settings.supabase_functions_url = 'https://xxx.supabase.co/functions/v1';
--   alter database postgres set app.settings.service_role_key = 'eyJ...';
-- Alternativa produção: Database Webhook em demands UPDATE → match-demand
-- ---------------------------------------------------------------------------
create or replace function public.invoke_match_demand(p_demand_id uuid)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_base_url text;
  v_service_key text;
  v_body jsonb;
begin
  if not exists (
    select 1 from pg_extension where extname = 'pg_net'
  ) then
    return;
  end if;

  v_base_url := nullif(current_setting('app.settings.supabase_functions_url', true), '');
  if v_base_url is null then
    return;
  end if;

  v_service_key := coalesce(nullif(current_setting('app.settings.service_role_key', true), ''), '');
  v_body := jsonb_build_object(
    'demand_id', p_demand_id,
    'idempotency_key', 'demand-' || p_demand_id::text || '-publish'
  );

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/match-demand',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_body
  );
exception
  when undefined_function or invalid_schema_name then
    null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth: signup → profile + role + subscription Free (+ buyer_profiles)
-- Metadata esperada em raw_user_meta_data:
--   full_name, phone, primary_role ('buyer' | 'supplier')
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_phone text;
  v_role public.user_role;
  v_plan_id uuid;
begin
  v_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );
  v_phone := nullif(btrim(new.raw_user_meta_data->>'phone'), '');
  v_role := coalesce(
    nullif(new.raw_user_meta_data->>'primary_role', '')::public.user_role,
    'buyer'::public.user_role
  );

  insert into public.profiles (id, email, full_name, phone, primary_role)
  values (new.id, new.email, v_full_name, v_phone, v_role);

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict do nothing;

  select id into v_plan_id
  from public.plans
  where code = 'free'
  limit 1;

  if v_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, v_plan_id, 'active')
    on conflict (user_id) do nothing;
  end if;

  if v_role = 'buyer' then
    insert into public.buyer_profiles (user_id)
    values (new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Demandas: publicação, cotas, match hook
-- ---------------------------------------------------------------------------
create or replace function public.demands_before_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'PUBLICADA'
     and (tg_op = 'INSERT' or old.status is distinct from 'PUBLICADA') then

    perform public.assert_monthly_quota(new.buyer_id, 'demands_published');

    if new.published_at is null then
      new.published_at := now();
    end if;

    if new.expires_at is null then
      new.expires_at := new.published_at + interval '30 days';
    end if;
  end if;

  return new;
end;
$$;

create trigger demands_before_publish_trg
  before insert or update on public.demands
  for each row execute function public.demands_before_publish();

create or replace function public.demands_after_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'PUBLICADA'
     and (tg_op = 'INSERT' or old.status is distinct from 'PUBLICADA') then

    perform public.bump_usage_counter(new.buyer_id, 'demands_published');
    perform public.invoke_match_demand(new.id);
  end if;

  return new;
end;
$$;

create trigger demands_after_publish_trg
  after insert or update on public.demands
  for each row execute function public.demands_after_publish();

-- ---------------------------------------------------------------------------
-- Propostas: validade, cotas, status demanda/match, notificação
-- ---------------------------------------------------------------------------
create or replace function public.offers_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.assert_monthly_quota(new.supplier_id, 'offers_sent');

    if new.validade_ate is null
       or new.validade_ate <= now() then
      new.validade_ate := now() + make_interval(days => new.validade_dias);
    end if;
  end if;

  -- Comprador só pode alterar campos de reveal
  if tg_op = 'UPDATE'
     and new.supplier_id is distinct from (select auth.uid())
     and public.is_demand_buyer(new.demand_id) then

    if new.demand_id is distinct from old.demand_id
       or new.supplier_id is distinct from old.supplier_id
       or new.valor is distinct from old.valor
       or new.prazo_entrega_dias is distinct from old.prazo_entrega_dias
       or new.validade_dias is distinct from old.validade_dias
       or new.validade_ate is distinct from old.validade_ate
       or new.quantidade is distinct from old.quantidade
       or new.mensagem is distinct from old.mensagem
       or new.status is distinct from old.status then
      raise exception 'BUYER_OFFER_UPDATE_FORBIDDEN: comprador só pode revelar contato'
        using errcode = 'P0001';
    end if;

    if new.contact_revealed = true and old.contact_revealed = false then
      new.contact_revealed_at := coalesce(new.contact_revealed_at, now());
    end if;
  end if;

  -- Aceite de proposta
  if tg_op = 'UPDATE'
     and new.status = 'aceita'
     and old.status is distinct from 'aceita' then
    new.contact_revealed := true;
    new.contact_revealed_at := coalesce(new.contact_revealed_at, now());
  end if;

  return new;
end;
$$;

create trigger offers_before_write_trg
  before insert or update on public.offers
  for each row execute function public.offers_before_write();

create or replace function public.offers_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_titulo text;
begin
  if tg_op = 'INSERT' then
    perform public.bump_usage_counter(new.supplier_id, 'offers_sent');

    update public.demand_matches
    set status = 'offer_sent'
    where demand_id = new.demand_id
      and supplier_id = new.supplier_id;

    update public.demands
    set status = 'OFERTAS_RECEBIDAS'
    where id = new.demand_id
      and status = 'PUBLICADA';

    select d.buyer_id, d.titulo
    into v_buyer_id, v_titulo
    from public.demands d
    where d.id = new.demand_id;

    insert into public.notifications (user_id, type, title, body, data, group_key)
    values (
      v_buyer_id,
      'offer.received',
      'Nova proposta recebida',
      'Você recebeu uma proposta para: ' || v_titulo,
      jsonb_build_object('demand_id', new.demand_id, 'offer_id', new.id),
      'demand-' || new.demand_id::text
    );
  end if;

  if tg_op = 'UPDATE' and new.status = 'aceita' and old.status is distinct from 'aceita' then
    update public.offers
    set status = 'rejeitada'
    where demand_id = new.demand_id
      and id <> new.id
      and status = 'enviada';

    update public.demands
    set status = 'PROPOSTA_ACEITA'
    where id = new.demand_id;
  end if;

  if tg_op = 'UPDATE'
     and new.contact_revealed = true
     and old.contact_revealed = false then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      (select auth.uid()),
      'offer.contact_revealed',
      'offers',
      new.id,
      jsonb_build_object(
        'demand_id', new.demand_id,
        'supplier_id', new.supplier_id
      )
    );
  end if;

  return new;
end;
$$;

create trigger offers_after_write_trg
  after insert or update on public.offers
  for each row execute function public.offers_after_write();

-- ---------------------------------------------------------------------------
-- Chat: filtro anti-contato
-- ---------------------------------------------------------------------------
create or replace function public.offer_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revealed boolean;
begin
  select o.contact_revealed
  into v_revealed
  from public.offers o
  where o.demand_id = new.demand_id
    and o.supplier_id = new.supplier_id
    and o.status in ('enviada', 'aceita')
  order by o.created_at desc
  limit 1;

  if not coalesce(v_revealed, false)
     and public.contains_blocked_contact(new.body) then
    raise exception 'CONTACT_INFO_BLOCKED: remova telefone, e-mail ou links antes do reveal de contato'
      using errcode = 'P0001';
  end if;

  if new.offer_id is null then
    select o.id
    into new.offer_id
    from public.offers o
    where o.demand_id = new.demand_id
      and o.supplier_id = new.supplier_id
      and o.status in ('enviada', 'aceita')
    order by o.created_at desc
    limit 1;
  end if;

  return new;
end;
$$;

create trigger offer_messages_before_insert_trg
  before insert on public.offer_messages
  for each row execute function public.offer_messages_before_insert();

-- ---------------------------------------------------------------------------
-- Pedidos: transições, logs, SLAs
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_order_transition(
  p_from public.order_status,
  p_to public.order_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then true
    when p_from = 'PROPOSTA_ACEITA'
      and p_to in ('AGUARDANDO_CONFIRMACAO_EXTERNA', 'CANCELADO') then true
    when p_from = 'AGUARDANDO_CONFIRMACAO_EXTERNA'
      and p_to in ('PAGAMENTO_INFORMADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'PAGAMENTO_INFORMADO'
      and p_to in ('ENVIO_INFORMADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'ENVIO_INFORMADO'
      and p_to in ('ENTREGUE', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'ENTREGUE'
      and p_to in ('CONCLUIDO', 'CANCELADO', 'EXPIRADO') then true
    else false
  end;
$$;

create or replace function public.create_order_sla(
  p_order_id uuid,
  p_action public.sla_action,
  p_responsible_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_sla_deadlines (
    order_id,
    action,
    responsible_user_id,
    deadline_at
  )
  values (
    p_order_id,
    p_action,
    p_responsible_user_id,
    now() + interval '24 hours'
  );
end;
$$;

create or replace function public.orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and not public.is_valid_order_transition(old.status, new.status) then
    raise exception 'INVALID_ORDER_TRANSITION: % → % não permitido', old.status, new.status
      using errcode = 'P0001';
  end if;

  if new.status = 'CONCLUIDO' and old.status is distinct from 'CONCLUIDO' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

create trigger orders_before_update_trg
  before update on public.orders
  for each row execute function public.orders_before_update();

create or replace function public.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer_status public.offer_status;
begin
  select o.status
  into v_offer_status
  from public.offers o
  where o.id = new.offer_id
    and o.demand_id = new.demand_id
    and o.supplier_id = new.supplier_id;

  if v_offer_status is distinct from 'enviada' then
    raise exception 'OFFER_NOT_ACCEPTABLE: proposta deve estar enviada para criar pedido'
      using errcode = 'P0001';
  end if;

  update public.offers
  set
    status = 'aceita',
    contact_revealed = true,
    contact_revealed_at = coalesce(contact_revealed_at, now())
  where id = new.offer_id;

  if new.status = 'PROPOSTA_ACEITA' then
    new.status := 'AGUARDANDO_CONFIRMACAO_EXTERNA';
  end if;

  return new;
end;
$$;

create trigger orders_before_insert_trg
  before insert on public.orders
  for each row execute function public.orders_before_insert();

create or replace function public.orders_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_logs (order_id, from_status, to_status, changed_by)
    values (new.id, 'PROPOSTA_ACEITA', new.status, (select auth.uid()));

    perform public.create_order_sla(
      new.id,
      'inform_payment',
      new.buyer_id
    );
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_logs (order_id, from_status, to_status, changed_by, notes)
    values (
      new.id,
      old.status,
      new.status,
      (select auth.uid()),
      new.cancel_reason
    );

    update public.order_sla_deadlines
    set
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where order_id = new.id
      and status = 'pending';

    case new.status
      when 'PAGAMENTO_INFORMADO' then
        perform public.create_order_sla(new.id, 'inform_shipping', new.supplier_id);
      when 'ENVIO_INFORMADO' then
        perform public.create_order_sla(new.id, 'confirm_delivery', new.buyer_id);
      when 'ENTREGUE' then
        perform public.create_order_sla(new.id, 'confirm_completion', new.buyer_id);
      when 'CONCLUIDO' then
        update public.buyer_profiles
        set orders_completed = orders_completed + 1
        where user_id = new.buyer_id;

        update public.supplier_profiles
        set orders_completed = orders_completed + 1
        where user_id = new.supplier_id;

        insert into public.reputation_events (user_id, order_id, event_type)
        values
          (new.buyer_id, new.id, 'order_completed'),
          (new.supplier_id, new.id, 'order_completed');
      when 'CANCELADO' then
        update public.buyer_profiles
        set cancel_count = cancel_count + 1
        where user_id = new.buyer_id;

        update public.supplier_profiles
        set cancel_count = cancel_count + 1
        where user_id = new.supplier_id;

        insert into public.reputation_events (user_id, order_id, event_type, metadata)
        values
          (
            new.buyer_id,
            new.id,
            'order_canceled',
            jsonb_build_object('canceled_by', new.canceled_by)
          ),
          (
            new.supplier_id,
            new.id,
            'order_canceled',
            jsonb_build_object('canceled_by', new.canceled_by)
          );
      else
        null;
    end case;
  end if;

  return new;
end;
$$;

create trigger orders_after_write_trg
  after insert or update on public.orders
  for each row execute function public.orders_after_write();

-- ---------------------------------------------------------------------------
-- Reputação: validação + sync métricas após avaliação
-- ---------------------------------------------------------------------------
create or replace function public.ratings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_status public.order_status;
begin
  select o.status
  into v_order_status
  from public.orders o
  where o.id = new.order_id;

  if v_order_status is distinct from 'CONCLUIDO' then
    raise exception 'RATING_NOT_ALLOWED: avaliação só após pedido CONCLUIDO'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger ratings_before_insert_trg
  before insert on public.ratings
  for each row execute function public.ratings_before_insert();

create or replace function public.ratings_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3, 2);
  v_total integer;
  v_event public.reputation_event_type;
begin
  select round(avg(score)::numeric, 2), count(*)
  into v_avg, v_total
  from public.ratings
  where rated_id = new.rated_id;

  update public.supplier_profiles
  set
    avg_rating = v_avg,
    total_ratings = v_total
  where user_id = new.rated_id;

  update public.buyer_profiles
  set
    avg_rating = v_avg,
    total_ratings = v_total
  where user_id = new.rated_id;

  v_event := case
    when new.score >= 4 then 'positive_rating'::public.reputation_event_type
    else 'negative_rating'::public.reputation_event_type
  end;

  insert into public.reputation_events (user_id, order_id, event_type, metadata)
  values (
    new.rated_id,
    new.order_id,
    v_event,
    jsonb_build_object('score', new.score, 'rater_id', new.rater_id)
  );
end;
$$;

create trigger ratings_after_insert_trg
  after insert on public.ratings
  for each row execute function public.ratings_after_insert();

-- ---------------------------------------------------------------------------
-- Match board: viewed_at automático
-- ---------------------------------------------------------------------------
create or replace function public.demand_matches_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'viewed'
     and old.status is distinct from 'viewed'
     and new.viewed_at is null then
    new.viewed_at := now();
  end if;

  return new;
end;
$$;

create trigger demand_matches_before_update_trg
  before update on public.demand_matches
  for each row execute function public.demand_matches_before_update();

-- ---------------------------------------------------------------------------
-- Grants (helpers usados indiretamente via triggers)
-- ---------------------------------------------------------------------------
revoke all on function public.get_plan_limit(uuid, public.usage_counter_type) from public;
revoke all on function public.get_usage_count(uuid, public.usage_counter_type) from public;
revoke all on function public.bump_usage_counter(uuid, public.usage_counter_type) from public;
revoke all on function public.assert_monthly_quota(uuid, public.usage_counter_type) from public;
revoke all on function public.contains_blocked_contact(text) from public;
revoke all on function public.invoke_match_demand(uuid) from public;
revoke all on function public.is_valid_order_transition(public.order_status, public.order_status) from public;
revoke all on function public.create_order_sla(uuid, public.sla_action, uuid) from public;

grant execute on function public.contains_blocked_contact(text) to authenticated;
