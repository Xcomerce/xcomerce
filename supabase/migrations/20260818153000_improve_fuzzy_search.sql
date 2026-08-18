-- Melhora fuzzy match com operador % do pg_trgm

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
  ),
  normalized_token as (
    select public.normalize_search_text(p_token) as value
  )
  select
    coalesce(
      p_product.search_document @@ plainto_tsquery('portuguese', (select value from normalized_token)),
      false
    )
    or exists (
      select 1
      from variants v
      where public.variant_array_contains(p_product.cores, v.variant)
        or public.variant_array_contains(p_product.tamanhos, v.variant)
    )
    or public.normalize_search_text(p_product.nome) like '%' || (select value from normalized_token) || '%'
    or public.normalize_search_text(coalesce(p_product.marca, '')) like '%' || (select value from normalized_token) || '%'
    or public.normalize_search_text(coalesce(p_product.descricao, '')) like '%' || (select value from normalized_token) || '%'
    or public.normalize_search_text(coalesce(p_product.sku, '')) like '%' || (select value from normalized_token) || '%'
    or public.normalize_search_text(coalesce(p_category_name, '')) like '%' || (select value from normalized_token) || '%'
    or public.normalize_search_text(coalesce(p_supplier_name, '')) like '%' || (select value from normalized_token) || '%'
    or extensions.similarity(public.normalize_search_text(p_product.nome), (select value from normalized_token)) > 0.25
    or extensions.similarity(public.normalize_search_text(coalesce(p_product.marca, '')), (select value from normalized_token)) > 0.25
    or extensions.word_similarity((select value from normalized_token), public.normalize_search_text(p_product.nome)) > 0.3;
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
  ),
  normalized_token as (
    select public.normalize_search_text(p_token) as value
  )
  select case
    when public.normalize_search_text(p_product.nome) like '%' || (select value from normalized_token) || '%'
      or extensions.similarity(public.normalize_search_text(p_product.nome), (select value from normalized_token)) > 0.25
      or extensions.word_similarity((select value from normalized_token), public.normalize_search_text(p_product.nome)) > 0.3
      then 'nome'
    when exists (
      select 1 from variants v
      where public.variant_array_contains(p_product.cores, v.variant)
    ) then 'cor'
    when exists (
      select 1 from variants v
      where public.variant_array_contains(p_product.tamanhos, v.variant)
    ) then 'tamanho'
    when public.normalize_search_text(coalesce(p_product.marca, '')) like '%' || (select value from normalized_token) || '%'
      or extensions.similarity(public.normalize_search_text(coalesce(p_product.marca, '')), (select value from normalized_token)) > 0.25
      then 'marca'
    when public.normalize_search_text(coalesce(p_category_name, '')) like '%' || (select value from normalized_token) || '%'
      then 'categoria'
    when public.normalize_search_text(coalesce(p_supplier_name, '')) like '%' || (select value from normalized_token) || '%'
      then 'fornecedor'
    else 'descricao'
  end;
$$;
