-- Aceita tokens de tamanho de 1 caractere (P, M, G) e melhora ranking multi-token

create or replace function public.is_valid_search_size_token(p_token text)
returns boolean
language sql
immutable
as $$
  select public.normalize_search_text(p_token) in ('p', 'm', 'g');
$$;

create or replace function public.parse_search_tokens(p_query text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(token order by ord),
    '{}'::text[]
  )
  from (
    select
      token,
      min(ord) as ord
    from (
      select
        trim(both from token) as token,
        ordinality as ord
      from unnest(regexp_split_to_array(public.normalize_search_text(p_query), '\s+')) with ordinality as t(token, ordinality)
    ) raw
    where (
      length(token) >= 2
      or public.is_valid_search_size_token(token)
    )
      and token not in ('de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'por')
    group by token
  ) deduped;
$$;

create or replace function public.product_search_matched_token_count(
  p_product public.products,
  p_category_name text,
  p_supplier_name text,
  p_tokens text[]
)
returns int
language sql
immutable
as $$
  select count(*)::int
  from unnest(p_tokens) as token
  where public.product_search_token_matches(
    p_product,
    p_category_name,
    p_supplier_name,
    token
  );
$$;

create or replace function public.product_search_rank(
  p_product public.products,
  p_query text,
  p_tokens text[],
  p_preferred_uf char(2),
  p_category_name text default null,
  p_supplier_name text default null
)
returns float
language sql
immutable
as $$
  select
    coalesce(ts_rank_cd(p_product.search_document, plainto_tsquery('portuguese', public.normalize_search_text(p_query))), 0)::float
    + case when p_preferred_uf is not null and upper(p_product.uf) = upper(p_preferred_uf) then 0.5 else 0 end
    + case when public.normalize_search_text(p_product.nome) like '%' || public.normalize_search_text(p_query) || '%' then 0.3 else 0 end
    + (
      0.1 * public.product_search_matched_token_count(
        p_product,
        coalesce(p_category_name, ''),
        coalesce(p_supplier_name, ''),
        coalesce(p_tokens, '{}'::text[])
      )
    )::float;
$$;

create or replace function public.search_feed_products(
  p_query text default null,
  p_category_ids uuid[] default null,
  p_uf char(2) default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  supplier_id uuid,
  category_id uuid,
  nome text,
  sku text,
  descricao text,
  marca text,
  preco_referencia numeric,
  image_url text,
  image_urls text[],
  cidade text,
  uf char(2),
  is_active boolean,
  tem_cor boolean,
  tem_tamanho boolean,
  tipo_tamanho public.product_size_type,
  cores text[],
  tamanhos text[],
  estoque_variacoes jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  rank float,
  match_source text,
  is_outside_uf boolean,
  supplier jsonb,
  category jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tokens text[] := public.parse_search_tokens(p_query);
  v_has_search boolean := cardinality(v_tokens) > 0;
begin
  if auth.uid() is null and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Não autenticado';
  end if;

  return query
  with enriched as (
    select
      p as product_row,
      c.name as category_name,
      coalesce(sp.store_name, comp.nome_fantasia, comp.razao_social, '') as supplier_name,
      jsonb_build_object(
        'status', sp.status,
        'store_name', sp.store_name,
        'avg_rating', sp.avg_rating,
        'company', jsonb_build_object(
          'nome_fantasia', comp.nome_fantasia,
          'razao_social', comp.razao_social
        )
      ) as supplier_json,
      jsonb_build_object('name', c.name) as category_json
    from public.products p
    join public.supplier_profiles sp on sp.user_id = p.supplier_id and sp.status = 'aprovado'
    left join public.companies comp on comp.id = sp.company_id
    join public.categories c on c.id = p.category_id
    where p.is_active = true
      and (p_category_ids is null or p.category_id = any(p_category_ids))
      and (
        not v_has_search
        or public.product_matches_all_search_tokens(
          p,
          c.name,
          coalesce(sp.store_name, comp.nome_fantasia, comp.razao_social, ''),
          v_tokens
        )
      )
  ),
  ranked as (
    select
      (e.product_row).id,
      (e.product_row).supplier_id,
      (e.product_row).category_id,
      (e.product_row).nome,
      (e.product_row).sku,
      (e.product_row).descricao,
      (e.product_row).marca,
      (e.product_row).preco_referencia,
      (e.product_row).image_url,
      (e.product_row).image_urls,
      (e.product_row).cidade,
      (e.product_row).uf,
      (e.product_row).is_active,
      (e.product_row).tem_cor,
      (e.product_row).tem_tamanho,
      (e.product_row).tipo_tamanho,
      (e.product_row).cores,
      (e.product_row).tamanhos,
      (e.product_row).estoque_variacoes,
      (e.product_row).created_at,
      (e.product_row).updated_at,
      public.product_search_rank(
        e.product_row,
        coalesce(p_query, ''),
        v_tokens,
        p_uf,
        e.category_name,
        e.supplier_name
      ) as rank,
      case
        when v_has_search then (
          select public.product_search_match_source(e.product_row, e.category_name, e.supplier_name, t.token)
          from unnest(v_tokens) as t(token)
          where public.product_search_token_matches(e.product_row, e.category_name, e.supplier_name, t.token)
          limit 1
        )
        else null
      end as match_source,
      e.supplier_json as supplier,
      e.category_json as category
    from enriched e
  ),
  local_results as (
    select
      r.*,
      false as is_outside_uf
    from ranked r
    where p_uf is null or upper(r.uf) = upper(p_uf)
  ),
  has_local as (
    select exists (select 1 from local_results) as value
  )
  select
    lr.id,
    lr.supplier_id,
    lr.category_id,
    lr.nome,
    lr.sku,
    lr.descricao,
    lr.marca,
    lr.preco_referencia,
    lr.image_url,
    lr.image_urls,
    lr.cidade,
    lr.uf,
    lr.is_active,
    lr.tem_cor,
    lr.tem_tamanho,
    lr.tipo_tamanho,
    lr.cores,
    lr.tamanhos,
    lr.estoque_variacoes,
    lr.created_at,
    lr.updated_at,
    lr.rank,
    lr.match_source,
    lr.is_outside_uf,
    lr.supplier,
    lr.category
  from local_results lr
  where p_uf is null or (select value from has_local)

  union all

  select
    r.id,
    r.supplier_id,
    r.category_id,
    r.nome,
    r.sku,
    r.descricao,
    r.marca,
    r.preco_referencia,
    r.image_url,
    r.image_urls,
    r.cidade,
    r.uf,
    r.is_active,
    r.tem_cor,
    r.tem_tamanho,
    r.tipo_tamanho,
    r.cores,
    r.tamanhos,
    r.estoque_variacoes,
    r.created_at,
    r.updated_at,
    r.rank,
    r.match_source,
    true as is_outside_uf,
    r.supplier,
    r.category
  from ranked r
  where p_uf is not null
    and not (select value from has_local)

  order by is_outside_uf asc, rank desc, created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.is_valid_search_size_token(text) to authenticated, service_role;
