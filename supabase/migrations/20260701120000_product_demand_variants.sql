-- Variantes de produto (cor/tamanho) e especificações na demanda.

create type public.product_size_type as enum ('roupa', 'calcado', 'numerico', 'livre');

alter table public.products
  add column tem_cor boolean not null default false,
  add column tem_tamanho boolean not null default false,
  add column tipo_tamanho public.product_size_type,
  add column cores text[] not null default '{}',
  add column tamanhos text[] not null default '{}';

alter table public.demands
  add column cor text,
  add column tamanho text;

alter table public.products
  add constraint products_tipo_tamanho_check
  check (not tem_tamanho or tipo_tamanho is not null);

comment on column public.products.tem_cor is 'Produto possui variação de cor.';
comment on column public.products.tem_tamanho is 'Produto possui variação de tamanho.';
comment on column public.products.tipo_tamanho is 'Formato das opções de tamanho (roupa, calcado, numerico, livre).';
comment on column public.products.cores is 'Cores disponíveis quando tem_cor = true.';
comment on column public.products.tamanhos is 'Tamanhos disponíveis quando tem_tamanho = true.';
comment on column public.demands.cor is 'Cor desejada pelo comprador (opcional).';
comment on column public.demands.tamanho is 'Tamanho desejado pelo comprador (opcional).';

-- Normaliza texto para comparação de variantes.
create or replace function public.normalize_variant_value(p_value text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_value, '')));
$$;

-- Verifica se um valor está em um array text[] (case-insensitive, trim).
create or replace function public.variant_array_contains(p_values text[], p_needle text)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from unnest(coalesce(p_values, '{}'::text[])) as v(value)
    where public.normalize_variant_value(v.value) = public.normalize_variant_value(p_needle)
      and public.normalize_variant_value(p_needle) <> ''
  );
$$;

-- Produto compatível com cor/tamanho solicitados na demanda.
create or replace function public.product_matches_demand_variants(
  p_tem_cor boolean,
  p_tem_tamanho boolean,
  p_cores text[],
  p_tamanhos text[],
  p_cor text,
  p_tamanho text
)
returns boolean
language sql
immutable
as $$
  select
    (
      public.normalize_variant_value(p_cor) = ''
      or not coalesce(p_tem_cor, false)
      or public.variant_array_contains(p_cores, p_cor)
    )
    and (
      public.normalize_variant_value(p_tamanho) = ''
      or not coalesce(p_tem_tamanho, false)
      or public.variant_array_contains(p_tamanhos, p_tamanho)
    );
$$;

-- Fornecedor possui produto ativo compatível com a demanda (categoria + variantes).
create or replace function public.supplier_has_compatible_product(
  p_supplier_id uuid,
  p_demand_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.demands d
    join public.products p
      on p.supplier_id = p_supplier_id
     and p.category_id = d.category_id
     and p.is_active = true
    where d.id = p_demand_id
      and public.product_matches_demand_variants(
        p.tem_cor,
        p.tem_tamanho,
        p.cores,
        p.tamanhos,
        d.cor,
        d.tamanho
      )
  );
$$;

grant execute on function public.normalize_variant_value(text) to authenticated, service_role;
grant execute on function public.variant_array_contains(text[], text) to authenticated, service_role;
grant execute on function public.product_matches_demand_variants(boolean, boolean, text[], text[], text, text) to authenticated, service_role;
grant execute on function public.supplier_has_compatible_product(uuid, uuid) to authenticated, service_role;

-- Guard defensivo na auto-proposta: exige produto compatível quando demanda especifica variantes.
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

  if (
    public.normalize_variant_value(v_demand.cor) <> ''
    or public.normalize_variant_value(v_demand.tamanho) <> ''
  ) and not public.supplier_has_compatible_product(p_supplier_id, p_demand_id) then
    perform public.log_auto_offer_attempt(
      p_supplier_id, p_demand_id, 'skipped', 'variant_mismatch'
    );
    return jsonb_build_object('status', 'skipped', 'reason', 'variant_mismatch');
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
