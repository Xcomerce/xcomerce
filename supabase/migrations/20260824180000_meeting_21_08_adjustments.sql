-- Ajustes reunião 21/08/2026: filtro por cidade no feed, multi-cidade em demandas,
-- prazo de entrega datetime em propostas, favoritos de categoria.

-- ---------------------------------------------------------------------------
-- Helper: produto corresponde a alguma cidade selecionada
-- ---------------------------------------------------------------------------
create or replace function public.product_matches_cities(
  p_cidade text,
  p_uf char(2),
  p_cidades jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_cidades is null
    or jsonb_typeof(p_cidades) <> 'array'
    or jsonb_array_length(p_cidades) = 0
    or exists (
      select 1
      from jsonb_array_elements(p_cidades) elem
      where lower(trim(elem->>'cidade')) = lower(trim(coalesce(p_cidade, '')))
        and upper(trim(elem->>'uf')) = upper(trim(coalesce(p_uf::text, '')))
    );
$$;

-- ---------------------------------------------------------------------------
-- Demandas: múltiplas cidades de entrega
-- ---------------------------------------------------------------------------
alter table public.demands
  add column if not exists cidades jsonb not null default '[]'::jsonb;

comment on column public.demands.cidades is
  'Lista de cidades alvo da demanda: [{ "cidade": "Franca", "uf": "SP" }, ...].';

-- ---------------------------------------------------------------------------
-- Propostas: prazo de entrega com data/hora
-- ---------------------------------------------------------------------------
alter table public.offers
  add column if not exists prazo_entrega_em timestamptz;

comment on column public.offers.prazo_entrega_em is
  'Prazo de entrega prometido pelo fornecedor (data e hora).';

-- ---------------------------------------------------------------------------
-- Comprador: categorias favoritas
-- ---------------------------------------------------------------------------
alter table public.buyer_profiles
  add column if not exists favorite_category_ids uuid[] not null default '{}';

comment on column public.buyer_profiles.favorite_category_ids is
  'IDs de categorias favoritas do comprador para sugestões rápidas.';

-- ---------------------------------------------------------------------------
-- Feed: filtro por cidades
-- ---------------------------------------------------------------------------
create or replace function public.search_feed_products(
  p_query text default null,
  p_category_ids uuid[] default null,
  p_uf char(2) default null,
  p_cidades jsonb default null,
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
  v_has_cities boolean := p_cidades is not null
    and jsonb_typeof(p_cidades) = 'array'
    and jsonb_array_length(p_cidades) > 0;
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
      )
      + case
          when v_has_cities and public.product_matches_cities((e.product_row).cidade, (e.product_row).uf, p_cidades)
            then 0.75
          else 0
        end as rank,
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
    where (
      case
        when v_has_cities then public.product_matches_cities(r.cidade, r.uf, p_cidades)
        when p_uf is not null then upper(r.uf) = upper(p_uf)
        else true
      end
    )
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
  where not v_has_cities and p_uf is null
     or v_has_cities
     or p_uf is null
     or (select value from has_local)

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
  where (v_has_cities or p_uf is not null)
    and not (select value from has_local)

  order by is_outside_uf asc, rank desc, created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.product_matches_cities(text, char(2), jsonb) to authenticated, service_role;
