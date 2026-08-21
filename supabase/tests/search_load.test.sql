-- Testes de busca multi-token após seed LOADTEST (100k)
-- Uso: npx supabase db query --linked -f supabase/tests/search_load.test.sql

do $$
declare
  v_load_count int;
  v_count int;
  v_top_sku text;
  v_has_exact boolean;
begin
  raise notice '=== Iniciando testes de busca load test ===';

  select count(*) into v_load_count
  from public.products
  where sku like 'LOADTEST-%';

  if v_load_count < 100000 then
    raise exception 'Pré-requisito falhou: esperado >=100000 produtos LOADTEST, obteve %', v_load_count;
  end if;
  raise notice 'Pré-requisito OK: % produtos LOADTEST', v_load_count;

  -- 1) Nome + cor (multi-token AND)
  select count(*) into v_count
  from public.search_feed_products('camiseta preta', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 1 FALHOU: "camiseta preta" deveria retornar resultados';
  end if;
  raise notice 'TESTE 1 OK: camiseta preta -> % resultados', v_count;

  -- 2) Produto de referência exato no top 1 (4 tokens)
  select sku into v_top_sku
  from public.search_feed_products('camiseta preta 42 algodao', null, null, 5, 0)
  order by rank desc
  limit 1;

  if v_top_sku is distinct from 'LOADTEST-000001' then
    raise exception 'TESTE 2 FALHOU: top1 esperado LOADTEST-000001, obteve %', coalesce(v_top_sku, '(null)');
  end if;
  raise notice 'TESTE 2 OK: camiseta preta 42 algodao -> top1 LOADTEST-000001';

  -- 3) Nome + cor + tamanho numérico
  select exists (
    select 1
    from public.search_feed_products('camiseta preta 42', null, null, 20, 0) r
    where r.sku = 'LOADTEST-000001'
  ) into v_has_exact;

  if not v_has_exact then
    raise exception 'TESTE 3 FALHOU: "camiseta preta 42" deveria incluir LOADTEST-000001';
  end if;
  raise notice 'TESTE 3 OK: camiseta preta 42 inclui produto exato';

  -- 4) Nome + cor + tamanho 1 char (M)
  select exists (
    select 1
    from public.search_feed_products('camiseta preto m', null, null, 20, 0) r
    where r.sku in ('LOADTEST-000001', 'LOADTEST-000002')
  ) into v_has_exact;

  if not v_has_exact then
    raise exception 'TESTE 4 FALHOU: "camiseta preto m" deveria incluir LOADTEST-000001 ou LOADTEST-000002';
  end if;
  raise notice 'TESTE 4 OK: camiseta preto m (token M)';

  -- 5) Token extra inexistente -> zero resultados para query muito específica
  select count(*) into v_count
  from public.search_feed_products('camiseta preta 42 algodao xyz_inexistente_123', null, null, 50, 0);
  if v_count <> 0 then
    raise exception 'TESTE 5 FALHOU: query com token inexistente deveria retornar 0, obteve %', v_count;
  end if;
  raise notice 'TESTE 5 OK: token inexistente -> 0 resultados';

  -- 6) Typo fuzzy ainda encontra
  select count(*) into v_count
  from public.search_feed_products('camisrta preta', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 6 FALHOU: typo "camisrta preta" deveria retornar resultados';
  end if;
  raise notice 'TESTE 6 OK: camisrta preta -> % resultados', v_count;

  -- 7) Parse de token M isolado
  if not ('m' = any(public.parse_search_tokens('camiseta m preta'))) then
    raise exception 'TESTE 7 FALHOU: parse_search_tokens deveria manter token "m"';
  end if;
  raise notice 'TESTE 7 OK: parse_search_tokens mantém tamanho M';

  -- 8) 4+ tokens variados
  select count(*) into v_count
  from public.search_feed_products('loadtest camiseta premium preto', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 8 FALHOU: busca 4 tokens deveria retornar resultados';
  end if;
  raise notice 'TESTE 8 OK: loadtest camiseta premium preto -> % resultados', v_count;

  raise notice '=== Todos os testes de busca load test concluídos com sucesso ===';
end;
$$;
