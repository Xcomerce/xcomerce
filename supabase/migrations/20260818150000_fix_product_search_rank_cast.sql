-- Corrige cast record -> products na RPC de busca

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
  v_local_count int;
begin
  if auth.uid() is null and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Não autenticado';
  end if;

  create temp table _search_results on commit drop as
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
  )
  select
    e.product_row.id,
    e.product_row.supplier_id,
    e.product_row.category_id,
    e.product_row.nome,
    e.product_row.sku,
    e.product_row.descricao,
    e.product_row.marca,
    e.product_row.preco_referencia,
    e.product_row.image_url,
    e.product_row.image_urls,
    e.product_row.cidade,
    e.product_row.uf,
    e.product_row.is_active,
    e.product_row.tem_cor,
    e.product_row.tem_tamanho,
    e.product_row.tipo_tamanho,
    e.product_row.cores,
    e.product_row.tamanhos,
    e.product_row.estoque_variacoes,
    e.product_row.created_at,
    e.product_row.updated_at,
    public.product_search_rank(e.product_row, coalesce(p_query, ''), v_tokens, p_uf) as rank,
    case
      when v_has_search then (
        select public.product_search_match_source(e.product_row, e.category_name, e.supplier_name, t.token)
        from unnest(v_tokens) as t(token)
        where public.product_search_token_matches(e.product_row, e.category_name, e.supplier_name, t.token)
        limit 1
      )
      else null
    end as match_source,
    false as is_outside_uf,
    e.supplier_json as supplier,
    e.category_json as category
  from enriched e
  where p_uf is null or upper(e.product_row.uf) = upper(p_uf);

  select count(*) into v_local_count from _search_results;

  if p_uf is not null and v_local_count = 0 then
    insert into _search_results
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
    )
    select
      e.product_row.id,
      e.product_row.supplier_id,
      e.product_row.category_id,
      e.product_row.nome,
      e.product_row.sku,
      e.product_row.descricao,
      e.product_row.marca,
      e.product_row.preco_referencia,
      e.product_row.image_url,
      e.product_row.image_urls,
      e.product_row.cidade,
      e.product_row.uf,
      e.product_row.is_active,
      e.product_row.tem_cor,
      e.product_row.tem_tamanho,
      e.product_row.tipo_tamanho,
      e.product_row.cores,
      e.product_row.tamanhos,
      e.product_row.estoque_variacoes,
      e.product_row.created_at,
      e.product_row.updated_at,
      public.product_search_rank(e.product_row, coalesce(p_query, ''), v_tokens, null) as rank,
      case
        when v_has_search then (
          select public.product_search_match_source(e.product_row, e.category_name, e.supplier_name, t.token)
          from unnest(v_tokens) as t(token)
          where public.product_search_token_matches(e.product_row, e.category_name, e.supplier_name, t.token)
          limit 1
        )
        else null
      end as match_source,
      true as is_outside_uf,
      e.supplier_json as supplier,
      e.category_json as category
    from enriched e;
  end if;

  return query
  select *
  from _search_results
  order by is_outside_uf asc, rank desc, created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;
