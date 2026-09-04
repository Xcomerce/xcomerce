-- Exibir nome da loja (store_name) nas propostas públicas, com fallback para fantasia/nome do responsável
drop view if exists public.v_offers_public;

create view public.v_offers_public
with (security_invoker = true)
as
select
  o.id,
  o.demand_id,
  o.supplier_id,
  o.valor,
  o.prazo_entrega_dias,
  o.prazo_entrega_em,
  o.validade_dias,
  o.validade_ate,
  o.quantidade,
  o.especificacoes,
  o.mensagem,
  o.status,
  o.contact_revealed,
  o.contact_revealed_at,
  o.created_at,
  o.updated_at,
  coalesce(
    nullif(btrim(sp.store_name), ''),
    nullif(btrim(c.nome_fantasia), ''),
    nullif(btrim(p.full_name), '')
  ) as supplier_name,
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
join public.profiles p on p.id = o.supplier_id
left join public.companies c on c.id = sp.company_id;

grant select on public.v_offers_public to authenticated;
