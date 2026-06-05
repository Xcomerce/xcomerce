-- Fix BUYER_OFFER_UPDATE_FORBIDDEN error when accepting or rejecting offers
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
