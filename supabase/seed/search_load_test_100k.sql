-- Seed de carga para teste de busca: 100.000 produtos sem imagens (prefixo LOADTEST-)
-- Uso: npx supabase db query --linked -f supabase/seed/search_load_test_100k.sql
-- Cleanup: npx supabase db query --linked -f supabase/seed/search_load_test_100k.sql -- -v cleanup_only=true
-- (ou via scripts/run-search-load-test.mjs --cleanup)

create or replace function public.cleanup_search_load_test_products()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.products
  where sku like 'LOADTEST-%';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

do $$
declare
  v_supplier_email text := 'er75793459@gmail.com';
  v_supplier_id uuid;
  v_category_id uuid;
  v_total int := 100000;
  v_batch_size int := 5000;
  v_batch_start int;
  v_batch_end int;
  v_existing int;
  v_started timestamptz := clock_timestamp();
  v_colors text[] := array['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Cinza', 'Bege'];
  v_sizes text[] := array['P', 'M', 'G', 'GG', '38', '40', '42', '44'];
  v_names text[] := array['Camiseta', 'Calca', 'Vestido', 'Blusa', 'Tenis'];
  v_marcas text[] := array['ER Moda', 'LoadBrand', 'Atacado Plus'];
  v_ufs text[] := array['SP', 'RJ', 'MG'];
  v_cities text[] := array['Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte'];
begin
  raise notice '=== Search load test seed: iniciando ===';

  select count(*) into v_existing
  from public.products
  where sku like 'LOADTEST-%';

  if v_existing >= v_total then
    raise notice 'Seed já presente: % produtos LOADTEST (meta %). Pulando inserção.', v_existing, v_total;
    return;
  end if;

  if v_existing > 0 then
    raise notice 'Removendo % produtos LOADTEST parciais antes de re-seedar...', v_existing;
    perform public.cleanup_search_load_test_products();
  end if;

  select id into v_supplier_id
  from auth.users
  where email = v_supplier_email;

  if v_supplier_id is null then
    raise exception 'Fornecedor % não encontrado. Execute o seed do fornecedor antes.', v_supplier_email;
  end if;

  select id into v_category_id
  from public.categories
  where slug = 'camisetas-blusas-camisas'
  limit 1;

  if v_category_id is null then
    select id into v_category_id
    from public.categories
    where is_active = true
    limit 1;
  end if;

  if v_category_id is null then
    raise exception 'Nenhuma categoria ativa encontrada para o seed.';
  end if;

  alter table public.products disable trigger products_search_document_trigger;

  for v_batch_start in 1..v_total by v_batch_size loop
    v_batch_end := least(v_batch_start + v_batch_size - 1, v_total);

    insert into public.products (
      supplier_id,
      category_id,
      nome,
      sku,
      descricao,
      marca,
      preco_referencia,
      image_url,
      image_urls,
      cidade,
      uf,
      is_active,
      tem_cor,
      tem_tamanho,
      tipo_tamanho,
      cores,
      tamanhos,
      estoque_variacoes
    )
    select
      v_supplier_id,
      v_category_id,
      case
        when gs = 1 then 'LoadTest Camiseta Premium'
        when gs = 2 then 'LoadTest Camiseta Basica Preta M'
        else v_names[((gs - 1) % array_length(v_names, 1)) + 1]
          || ' LoadTest '
          || v_colors[((gs - 1) % array_length(v_colors, 1)) + 1]
          || ' '
          || v_sizes[((gs - 1) % array_length(v_sizes, 1)) + 1]
      end,
      'LOADTEST-' || lpad(gs::text, 6, '0'),
      case
        when gs = 1 then 'algodao penteado premium loadtest referencia exata'
        when gs = 2 then 'camiseta preta tamanho m loadtest'
        else 'Produto loadtest seq ' || gs::text || ' para benchmark de busca multi-token'
      end,
      v_marcas[((gs - 1) % array_length(v_marcas, 1)) + 1],
      round((10 + (gs % 500))::numeric, 2),
      null,
      '{}'::text[],
      v_cities[((gs - 1) % array_length(v_cities, 1)) + 1],
      v_ufs[((gs - 1) % array_length(v_ufs, 1)) + 1],
      true,
      true,
      true,
      case when (gs % 3) = 0 then 'calcado'::public.product_size_type else 'roupa'::public.product_size_type end,
      case
        when gs = 1 then array['Preto']::text[]
        when gs = 2 then array['Preto']::text[]
        else array[v_colors[((gs - 1) % array_length(v_colors, 1)) + 1]]::text[]
      end,
      case
        when gs = 1 then array['42', 'M']::text[]
        when gs = 2 then array['M']::text[]
        else array[v_sizes[((gs - 1) % array_length(v_sizes, 1)) + 1]]::text[]
      end,
      '[]'::jsonb
    from generate_series(v_batch_start, v_batch_end) as gs;

    raise notice 'Lote %-% inserido (% / %)', v_batch_start, v_batch_end, v_batch_end, v_total;
  end loop;

  update public.products p
  set search_document = public.build_product_search_document(p)
  where p.sku like 'LOADTEST-%';

  alter table public.products enable trigger products_search_document_trigger;

  select count(*) into v_existing
  from public.products
  where sku like 'LOADTEST-%';

  raise notice '=== Seed concluído: % produtos LOADTEST em % ===',
    v_existing,
    clock_timestamp() - v_started;
end;
$$;
