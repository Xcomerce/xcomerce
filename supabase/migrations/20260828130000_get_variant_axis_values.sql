-- RPC: valores de eixo de variação agregados por categoria.

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
  all_options as (
    select * from modern_options
    union all
    select * from legacy_color_options
    union all
    select * from legacy_size_options
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

grant execute on function public.get_variant_axis_values(uuid, text, text, text, integer)
  to authenticated, service_role;
