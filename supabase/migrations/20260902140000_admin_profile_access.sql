-- Acesso administrativo a perfis: logs LGPD, busca, edição auditada e exclusão em 2 etapas.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Tabelas de auditoria (append-only)
-- ---------------------------------------------------------------------------
create table public.profile_change_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint profile_change_logs_reason_min check (char_length(trim(reason)) >= 10)
);

create index idx_profile_change_logs_target on public.profile_change_logs (target_user_id, created_at desc);
create index idx_profile_change_logs_actor on public.profile_change_logs (actor_id, created_at desc);

create table public.profile_access_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete set null,
  access_type text not null,
  justification text,
  created_at timestamptz not null default now(),
  constraint profile_access_logs_access_type_check check (
    access_type in ('search_result', 'profile_view', 'tab_activity', 'tab_history')
  )
);

create index idx_profile_access_logs_target on public.profile_access_logs (target_user_id, created_at desc);

create table public.admin_deletion_tokens (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  reason text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_deletion_tokens_reason_min check (char_length(trim(reason)) >= 10)
);

create index idx_admin_deletion_tokens_token on public.admin_deletion_tokens (token) where used_at is null;

-- Índices de busca admin
create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists idx_profiles_email_trgm
  on public.profiles using gin (email extensions.gin_trgm_ops);
create index if not exists idx_profiles_phone_trgm
  on public.profiles using gin (phone extensions.gin_trgm_ops);

alter table public.profile_change_logs enable row level security;
alter table public.profile_access_logs enable row level security;
alter table public.admin_deletion_tokens enable row level security;

create policy profile_change_logs_select on public.profile_change_logs
  for select to authenticated
  using (public.is_admin());

create policy profile_access_logs_select on public.profile_access_logs
  for select to authenticated
  using (public.is_admin());

create policy admin_deletion_tokens_select on public.admin_deletion_tokens
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers internos
-- ---------------------------------------------------------------------------
create or replace function public._admin_assert_reason(p_reason text)
returns void
language plpgsql
as $$
begin
  if p_reason is null or char_length(trim(p_reason)) < 10 then
    raise exception 'Motivo obrigatório com no mínimo 10 caracteres';
  end if;
end;
$$;

create or replace function public._admin_log_profile_change(
  p_target_user_id uuid,
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_field_name text,
  p_old_value text,
  p_new_value text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_change_logs (
    target_user_id,
    actor_id,
    entity_type,
    entity_id,
    field_name,
    old_value,
    new_value,
    reason
  ) values (
    p_target_user_id,
    p_actor_id,
    p_entity_type,
    p_entity_id,
    p_field_name,
    p_old_value,
    p_new_value,
    p_reason
  );
end;
$$;

create or replace function public._admin_field_allowed(
  p_entity_type text,
  p_field_name text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_entity_type = 'profiles' and p_field_name in ('full_name', 'phone', 'email') then true
    when p_entity_type = 'buyer_profiles' and p_field_name in (
      'city', 'uf', 'cep', 'logradouro', 'numero', 'bairro', 'complemento'
    ) then true
    when p_entity_type = 'supplier_profiles' and p_field_name in (
      'store_name', 'service_city', 'service_uf', 'service_radius_km'
    ) then true
    else false
  end;
$$;

create or replace function public._admin_notify_profile_updated(
  p_target_user_id uuid,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  select p.email, p.full_name
  into v_email, v_name
  from public.profiles p
  where p.id = p_target_user_id;

  if v_email is null or v_email = '' then
    return;
  end if;

  perform public.invoke_send_email(jsonb_build_object(
    'to', v_email,
    'template', 'profile_updated_by_admin',
    'user_id', p_target_user_id,
    'data', jsonb_build_object(
      'user_name', v_name,
      'changes', p_changes,
      'action_url', v_app_url || '/settings/profile'
    )
  ));
exception
  when others then
    null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Busca de usuários (admin)
-- ---------------------------------------------------------------------------
create or replace function public.search_admin_users(
  p_query text default '',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  roles public.user_role[],
  has_buyer_profile boolean,
  supplier_status public.supplier_status,
  is_active boolean,
  created_at timestamptz,
  cnpj char(14),
  razao_social text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_digits text := regexp_replace(v_query, '\D', '', 'g');
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  with matched as (
    select distinct p.id
    from public.profiles p
    left join public.supplier_profiles sp on sp.user_id = p.id
    left join public.companies c on c.id = sp.company_id
    where
      v_query = ''
      or (
        v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and p.id = v_query::uuid
      )
      or (length(v_digits) = 14 and c.cnpj = v_digits)
      or p.email ilike '%' || v_query || '%'
      or p.full_name ilike '%' || v_query || '%'
      or coalesce(p.phone, '') ilike '%' || v_query || '%'
      or p.id::text ilike v_query || '%'
      or coalesce(c.razao_social, '') ilike '%' || v_query || '%'
      or (length(v_digits) >= 8 and coalesce(p.phone, '') like '%' || v_digits || '%')
  ),
  counted as (
    select count(*)::bigint as cnt from matched
  )
  select
    p.id,
    p.full_name,
    p.email,
    p.phone,
    coalesce(
      array_agg(distinct ur.role) filter (where ur.role is not null),
      case when p.primary_role is not null then array[p.primary_role] else '{}'::public.user_role[] end
    ) as roles,
    exists (select 1 from public.buyer_profiles bp where bp.user_id = p.id) as has_buyer_profile,
    sp.status as supplier_status,
    p.is_active,
    p.created_at,
    c.cnpj,
    c.razao_social,
    cnt.cnt as total_count
  from matched m
  join public.profiles p on p.id = m.id
  cross join counted cnt
  left join public.user_roles ur on ur.user_id = p.id
  left join public.supplier_profiles sp on sp.user_id = p.id
  left join public.companies c on c.id = sp.company_id
  group by p.id, p.full_name, p.email, p.phone, p.primary_role, sp.status, p.is_active, p.created_at, c.cnpj, c.razao_social, cnt.cnt
  order by p.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------------
-- Log de acesso LGPD
-- ---------------------------------------------------------------------------
create or replace function public.log_profile_access(
  p_target_user_id uuid,
  p_access_type text,
  p_justification text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if p_access_type = 'profile_view' then
    perform public._admin_assert_reason(p_justification);
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  insert into public.profile_access_logs (
    target_user_id,
    actor_id,
    access_type,
    justification
  ) values (
    p_target_user_id,
    (select auth.uid()),
    p_access_type,
    nullif(trim(p_justification), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Edição auditada de perfil
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_user_profile(
  p_target_user_id uuid,
  p_changes jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := (select auth.uid());
  v_entity text;
  v_fields jsonb;
  v_field text;
  v_new_val text;
  v_old_val text;
  v_allowed boolean;
  v_changes jsonb := '[]'::jsonb;
  v_rec record;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  perform public._admin_assert_reason(p_reason);

  if p_changes is null or p_changes = '{}'::jsonb then
    raise exception 'Nenhuma alteração informada';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  for v_entity, v_fields in
    select key, value from jsonb_each(p_changes)
  loop
    if v_entity not in ('profiles', 'buyer_profiles', 'supplier_profiles') then
      raise exception 'Entidade não permitida: %', v_entity;
    end if;

    for v_field, v_new_val in
      select key, value #>> '{}' from jsonb_each(v_fields)
    loop
      if not public._admin_field_allowed(v_entity, v_field) then
        raise exception 'Campo não permitido: %.%', v_entity, v_field;
      end if;

      if v_entity = 'profiles' then
        execute format('select %I::text from public.profiles where id = $1', v_field)
          into v_old_val using p_target_user_id;

        if v_old_val is distinct from v_new_val then
          execute format('update public.profiles set %I = $1 where id = $2', v_field)
            using v_new_val, p_target_user_id;

          if v_field = 'email' and v_new_val is not null then
            update auth.users
            set email = v_new_val,
                email_confirmed_at = coalesce(email_confirmed_at, now()),
                updated_at = now()
            where id = p_target_user_id;
          end if;

          perform public._admin_log_profile_change(
            p_target_user_id, v_actor, v_entity, p_target_user_id,
            v_field, v_old_val, v_new_val, p_reason
          );

          v_changes := v_changes || jsonb_build_array(jsonb_build_object(
            'entity', v_entity,
            'field', v_field,
            'old_value', v_old_val,
            'new_value', v_new_val
          ));
        end if;

      elsif v_entity = 'buyer_profiles' then
        if not exists (select 1 from public.buyer_profiles where user_id = p_target_user_id) then
          insert into public.buyer_profiles (user_id) values (p_target_user_id);
        end if;

        execute format('select %I::text from public.buyer_profiles where user_id = $1', v_field)
          into v_old_val using p_target_user_id;

        if v_old_val is distinct from v_new_val then
          execute format('update public.buyer_profiles set %I = $1 where user_id = $2', v_field)
            using v_new_val, p_target_user_id;

          perform public._admin_log_profile_change(
            p_target_user_id, v_actor, v_entity, p_target_user_id,
            v_field, v_old_val, v_new_val, p_reason
          );

          v_changes := v_changes || jsonb_build_array(jsonb_build_object(
            'entity', v_entity,
            'field', v_field,
            'old_value', v_old_val,
            'new_value', v_new_val
          ));
        end if;

      elsif v_entity = 'supplier_profiles' then
        if not exists (select 1 from public.supplier_profiles where user_id = p_target_user_id) then
          raise exception 'Usuário não possui perfil de fornecedor';
        end if;

        if v_field = 'service_radius_km' then
          v_new_val := (v_fields->>v_field)::integer::text;
        end if;

        execute format('select %I::text from public.supplier_profiles where user_id = $1', v_field)
          into v_old_val using p_target_user_id;

        if v_old_val is distinct from v_new_val then
          if v_field = 'service_radius_km' then
            update public.supplier_profiles
            set service_radius_km = v_new_val::integer
            where user_id = p_target_user_id;
          else
            execute format('update public.supplier_profiles set %I = $1 where user_id = $2', v_field)
              using v_new_val, p_target_user_id;
          end if;

          perform public._admin_log_profile_change(
            p_target_user_id, v_actor, v_entity, p_target_user_id,
            v_field, v_old_val, v_new_val, p_reason
          );

          v_changes := v_changes || jsonb_build_array(jsonb_build_object(
            'entity', v_entity,
            'field', v_field,
            'old_value', v_old_val,
            'new_value', v_new_val
          ));
        end if;
      end if;
    end loop;
  end loop;

  if jsonb_array_length(v_changes) = 0 then
    raise exception 'Nenhum campo foi alterado';
  end if;

  perform public._admin_notify_profile_updated(p_target_user_id, v_changes);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'profile.updated_by_admin',
    'profiles',
    p_target_user_id,
    jsonb_build_object('reason', p_reason, 'changes', v_changes)
  );

  return v_changes;
end;
$$;

-- ---------------------------------------------------------------------------
-- Log de alterações fiscais (chamado pela edge function admin-refresh-cnpj)
-- ---------------------------------------------------------------------------
create or replace function public.admin_log_company_cnpj_refresh(
  p_target_user_id uuid,
  p_company_id uuid,
  p_changes jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_item jsonb;
  v_field text;
  v_old_val text;
  v_new_val text;
  v_logged jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  perform public._admin_assert_reason(p_reason);

  for v_item in select * from jsonb_array_elements(p_changes)
  loop
    v_field := v_item->>'field';
    v_old_val := v_item->>'old_value';
    v_new_val := v_item->>'new_value';

    perform public._admin_log_profile_change(
      p_target_user_id, v_actor, 'companies', p_company_id,
      v_field, v_old_val, v_new_val, p_reason
    );

    v_logged := v_logged || v_item;
  end loop;

  if jsonb_array_length(v_logged) > 0 then
    perform public._admin_notify_profile_updated(p_target_user_id, v_logged);

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      v_actor,
      'company.cnpj_refreshed_by_admin',
      'companies',
      p_company_id,
      jsonb_build_object('reason', p_reason, 'changes', v_logged, 'target_user_id', p_target_user_id)
    );
  end if;

  return v_logged;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exclusão de conta em 2 etapas
-- ---------------------------------------------------------------------------
create or replace function public.admin_request_account_deletion(
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_actor uuid := (select auth.uid());
  v_is_staff boolean;
  v_demands integer;
  v_orders integer;
  v_offers integer;
  v_has_subscription boolean;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  perform public._admin_assert_reason(p_reason);

  if p_user_id = v_actor then
    raise exception 'Não é possível excluir a própria conta';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role in ('admin', 'commercial')
  ) into v_is_staff;

  if v_is_staff then
    raise exception 'Não é permitido excluir contas de equipe';
  end if;

  select count(*)::integer into v_demands from public.demands where buyer_id = p_user_id;
  select count(*)::integer into v_orders
  from public.orders where buyer_id = p_user_id or supplier_id = p_user_id;
  select count(*)::integer into v_offers from public.offers where supplier_id = p_user_id;
  select exists (
    select 1 from public.subscriptions where user_id = p_user_id and status in ('active', 'trialing', 'past_due')
  ) into v_has_subscription;

  insert into public.admin_deletion_tokens (target_user_id, actor_id, token, reason, expires_at)
  values (p_user_id, v_actor, v_token, trim(p_reason), now() + interval '15 minutes');

  return jsonb_build_object(
    'token', v_token,
    'expires_at', (now() + interval '15 minutes'),
    'impact', jsonb_build_object(
      'demands', v_demands,
      'orders', v_orders,
      'offers', v_offers,
      'has_active_subscription', v_has_subscription
    )
  );
end;
$$;

create or replace function public.admin_confirm_account_deletion(
  p_token text,
  p_confirmation_phrase text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.admin_deletion_tokens%rowtype;
  v_actor uuid := (select auth.uid());
  v_anon_email text;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if upper(trim(p_confirmation_phrase)) <> 'EXCLUIR CONTA' then
    raise exception 'Frase de confirmação incorreta';
  end if;

  select * into v_row
  from public.admin_deletion_tokens
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Token inválido ou expirado';
  end if;

  if v_row.actor_id <> v_actor then
    raise exception 'Token não pertence ao administrador atual';
  end if;

  v_anon_email := 'deleted-' || v_row.target_user_id::text || '@anon.local';

  update public.profiles
  set
    full_name = 'Usuário removido',
    email = v_anon_email,
    phone = null,
    avatar_url = null,
    is_active = false,
    updated_at = now()
  where id = v_row.target_user_id;

  update auth.users
  set
    email = v_anon_email,
    phone = null,
    banned_until = 'infinity'::timestamptz,
    updated_at = now()
  where id = v_row.target_user_id;

  update public.admin_deletion_tokens
  set used_at = now()
  where id = v_row.id;

  perform public._admin_log_profile_change(
    v_row.target_user_id, v_actor, 'profiles', v_row.target_user_id,
    'account_deleted', 'active', 'deleted', v_row.reason
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'user.deleted_by_admin',
    'profiles',
    v_row.target_user_id,
    jsonb_build_object('reason', v_row.reason)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Histórico unificado
-- ---------------------------------------------------------------------------
create or replace function public.fetch_profile_history(
  p_target_user_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  kind text,
  actor_id uuid,
  actor_name text,
  detail text,
  field_name text,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  (
    select
      pcl.id,
      'change'::text as kind,
      pcl.actor_id,
      coalesce(ap.full_name, '—') as actor_name,
      pcl.entity_type || '.' || pcl.field_name as detail,
      pcl.field_name,
      pcl.old_value,
      pcl.new_value,
      pcl.reason,
      pcl.created_at
    from public.profile_change_logs pcl
    left join public.profiles ap on ap.id = pcl.actor_id
    where pcl.target_user_id = p_target_user_id
  )
  union all
  (
    select
      pal.id,
      'access'::text as kind,
      pal.actor_id,
      coalesce(ap.full_name, '—') as actor_name,
      pal.access_type as detail,
      null::text as field_name,
      null::text as old_value,
      null::text as new_value,
      pal.justification as reason,
      pal.created_at
    from public.profile_access_logs pal
    left join public.profiles ap on ap.id = pal.actor_id
    where pal.target_user_id = p_target_user_id
  )
  order by created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public._admin_assert_reason(text) from public;
revoke all on function public._admin_log_profile_change(uuid, uuid, text, uuid, text, text, text, text) from public;
revoke all on function public._admin_field_allowed(text, text) from public;
revoke all on function public._admin_notify_profile_updated(uuid, jsonb) from public;

revoke all on function public.search_admin_users(text, integer, integer) from public;
grant execute on function public.search_admin_users(text, integer, integer) to authenticated;

revoke all on function public.log_profile_access(uuid, text, text) from public;
grant execute on function public.log_profile_access(uuid, text, text) to authenticated;

revoke all on function public.admin_update_user_profile(uuid, jsonb, text) from public;
grant execute on function public.admin_update_user_profile(uuid, jsonb, text) to authenticated;

revoke all on function public.admin_log_company_cnpj_refresh(uuid, uuid, jsonb, text) from public;
grant execute on function public.admin_log_company_cnpj_refresh(uuid, uuid, jsonb, text) to authenticated;

revoke all on function public.admin_request_account_deletion(uuid, text) from public;
grant execute on function public.admin_request_account_deletion(uuid, text) to authenticated;

revoke all on function public.admin_confirm_account_deletion(text, text) from public;
grant execute on function public.admin_confirm_account_deletion(text, text) to authenticated;

revoke all on function public.fetch_profile_history(uuid, integer, integer) from public;
grant execute on function public.fetch_profile_history(uuid, integer, integer) to authenticated;
