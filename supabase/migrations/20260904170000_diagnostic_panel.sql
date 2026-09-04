-- Painel de diagnóstico admin: eventos, agregação, near-miss, sugestões de variante e alertas.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.diagnostic_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  group_key text not null,
  user_id uuid references public.profiles (id) on delete set null,
  user_role text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint diagnostic_events_user_role_check check (
    user_role is null or user_role in ('buyer', 'supplier')
  ),
  constraint diagnostic_events_type_check check (
    event_type in (
      'search_no_result',
      'category_not_found',
      'variant_value_new',
      'demand_no_match',
      'demand_expired_no_offer',
      'product_form_abandoned',
      'server_error_500',
      'upload_failure',
      'request_timeout',
      'client_js_error'
    )
  )
);

create index idx_diagnostic_events_group on public.diagnostic_events (event_type, group_key, created_at desc);
create index idx_diagnostic_events_user on public.diagnostic_events (user_id, group_key);
create index idx_diagnostic_events_created on public.diagnostic_events (created_at desc);

create table public.diagnostic_resolutions (
  group_key text not null,
  event_type text not null,
  resolution_type text not null,
  resolved_by uuid not null references public.profiles (id) on delete set null,
  resolved_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (group_key, event_type),
  constraint diagnostic_resolutions_type_check check (
    resolution_type in (
      'marked_resolved',
      'category_created',
      'variant_added',
      'technical_fixed'
    )
  )
);

create index idx_diagnostic_resolutions_resolved_at on public.diagnostic_resolutions (resolved_at desc);

create table public.match_evaluation_logs (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  supplier_id uuid not null references public.profiles (id) on delete cascade,
  outcome text not null,
  skip_reason text,
  score integer,
  evaluated_at timestamptz not null default now(),
  constraint match_evaluation_logs_outcome_check check (
    outcome in ('matched', 'skipped')
  ),
  constraint match_evaluation_logs_skip_reason_check check (
    skip_reason is null or skip_reason in (
      'variant_mismatch',
      'out_of_region',
      'not_approved',
      'no_category',
      'already_matched'
    )
  )
);

create index idx_match_evaluation_logs_demand on public.match_evaluation_logs (demand_id, evaluated_at desc);
create index idx_match_evaluation_logs_supplier on public.match_evaluation_logs (supplier_id);

create table public.variant_value_suggestions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  axis_name text not null,
  value text not null,
  normalized text not null,
  source_group_key text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (category_id, axis_name, normalized)
);

create index idx_variant_value_suggestions_category on public.variant_value_suggestions (category_id, axis_name);

create table public.diagnostic_alert_sent (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  event_type text not null,
  affected_users integer not null,
  sent_at timestamptz not null default now()
);

create index idx_diagnostic_alert_sent_group on public.diagnostic_alert_sent (group_key, sent_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.diagnostic_events enable row level security;
alter table public.diagnostic_resolutions enable row level security;
alter table public.match_evaluation_logs enable row level security;
alter table public.variant_value_suggestions enable row level security;
alter table public.diagnostic_alert_sent enable row level security;

create policy diagnostic_events_select on public.diagnostic_events
  for select to authenticated
  using (public.is_admin());

create policy diagnostic_resolutions_select on public.diagnostic_resolutions
  for select to authenticated
  using (public.is_admin());

create policy diagnostic_resolutions_admin_all on public.diagnostic_resolutions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy match_evaluation_logs_select on public.match_evaluation_logs
  for select to authenticated
  using (public.is_admin());

create policy variant_value_suggestions_select on public.variant_value_suggestions
  for select to authenticated
  using (true);

create policy variant_value_suggestions_admin_insert on public.variant_value_suggestions
  for insert to authenticated
  with check (public.is_admin());

create policy diagnostic_alert_sent_select on public.diagnostic_alert_sent
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._diagnostic_normalize_part(p_value text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g')));
$$;

create or replace function public._diagnostic_section_types(p_section text)
returns text[]
language sql
immutable
as $$
  select case p_section
    when 'friction' then array[
      'search_no_result',
      'category_not_found',
      'variant_value_new',
      'demand_no_match',
      'demand_expired_no_offer',
      'product_form_abandoned'
    ]::text[]
    when 'technical' then array[
      'server_error_500',
      'upload_failure',
      'request_timeout',
      'client_js_error'
    ]::text[]
    else array[]::text[]
  end;
$$;

create or replace function public._diagnostic_period_start(p_period text)
returns timestamptz
language sql
stable
as $$
  select case p_period
    when 'today' then date_trunc('day', now())
    when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    else now() - interval '7 days'
  end;
$$;

-- ---------------------------------------------------------------------------
-- log_diagnostic_event — ingestão (cliente autenticado ou service_role)
-- ---------------------------------------------------------------------------
create or replace function public.log_diagnostic_event(
  p_event_type text,
  p_group_key text,
  p_payload jsonb default '{}'::jsonb,
  p_user_role text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_types text[];
begin
  v_types := array[
    'search_no_result',
    'category_not_found',
    'variant_value_new',
    'demand_no_match',
    'demand_expired_no_offer',
    'product_form_abandoned',
    'server_error_500',
    'upload_failure',
    'request_timeout',
    'client_js_error'
  ];

  if p_event_type is null or not (p_event_type = any (v_types)) then
    raise exception 'Tipo de evento inválido: %', p_event_type;
  end if;

  if p_group_key is null or char_length(trim(p_group_key)) < 3 then
    raise exception 'group_key inválido';
  end if;

  if v_user_id is null and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Autenticação necessária';
  end if;

  if p_user_role is not null and p_user_role not in ('buyer', 'supplier') then
    raise exception 'user_role inválido';
  end if;

  insert into public.diagnostic_events (event_type, group_key, user_id, user_role, payload)
  values (
    p_event_type,
    left(trim(p_group_key), 500),
    v_user_id,
    p_user_role,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_diagnostic_event(text, text, jsonb, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- fetch_diagnostic_groups — agregação admin
-- ---------------------------------------------------------------------------
create or replace function public.fetch_diagnostic_groups(
  p_section text,
  p_period text default '7d',
  p_user_role text default null,
  p_hide_resolved boolean default true,
  p_limit integer default 50
)
returns table (
  group_key text,
  event_type text,
  affected_users bigint,
  total_occurrences bigint,
  first_seen timestamptz,
  last_seen timestamptz,
  sample_payload jsonb,
  resolution_type text,
  resolved_at timestamptz,
  resolved_by uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_types text[];
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  v_types := public._diagnostic_section_types(p_section);
  if array_length(v_types, 1) is null then
    raise exception 'Seção inválida';
  end if;

  v_since := public._diagnostic_period_start(coalesce(p_period, '7d'));

  return query
  with filtered as (
    select e.*
    from public.diagnostic_events e
    where e.event_type = any (v_types)
      and e.created_at >= v_since
      and (p_user_role is null or e.user_role = p_user_role)
  ),
  grouped as (
    select
      f.group_key,
      f.event_type,
      count(distinct f.user_id) filter (where f.user_id is not null) as affected_users,
      count(*) as total_occurrences,
      min(f.created_at) as first_seen,
      max(f.created_at) as last_seen,
      (
        select f2.payload
        from filtered f2
        where f2.group_key = f.group_key and f2.event_type = f.event_type
        order by f2.created_at desc
        limit 1
      ) as sample_payload
    from filtered f
    group by f.group_key, f.event_type
  )
  select
    g.group_key,
    g.event_type,
    g.affected_users,
    g.total_occurrences,
    g.first_seen,
    g.last_seen,
    g.sample_payload,
    r.resolution_type,
    r.resolved_at,
    r.resolved_by
  from grouped g
  left join public.diagnostic_resolutions r
    on r.group_key = g.group_key and r.event_type = g.event_type
  where not p_hide_resolved or r.resolved_at is null
  order by g.affected_users desc, g.total_occurrences desc, g.last_seen desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

grant execute on function public.fetch_diagnostic_groups(text, text, text, boolean, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_diagnostic_group
-- ---------------------------------------------------------------------------
create or replace function public.resolve_diagnostic_group(
  p_group_key text,
  p_event_type text,
  p_resolution_type text,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if p_resolution_type not in (
    'marked_resolved', 'category_created', 'variant_added', 'technical_fixed'
  ) then
    raise exception 'resolution_type inválido';
  end if;

  insert into public.diagnostic_resolutions (
    group_key, event_type, resolution_type, resolved_by, notes, metadata
  )
  values (
    p_group_key,
    p_event_type,
    p_resolution_type,
    v_actor,
    p_notes,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (group_key, event_type) do update set
    resolution_type = excluded.resolution_type,
    resolved_by = excluded.resolved_by,
    resolved_at = now(),
    notes = excluded.notes,
    metadata = excluded.metadata;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'diagnostic.resolved',
    'diagnostic_group',
    null,
    jsonb_build_object(
      'group_key', p_group_key,
      'event_type', p_event_type,
      'resolution_type', p_resolution_type
    )
  );
end;
$$;

grant execute on function public.resolve_diagnostic_group(text, text, text, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- fetch_demand_near_miss
-- ---------------------------------------------------------------------------
create or replace function public.fetch_demand_near_miss(p_demand_id uuid)
returns table (
  supplier_id uuid,
  supplier_name text,
  service_city text,
  service_uf text,
  outcome text,
  skip_reason text,
  score integer
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
  select
    mel.supplier_id,
    coalesce(p.full_name, sp.store_name, 'Fornecedor') as supplier_name,
    sp.service_city,
    sp.service_uf,
    mel.outcome,
    mel.skip_reason,
    mel.score
  from public.match_evaluation_logs mel
  join public.supplier_profiles sp on sp.user_id = mel.supplier_id
  left join public.profiles p on p.id = mel.supplier_id
  where mel.demand_id = p_demand_id
  order by
    case when mel.outcome = 'matched' then 0 else 1 end,
    mel.score desc nulls last,
    mel.evaluated_at desc;
end;
$$;

grant execute on function public.fetch_demand_near_miss(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- add_variant_value_suggestion
-- ---------------------------------------------------------------------------
create or replace function public.add_variant_value_suggestion(
  p_category_id uuid,
  p_axis_name text,
  p_value text,
  p_source_group_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
  v_normalized text;
  v_group_key text;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if p_category_id is null or p_axis_name is null or trim(p_value) = '' then
    raise exception 'Parâmetros inválidos';
  end if;

  v_normalized := public.normalize_variant_value(p_value);

  insert into public.variant_value_suggestions (
    category_id, axis_name, value, normalized, source_group_key, created_by
  )
  values (
    p_category_id,
    trim(p_axis_name),
    trim(p_value),
    v_normalized,
    p_source_group_key,
    v_actor
  )
  on conflict (category_id, axis_name, normalized) do update set
    value = excluded.value,
    source_group_key = coalesce(excluded.source_group_key, variant_value_suggestions.source_group_key)
  returning id into v_id;

  v_group_key := coalesce(
    p_source_group_key,
    'variant_new:' || p_category_id::text || ':' || public._diagnostic_normalize_part(p_axis_name) || ':' || v_normalized
  );

  perform public.resolve_diagnostic_group(
    v_group_key,
    'variant_value_new',
    'variant_added',
    'Valor adicionado à lista de sugestões',
    jsonb_build_object('category_id', p_category_id, 'axis_name', p_axis_name, 'value', trim(p_value))
  );

  return v_id;
end;
$$;

grant execute on function public.add_variant_value_suggestion(uuid, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- fetch_diagnostic_alert_candidates — usado pelo cron de alertas
-- ---------------------------------------------------------------------------
create or replace function public.fetch_diagnostic_alert_candidates(
  p_threshold integer default 5,
  p_window_hours integer default 24
)
returns table (
  group_key text,
  event_type text,
  affected_users bigint,
  total_occurrences bigint,
  sample_payload jsonb,
  label text
)
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select
      e.group_key,
      e.event_type,
      count(distinct e.user_id) filter (where e.user_id is not null) as affected_users,
      count(*) as total_occurrences,
      (
        select e2.payload
        from public.diagnostic_events e2
        where e2.group_key = e.group_key and e2.event_type = e.event_type
        order by e2.created_at desc
        limit 1
      ) as sample_payload
    from public.diagnostic_events e
    where e.created_at >= now() - make_interval(hours => p_window_hours)
    group by e.group_key, e.event_type
    having count(distinct e.user_id) filter (where e.user_id is not null) >= p_threshold
  )
  select
    r.group_key,
    r.event_type,
    r.affected_users,
    r.total_occurrences,
    r.sample_payload,
    coalesce(
      r.sample_payload->>'query',
      r.sample_payload->>'value',
      r.sample_payload->>'message',
      r.group_key
    ) as label
  from recent r
  left join public.diagnostic_resolutions dr
    on dr.group_key = r.group_key and dr.event_type = r.event_type
  where dr.resolved_at is null
    and not exists (
      select 1
      from public.diagnostic_alert_sent das
      where das.group_key = r.group_key
        and das.sent_at >= now() - make_interval(hours => p_window_hours)
    );
$$;

grant execute on function public.fetch_diagnostic_alert_candidates(integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- get_variant_axis_values — incluir sugestões admin
-- ---------------------------------------------------------------------------
create or replace function public.get_variant_axis_values(
  p_category_id uuid,
  p_axis_name text,
  p_query text default '',
  p_side text default 'buyer',
  p_limit integer default 20
)
returns table (
  value text,
  normalized text,
  supplier_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with category_tree as (
    select c.id
    from public.categories c
    where c.id = p_category_id
       or c.parent_id = p_category_id
       or c.id = (select parent_id from public.categories where id = p_category_id)
  ),
  axis_known as (
    select exists (
      select 1
      from public.products p
      cross join jsonb_array_elements(coalesce(p.variant_axes, '[]'::jsonb)) ax(elem)
      where p.category_id in (select id from category_tree)
        and p.is_active = true
        and p.is_draft = false
        and public.normalize_variant_value(ax.elem->>'name')
            = public.normalize_variant_value(p_axis_name)
    )
    or exists (
      select 1
      from public.variant_value_suggestions vs
      where vs.category_id in (select id from category_tree)
        and public.normalize_variant_value(vs.axis_name)
            = public.normalize_variant_value(p_axis_name)
    ) as known
  ),
  modern_options as (
    select
      opt.val as raw_value,
      public.normalize_variant_value(opt.val) as norm_value,
      p.supplier_id
    from public.products p
    cross join jsonb_array_elements(coalesce(p.variant_axes, '[]'::jsonb)) ax(elem)
    cross join lateral jsonb_array_elements_text(coalesce(ax.elem->'options', '[]'::jsonb)) opt(val)
    where p.category_id in (select id from category_tree)
      and p.is_active = true
      and p.is_draft = false
      and jsonb_array_length(coalesce(p.variant_axes, '[]'::jsonb)) > 0
      and public.normalize_variant_value(ax.elem->>'name')
          = public.normalize_variant_value(p_axis_name)
      and public.normalize_variant_value(opt.val) <> ''
  ),
  legacy_color_options as (
    select
      c.val as raw_value,
      public.normalize_variant_value(c.val) as norm_value,
      p.supplier_id
    from public.products p
    cross join lateral unnest(p.cores) as c(val)
    where p.category_id in (select id from category_tree)
      and p.is_active = true
      and p.is_draft = false
      and coalesce(jsonb_array_length(p.variant_axes), 0) = 0
      and p.tem_cor
      and public.normalize_variant_value(p_axis_name) in ('cor', 'cores')
      and public.normalize_variant_value(c.val) <> ''
  ),
  legacy_size_options as (
    select
      t.val as raw_value,
      public.normalize_variant_value(t.val) as norm_value,
      p.supplier_id
    from public.products p
    cross join lateral unnest(p.tamanhos) as t(val)
    where p.category_id in (select id from category_tree)
      and p.is_active = true
      and p.is_draft = false
      and coalesce(jsonb_array_length(p.variant_axes), 0) = 0
      and p.tem_tamanho
      and public.normalize_variant_value(p_axis_name) in ('tamanho', 'tamanhos', 'numeracao', 'numeração', 'numeracao')
      and public.normalize_variant_value(t.val) <> ''
  ),
  admin_suggestions as (
    select
      vs.value as raw_value,
      vs.normalized as norm_value,
      null::uuid as supplier_id
    from public.variant_value_suggestions vs
    where vs.category_id in (select id from category_tree)
      and public.normalize_variant_value(vs.axis_name)
          = public.normalize_variant_value(p_axis_name)
      and vs.normalized <> ''
  ),
  all_options as (
    select * from modern_options
    union all
    select * from legacy_color_options
    union all
    select * from legacy_size_options
    union all
    select * from admin_suggestions
  ),
  filtered as (
    select *
    from all_options
    where public.normalize_variant_value(coalesce(p_query, '')) = ''
       or norm_value like '%' || public.normalize_variant_value(p_query) || '%'
  ),
  aggregated as (
    select
      norm_value,
      mode() within group (order by raw_value) as display_value,
      count(distinct supplier_id) as supplier_count
    from filtered
    where norm_value <> ''
    group by norm_value
  )
  select
    a.display_value as value,
    a.norm_value as normalized,
    a.supplier_count
  from aggregated a
  cross join axis_known ak
  where ak.known
  order by a.supplier_count desc, a.display_value
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

-- ---------------------------------------------------------------------------
-- Template de e-mail para alertas
-- ---------------------------------------------------------------------------
insert into public.email_templates (key, name, category, subject, html_body, variables)
values (
  'diagnostic_threshold_alert',
  'Alerta de diagnóstico',
  'transactional',
  'Alerta: {{issue_label}} afetou {{affected_users}} pessoas',
  '<p>Olá,</p><p>Um problema recorrente passou do limite de atenção na plataforma:</p><ul><li><strong>{{issue_type}}</strong>: {{issue_label}}</li><li><strong>Pessoas afetadas (24h):</strong> {{affected_users}}</li><li><strong>Ocorrências totais (24h):</strong> {{total_occurrences}}</li></ul><p><a href="{{action_url}}">Abrir painel de diagnóstico</a></p>',
  '["issue_type","issue_label","affected_users","total_occurrences","action_url"]'::jsonb
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  html_body = excluded.html_body,
  variables = excluded.variables;
