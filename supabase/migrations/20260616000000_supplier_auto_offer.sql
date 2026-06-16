-- Auto-proposta para fornecedores: configuração, logs e disparo no match.

-- ---------------------------------------------------------------------------
-- offers.source
-- ---------------------------------------------------------------------------
alter table public.offers
  add column if not exists source text not null default 'manual';

alter table public.offers
  drop constraint if exists offers_source_check;

alter table public.offers
  add constraint offers_source_check check (source in ('manual', 'auto'));

comment on column public.offers.source is 'Origem da proposta: manual ou auto-proposta.';

-- ---------------------------------------------------------------------------
-- Configuração por fornecedor
-- ---------------------------------------------------------------------------
create table public.supplier_auto_offer_settings (
  supplier_id uuid primary key references public.supplier_profiles (user_id) on delete cascade,
  enabled boolean not null default false,
  discount_percent numeric(5, 2) not null default 0,
  min_demand_quantity integer not null default 1,
  max_demand_quantity integer,
  delivery_days integer not null default 7,
  validity_days integer not null default 7,
  default_message text,
  category_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_auto_offer_discount_range check (
    discount_percent >= 0 and discount_percent <= 20
  ),
  constraint supplier_auto_offer_min_qty_positive check (min_demand_quantity >= 1),
  constraint supplier_auto_offer_max_qty_positive check (
    max_demand_quantity is null or max_demand_quantity >= 1
  ),
  constraint supplier_auto_offer_delivery_positive check (delivery_days >= 1),
  constraint supplier_auto_offer_validity_positive check (validity_days >= 1 and validity_days <= 30),
  constraint supplier_auto_offer_max_gte_min check (
    max_demand_quantity is null or max_demand_quantity >= min_demand_quantity
  )
);

create trigger supplier_auto_offer_settings_set_updated_at
  before update on public.supplier_auto_offer_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Logs de auditoria
-- ---------------------------------------------------------------------------
create table public.supplier_auto_offer_logs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles (user_id) on delete cascade,
  demand_id uuid not null references public.demands (id) on delete cascade,
  status text not null,
  reason text not null,
  offer_id uuid references public.offers (id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint supplier_auto_offer_logs_status_check check (status in ('sent', 'skipped', 'failed'))
);

create index idx_supplier_auto_offer_logs_supplier on public.supplier_auto_offer_logs (supplier_id, created_at desc);
create index idx_supplier_auto_offer_logs_demand on public.supplier_auto_offer_logs (demand_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.log_auto_offer_attempt(
  p_supplier_id uuid,
  p_demand_id uuid,
  p_status text,
  p_reason text,
  p_offer_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.supplier_auto_offer_logs (
    supplier_id,
    demand_id,
    status,
    reason,
    offer_id,
    metadata
  ) values (
    p_supplier_id,
    p_demand_id,
    p_status,
    p_reason,
    p_offer_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.try_create_auto_offer(
  p_demand_id uuid,
  p_supplier_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.supplier_auto_offer_settings%rowtype;
  v_demand public.demands%rowtype;
  v_market_price numeric;
  v_discount numeric;
  v_unit_price numeric;
  v_total_value numeric;
  v_offer_id uuid;
  v_titulo text;
  v_metadata jsonb;
begin
  select * into v_settings
  from public.supplier_auto_offer_settings s
  where s.supplier_id = p_supplier_id;

  if not found or v_settings.enabled is not true then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'disabled'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'disabled');
  end if;

  if not exists (
    select 1
    from public.supplier_profiles sp
    where sp.user_id = p_supplier_id
      and sp.status = 'aprovado'
  ) then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'supplier_not_approved'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'supplier_not_approved');
  end if;

  select * into v_demand
  from public.demands d
  where d.id = p_demand_id;

  if not found then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'demand_not_found'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'demand_not_found');
  end if;

  if v_demand.status not in ('PUBLICADA', 'OFERTAS_RECEBIDAS') then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'demand_not_open'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'demand_not_open');
  end if;

  if not exists (
    select 1
    from public.demand_matches dm
    where dm.demand_id = p_demand_id
      and dm.supplier_id = p_supplier_id
  ) then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'no_match'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'no_match');
  end if;

  if exists (
    select 1
    from public.offers o
    where o.demand_id = p_demand_id
      and o.supplier_id = p_supplier_id
      and o.status in ('enviada', 'aceita')
  ) then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'offer_exists'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'offer_exists');
  end if;

  if v_demand.quantidade < v_settings.min_demand_quantity then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'below_min_qty',
      null,
      jsonb_build_object('demand_quantity', v_demand.quantidade, 'min_demand_quantity', v_settings.min_demand_quantity)
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'below_min_qty');
  end if;

  if v_settings.max_demand_quantity is not null
     and v_demand.quantidade > v_settings.max_demand_quantity then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'above_max_qty',
      null,
      jsonb_build_object('demand_quantity', v_demand.quantidade, 'max_demand_quantity', v_settings.max_demand_quantity)
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'above_max_qty');
  end if;

  if v_settings.category_ids is not null
     and cardinality(v_settings.category_ids) > 0
     and not (v_demand.category_id = any (v_settings.category_ids)) then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'category_not_allowed'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'category_not_allowed');
  end if;

  v_market_price := public.get_demand_market_price(p_demand_id);

  if v_market_price is null or v_market_price <= 0 then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'no_market_price'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'no_market_price');
  end if;

  v_discount := greatest(0, least(20, v_settings.discount_percent));
  v_unit_price := round(v_market_price * (1 - v_discount / 100), 2);
  v_total_value := round(v_unit_price * v_demand.quantidade, 2);

  v_metadata := jsonb_build_object(
    'market_unit_price', v_market_price,
    'discount_percent', v_discount,
    'unit_price', v_unit_price,
    'total_value', v_total_value,
    'quantity', v_demand.quantidade
  );

  begin
    perform public.assert_monthly_quota(p_supplier_id, 'offers_sent');
    perform public.assert_offer_market_price(p_demand_id, v_total_value, v_demand.quantidade);
  exception
    when others then
      if sqlerrm like '%QUOTA_EXCEEDED%' then
        perform public.log_auto_offer_attempt(
          p_supplier_id, p_demand_id, 'skipped', 'quota_exceeded', null, v_metadata
        );
        return jsonb_build_object('status', 'skipped', 'reason', 'quota_exceeded');
      end if;

      if sqlerrm like '%OFFER_PRICE_BELOW_MARKET_MARGIN%' then
        perform public.log_auto_offer_attempt(
          p_supplier_id, p_demand_id, 'failed', 'below_market_margin', null, v_metadata
        );
        return jsonb_build_object('status', 'failed', 'reason', 'below_market_margin');
      end if;

      raise;
  end;

  insert into public.offers (
    demand_id,
    supplier_id,
    valor,
    prazo_entrega_dias,
    validade_dias,
    validade_ate,
    quantidade,
    mensagem,
    source
  ) values (
    p_demand_id,
    p_supplier_id,
    v_total_value,
    v_settings.delivery_days,
    v_settings.validity_days,
    now() + make_interval(days => v_settings.validity_days),
    v_demand.quantidade,
    v_settings.default_message,
    'auto'
  )
  returning id into v_offer_id;

  v_titulo := v_demand.titulo;

  insert into public.notifications (user_id, type, title, body, data, group_key)
  values (
    p_supplier_id,
    'offer.auto_sent',
    'Proposta automática enviada',
    'Sua auto-proposta foi enviada para: ' || v_titulo,
    jsonb_build_object('demand_id', p_demand_id, 'offer_id', v_offer_id),
    'auto-offer-' || p_demand_id::text
  );

  perform public.log_auto_offer_attempt(
    p_supplier_id, p_demand_id, 'sent', 'sent', v_offer_id, v_metadata
  );

  return jsonb_build_object(
    'status', 'sent',
    'offer_id', v_offer_id,
    'valor', v_total_value,
    'quantidade', v_demand.quantidade
  );
exception
  when others then
    perform public.log_auto_offer_attempt(
      p_supplier_id,
      p_demand_id,
      'failed',
      'unexpected_error',
      null,
      jsonb_build_object('error', sqlerrm)
    );
    return jsonb_build_object('status', 'failed', 'reason', 'unexpected_error');
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.supplier_auto_offer_settings enable row level security;
alter table public.supplier_auto_offer_logs enable row level security;

create policy supplier_auto_offer_settings_select on public.supplier_auto_offer_settings
  for select to authenticated
  using (supplier_id = (select auth.uid()));

create policy supplier_auto_offer_settings_insert on public.supplier_auto_offer_settings
  for insert to authenticated
  with check (supplier_id = (select auth.uid()));

create policy supplier_auto_offer_settings_update on public.supplier_auto_offer_settings
  for update to authenticated
  using (supplier_id = (select auth.uid()))
  with check (supplier_id = (select auth.uid()));

create policy supplier_auto_offer_logs_select on public.supplier_auto_offer_logs
  for select to authenticated
  using (supplier_id = (select auth.uid()) or public.is_staff());

grant execute on function public.try_create_auto_offer(uuid, uuid) to service_role;
