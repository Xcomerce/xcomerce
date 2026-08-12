-- Public store name for suppliers (displayed in buyer feed and catalog)

alter table public.supplier_profiles
add column if not exists store_name text;

comment on column public.supplier_profiles.store_name is
  'Nome público da loja exibido para compradores no Explorar e catálogo.';

-- Seed from existing trade name when available
update public.supplier_profiles sp
set store_name = nullif(trim(c.nome_fantasia), '')
from public.companies c
where c.id = sp.company_id
  and sp.store_name is null
  and nullif(trim(c.nome_fantasia), '') is not null;
