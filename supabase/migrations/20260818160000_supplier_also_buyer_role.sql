-- Fornecedores cadastrados também podem atuar como compradores (troca rápida de papel).

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

  if v_role = 'supplier' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'buyer')
    on conflict do nothing;

    insert into public.buyer_profiles (user_id)
    values (new.id)
    on conflict do nothing;
  end if;

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

insert into public.user_roles (user_id, role)
select ur.user_id, 'buyer'::public.user_role
from public.user_roles ur
where ur.role = 'supplier'
on conflict do nothing;

insert into public.buyer_profiles (user_id)
select ur.user_id
from public.user_roles ur
where ur.role = 'supplier'
on conflict do nothing;
