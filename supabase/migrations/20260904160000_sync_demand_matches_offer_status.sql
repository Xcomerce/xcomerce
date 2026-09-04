-- Corrige matches antigos que já possuem proposta mas continuam como notified/viewed
update public.demand_matches dm
set status = 'offer_sent'
where dm.status in ('notified', 'viewed')
  and exists (
    select 1
    from public.offers o
    where o.demand_id = dm.demand_id
      and o.supplier_id = dm.supplier_id
  );
