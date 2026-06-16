-- Fix infinite RLS recursion on public.offers table during insert
-- Root cause: offers_insert check clause queried public.supplier_profiles directly, which has a select policy that queries public.offers.
-- Solution: Wrap the supplier profile existence check in a security definer function to bypass the select policy on supplier_profiles.

create or replace function public.has_supplier_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.supplier_profiles
    where user_id = p_user_id
  );
$$;

grant execute on function public.has_supplier_profile(uuid) to authenticated, anon;

-- Recreate offers_insert policy
drop policy if exists offers_insert on public.offers;

create policy offers_insert on public.offers
  for insert to authenticated
  with check (
    supplier_id = (select auth.uid())
    and (
      public.has_role('supplier')
      or public.has_supplier_profile((select auth.uid()))
    )
    and public.is_demand_matched_supplier(demand_id)
    and exists (
      select 1
      from public.demands d
      where d.id = demand_id
        and d.status in ('PUBLICADA', 'OFERTAS_RECEBIDAS', 'EM_NEGOCIACAO')
    )
  );
