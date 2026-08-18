-- Busca expandida de produtos: FTS, trigram, variantes e sugestões

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.products
  add column if not exists search_document tsvector;

-- Normalização PT-BR para busca
create or replace function public.normalize_search_text(p_text text)
returns text
language sql
immutable
as $$
  select lower(trim(extensions.unaccent(coalesce(p_text, ''))));
$$;

-- Stopwords mínimas em PT
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
    where length(token) >= 2
      and token not in ('de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'por')
    group by token
  ) deduped;
$$;

-- Sinônimos de moda / variantes
create or replace function public.expand_search_token(p_token text)
returns text[]
language sql
immutable
as $$
  select case public.normalize_search_text(p_token)
    when 'preta' then array['preta', 'preto', 'pretas', 'pretos']
    when 'pretas' then array['preta', 'preto', 'pretas', 'pretos']
    when 'preto' then array['preta', 'preto', 'pretas', 'pretos']
    when 'pretos' then array['preta', 'preto', 'pretas', 'pretos']
    when 'branca' then array['branca', 'branco', 'brancas', 'brancos']
    when 'brancas' then array['branca', 'branco', 'brancas', 'brancos']
    when 'branco' then array['branca', 'branco', 'brancas', 'brancos']
    when 'brancos' then array['branca', 'branco', 'brancas', 'brancos']
    when 'azul' then array['azul', 'azuis']
    when 'azuis' then array['azul', 'azuis']
    when 'camisa' then array['camisa', 'camiseta', 'camisas', 'camisetas']
    when 'camisas' then array['camisa', 'camiseta', 'camisas', 'camisetas']
    when 'camiseta' then array['camisa', 'camiseta', 'camisas', 'camisetas']
    when 'camisetas' then array['camisa', 'camiseta', 'camisas', 'camisetas']
    when 'calcado' then array['calcado', 'calcados', 'calçado', 'calçados']
    when 'calcados' then array['calcado', 'calcados', 'calçado', 'calçados']
    when 'calçado' then array['calcado', 'calcados', 'calçado', 'calçados']
    when 'calçados' then array['calcado', 'calcados', 'calçado', 'calçados']
    else array[public.normalize_search_text(p_token)]
  end;
$$;

create or replace function public.build_product_search_document(p_product public.products)
returns tsvector
language sql
immutable
as $$
  select
    setweight(to_tsvector('portuguese', public.normalize_search_text(p_product.nome)), 'A')
    || setweight(to_tsvector('portuguese', public.normalize_search_text(coalesce(p_product.marca, ''))), 'B')
    || setweight(to_tsvector('portuguese', public.normalize_search_text(coalesce(p_product.sku, ''))), 'B')
    || setweight(to_tsvector('portuguese', public.normalize_search_text(coalesce(p_product.descricao, ''))), 'C')
    || setweight(
      to_tsvector(
        'portuguese',
        public.normalize_search_text(array_to_string(coalesce(p_product.cores, '{}'::text[]), ' '))
      ),
      'B'
    )
    || setweight(
      to_tsvector(
        'portuguese',
        public.normalize_search_text(array_to_string(coalesce(p_product.tamanhos, '{}'::text[]), ' '))
      ),
      'C'
    );
$$;

create or replace function public.products_search_document_trigger_fn()
returns trigger
language plpgsql
as $$
begin
  new.search_document := public.build_product_search_document(new);
  return new;
end;
$$;

drop trigger if exists products_search_document_trigger on public.products;
create trigger products_search_document_trigger
  before insert or update of nome, marca, sku, descricao, cores, tamanhos
  on public.products
  for each row
  execute function public.products_search_document_trigger_fn();

create index if not exists idx_products_search_document
  on public.products using gin (search_document);

create index if not exists idx_products_nome_trgm
  on public.products using gin (public.normalize_search_text(nome) extensions.gin_trgm_ops);

-- Produto visível no feed (equivalente à policy products_select para compradores)
create or replace function public.is_feed_product_visible(p_product public.products)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_product.is_active
    and exists (
      select 1
      from public.supplier_profiles sp
      where sp.user_id = p_product.supplier_id
        and sp.status = 'aprovado'
    );
$$;

-- Token casa com produto (FTS, variantes, trigram ou campos relacionados)
create or replace function public.product_search_token_matches(
  p_product public.products,
  p_category_name text,
  p_supplier_name text,
  p_token text
)
returns boolean
language sql
immutable
as $$
  with variants as (
    select unnest(public.expand_search_token(p_token)) as variant
  )
  select
    coalesce(
      p_product.search_document @@ plainto_tsquery('portuguese', public.normalize_search_text(p_token)),
      false
    )
    or exists (
      select 1
      from variants v
      where public.variant_array_contains(p_product.cores, v.variant)
        or public.variant_array_contains(p_product.tamanhos, v.variant)
    )
    or public.normalize_search_text(p_product.nome) like '%' || public.normalize_search_text(p_token) || '%'
    or public.normalize_search_text(coalesce(p_product.marca, '')) like '%' || public.normalize_search_text(p_token) || '%'
    or public.normalize_search_text(coalesce(p_product.descricao, '')) like '%' || public.normalize_search_text(p_token) || '%'
    or public.normalize_search_text(coalesce(p_product.sku, '')) like '%' || public.normalize_search_text(p_token) || '%'
    or public.normalize_search_text(coalesce(p_category_name, '')) like '%' || public.normalize_search_text(p_token) || '%'
    or public.normalize_search_text(coalesce(p_supplier_name, '')) like '%' || public.normalize_search_text(p_token) || '%'
    or extensions.similarity(public.normalize_search_text(p_product.nome), public.normalize_search_text(p_token)) > 0.35
    or extensions.similarity(public.normalize_search_text(coalesce(p_product.marca, '')), public.normalize_search_text(p_token)) > 0.35;
$$;

create or replace function public.product_search_match_source(
  p_product public.products,
  p_category_name text,
  p_supplier_name text,
  p_token text
)
returns text
language sql
immutable
as $$
  with variants as (
    select unnest(public.expand_search_token(p_token)) as variant
  )
  select case
    when public.normalize_search_text(p_product.nome) like '%' || public.normalize_search_text(p_token) || '%'
      or extensions.similarity(public.normalize_search_text(p_product.nome), public.normalize_search_text(p_token)) > 0.35
      then 'nome'
    when exists (
      select 1 from variants v
      where public.variant_array_contains(p_product.cores, v.variant)
    ) then 'cor'
    when exists (
      select 1 from variants v
      where public.variant_array_contains(p_product.tamanhos, v.variant)
    ) then 'tamanho'
    when public.normalize_search_text(coalesce(p_product.marca, '')) like '%' || public.normalize_search_text(p_token) || '%'
      or extensions.similarity(public.normalize_search_text(coalesce(p_product.marca, '')), public.normalize_search_text(p_token)) > 0.35
      then 'marca'
    when public.normalize_search_text(coalesce(p_category_name, '')) like '%' || public.normalize_search_text(p_token) || '%'
      then 'categoria'
    when public.normalize_search_text(coalesce(p_supplier_name, '')) like '%' || public.normalize_search_text(p_token) || '%'
      then 'fornecedor'
    else 'descricao'
  end;
$$;

create or replace function public.product_search_rank(
  p_product public.products,
  p_query text,
  p_tokens text[],
  p_preferred_uf char(2)
)
returns float
language sql
immutable
as $$
  select
    coalesce(ts_rank_cd(p_product.search_document, plainto_tsquery('portuguese', public.normalize_search_text(p_query))), 0)
    + case when p_preferred_uf is not null and upper(p_product.uf) = upper(p_preferred_uf) then 0.5 else 0 end
    + case when public.normalize_search_text(p_product.nome) like '%' || public.normalize_search_text(p_query) || '%' then 0.3 else 0 end;
$$;

create or replace function public.product_matches_all_search_tokens(
  p_product public.products,
  p_category_name text,
  p_supplier_name text,
  p_tokens text[]
)
returns boolean
language sql
immutable
as $$
  select
    cardinality(p_tokens) = 0
    or not exists (
      select 1
      from unnest(p_tokens) as token
      where not public.product_search_token_matches(
        p_product,
        p_category_name,
        p_supplier_name,
        token
      )
    );
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
  v_local_count int;
begin
  if auth.uid() is null and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Não autenticado';
  end if;

  create temp table _search_results on commit drop as
  with enriched as (
    select
      p.*,
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
        or public.product_matches_all_search_tokens(p, c.name, coalesce(sp.store_name, comp.nome_fantasia, comp.razao_social, ''), v_tokens)
      )
  )
  select
    e.id,
    e.supplier_id,
    e.category_id,
    e.nome,
    e.sku,
    e.descricao,
    e.marca,
    e.preco_referencia,
    e.image_url,
    e.image_urls,
    e.cidade,
    e.uf,
    e.is_active,
    e.tem_cor,
    e.tem_tamanho,
    e.tipo_tamanho,
    e.cores,
    e.tamanhos,
    e.estoque_variacoes,
    e.created_at,
    e.updated_at,
    public.product_search_rank(e, coalesce(p_query, ''), v_tokens, p_uf) as rank,
    case
      when v_has_search then (
        select public.product_search_match_source(e, e.category_name, e.supplier_name, t.token)
        from unnest(v_tokens) as t(token)
        where public.product_search_token_matches(e, e.category_name, e.supplier_name, t.token)
        limit 1
      )
      else null
    end as match_source,
    false as is_outside_uf,
    e.supplier_json as supplier,
    e.category_json as category
  from enriched e
  where p_uf is null or upper(e.uf) = upper(p_uf);

  select count(*) into v_local_count from _search_results;

  if p_uf is not null and v_local_count = 0 then
    insert into _search_results
    with enriched as (
      select
        p.*,
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
          or public.product_matches_all_search_tokens(p, c.name, coalesce(sp.store_name, comp.nome_fantasia, comp.razao_social, ''), v_tokens)
        )
    )
    select
      e.id,
      e.supplier_id,
      e.category_id,
      e.nome,
      e.sku,
      e.descricao,
      e.marca,
      e.preco_referencia,
      e.image_url,
      e.image_urls,
      e.cidade,
      e.uf,
      e.is_active,
      e.tem_cor,
      e.tem_tamanho,
      e.tipo_tamanho,
      e.cores,
      e.tamanhos,
      e.estoque_variacoes,
      e.created_at,
      e.updated_at,
      public.product_search_rank(e, coalesce(p_query, ''), v_tokens, null) as rank,
      case
        when v_has_search then (
          select public.product_search_match_source(e, e.category_name, e.supplier_name, t.token)
          from unnest(v_tokens) as t(token)
          where public.product_search_token_matches(e, e.category_name, e.supplier_name, t.token)
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
    select distinct on (suggestion, suggestion_type)
      suggestion,
      suggestion_type,
      score
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
    where suggestion is not null and btrim(suggestion) <> ''
    order by suggestion, suggestion_type, score desc
  )
  select c.suggestion, c.suggestion_type, c.score
  from candidates c
  order by c.score desc, c.suggestion asc
  limit v_limit;
end;
$$;

-- Backfill search_document
update public.products p
set search_document = public.build_product_search_document(p)
where search_document is null;

grant execute on function public.normalize_search_text(text) to authenticated, service_role;
grant execute on function public.parse_search_tokens(text) to authenticated, service_role;
grant execute on function public.expand_search_token(text) to authenticated, service_role;
grant execute on function public.search_feed_products(text, uuid[], char(2), int, int) to authenticated, service_role;
grant execute on function public.search_product_suggestions(text, int) to authenticated, service_role;
