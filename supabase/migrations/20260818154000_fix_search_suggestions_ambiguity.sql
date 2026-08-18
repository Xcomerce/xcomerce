-- Corrige ambiguidade suggestion/suggestion_type na RPC de sugestões

create or replace function public.search_product_suggestions(
  p_query text,
  p_limit int default 8
)
returns table (
  suggestion text,
  suggestion_type text,
  score float
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_normalized text := public.normalize_search_text(p_query);
  v_limit int := greatest(coalesce(p_limit, 8), 1);
begin
  if auth.uid() is null and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Não autenticado';
  end if;

  return query
  with base as (
    select
      p.nome,
      p.marca,
      c.name as category_name,
      coalesce(sp.store_name, comp.nome_fantasia, comp.razao_social) as supplier_name,
      p.cores,
      p.tamanhos
    from public.products p
    join public.supplier_profiles sp on sp.user_id = p.supplier_id and sp.status = 'aprovado'
    left join public.companies comp on comp.id = sp.company_id
    join public.categories c on c.id = p.category_id
    where p.is_active = true
  ),
  candidates as (
    select distinct on (raw.suggestion, raw.suggestion_type)
      raw.suggestion,
      raw.suggestion_type,
      raw.score
    from (
      select
        b.nome as suggestion,
        'produto'::text as suggestion_type,
        extensions.similarity(public.normalize_search_text(b.nome), v_normalized)::float as score
      from base b
      where length(v_normalized) >= 2
        and (
          public.normalize_search_text(b.nome) like v_normalized || '%'
          or extensions.similarity(public.normalize_search_text(b.nome), v_normalized) > 0.25
        )

      union all

      select
        b.marca as suggestion,
        'marca'::text,
        extensions.similarity(public.normalize_search_text(b.marca), v_normalized)::float
      from base b
      where b.marca is not null
        and length(v_normalized) >= 2
        and (
          public.normalize_search_text(b.marca) like v_normalized || '%'
          or extensions.similarity(public.normalize_search_text(b.marca), v_normalized) > 0.25
        )

      union all

      select
        b.category_name as suggestion,
        'categoria'::text,
        extensions.similarity(public.normalize_search_text(b.category_name), v_normalized)::float
      from base b
      where length(v_normalized) >= 2
        and public.normalize_search_text(b.category_name) like '%' || v_normalized || '%'

      union all

      select
        color_val as suggestion,
        'cor'::text,
        extensions.similarity(public.normalize_search_text(color_val), v_normalized)::float
      from base b
      cross join lateral unnest(coalesce(b.cores, '{}'::text[])) as color_val
      where length(v_normalized) >= 2
        and public.normalize_search_text(color_val) like v_normalized || '%'

      union all

      select
        b.nome as suggestion,
        'produto'::text,
        0.1::float as score
      from base b
      where length(v_normalized) < 2

      union all

      select
        b.marca as suggestion,
        'marca'::text,
        0.1::float
      from base b
      where length(v_normalized) < 2 and b.marca is not null

      union all

      select
        b.category_name as suggestion,
        'categoria'::text,
        0.1::float
      from base b
      where length(v_normalized) < 2
    ) raw
    where raw.suggestion is not null and btrim(raw.suggestion) <> ''
    order by raw.suggestion, raw.suggestion_type, raw.score desc
  )
  select c.suggestion, c.suggestion_type, c.score
  from candidates c
  order by c.score desc, c.suggestion asc
  limit v_limit;
end;
$$;
