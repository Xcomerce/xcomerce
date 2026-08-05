-- Remove regra de 20%% abaixo do mercado e libera contato do fornecedor para o comprador na proposta.

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
      and d.buyer_id = (select auth.uid())
  )
  or public.is_staff();
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

    new.contact_revealed := true;
    new.contact_revealed_at := coalesce(new.contact_revealed_at, now());
  end if;

  if tg_op = 'UPDATE'
     and (
       new.valor is distinct from old.valor
       or new.quantidade is distinct from old.quantidade
     ) then
    null;
  end if;

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

  if tg_op = 'UPDATE'
     and new.status = 'aceita'
     and old.status is distinct from 'aceita' then
    new.contact_revealed := true;
    new.contact_revealed_at := coalesce(new.contact_revealed_at, now());
  end if;

  return new;
end;
$$;

update public.offers
set
  contact_revealed = true,
  contact_revealed_at = coalesce(contact_revealed_at, now())
where contact_revealed = false;

-- Auto-proposta: remove validação de piso de mercado (regra de 20% descontinuada)
create or replace function public.assert_offer_market_price(
  p_demand_id uuid,
  p_total_value numeric,
  p_quantity numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  null;
end;
$$;

-- Auto-proposta: desconto máximo passa de 20% para 100%
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.try_create_auto_offer(uuid, uuid)'::regprocedure) into v_def;
  if v_def is not null then
    v_def := replace(
      v_def,
      'greatest(0, least(20, v_settings.discount_percent))',
      'greatest(0, least(100, v_settings.discount_percent))'
    );
    execute v_def;
  end if;
end;
$$;
