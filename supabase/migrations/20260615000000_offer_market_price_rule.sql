-- Regra de leilão: propostas devem ficar no máximo 20% abaixo do preço de mercado (piso = 80%).

alter table public.demands
  add column if not exists preco_referencia_mercado numeric(12, 2);

comment on column public.demands.preco_referencia_mercado is
  'Preço unitário de mercado no momento da criação da demanda (snapshot).';

create or replace function public.get_category_market_price(p_category_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select avg(p.preco_referencia)
  from public.products p
  where p.category_id = p_category_id
    and p.is_active = true
    and p.preco_referencia is not null;
$$;

create or replace function public.get_demand_market_price(p_demand_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    d.preco_referencia_mercado,
    public.get_category_market_price(d.category_id)
  )
  from public.demands d
  where d.id = p_demand_id;
$$;

create or replace function public.assert_offer_market_price(
  p_demand_id uuid,
  p_valor numeric,
  p_quantidade integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_price numeric;
  v_min_unit_price numeric;
  v_offer_unit_price numeric;
  -- Margem máxima para baixo: 20% → piso em 80% do preço de mercado
  v_market_floor_ratio constant numeric := 0.80;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    return;
  end if;

  v_market_price := public.get_demand_market_price(p_demand_id);

  if v_market_price is null or v_market_price <= 0 then
    return;
  end if;

  v_min_unit_price := round(v_market_price * v_market_floor_ratio, 2);
  v_offer_unit_price := round(p_valor / p_quantidade, 2);

  if v_offer_unit_price < v_min_unit_price then
    raise exception 'OFFER_PRICE_BELOW_MARKET_MARGIN: proposta abaixo do limite viável (máx. 20%% abaixo do preço de mercado)'
      using errcode = 'P0001';
  end if;
end;
$$;

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

    perform public.assert_offer_market_price(new.demand_id, new.valor, new.quantidade);
  end if;

  if tg_op = 'UPDATE'
     and (
       new.valor is distinct from old.valor
       or new.quantidade is distinct from old.quantidade
     ) then
    perform public.assert_offer_market_price(new.demand_id, new.valor, new.quantidade);
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
       or (new.status is distinct from old.status and new.status not in ('aceita', 'rejeitada')) then
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

grant execute on function public.get_category_market_price(uuid) to authenticated;
grant execute on function public.get_demand_market_price(uuid) to authenticated;
