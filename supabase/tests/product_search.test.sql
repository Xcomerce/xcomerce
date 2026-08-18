-- Testes de busca de produtos (executar após migration e seed ER75793459)
-- Uso: npx supabase db query --linked -f supabase/tests/product_search.test.sql

do $$
declare
  v_count int;
  v_has_camiseta boolean;
  v_has_outside_uf boolean;
  v_has_suggestions boolean;
  v_moda_masculina uuid;
  v_category_ids uuid[];
begin
  raise notice '=== Iniciando testes de busca de produtos ===';

  -- 1) camiseta
  select count(*) into v_count
  from public.search_feed_products('camiseta', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 1 FALHOU: esperado >=1 resultado para "camiseta", obteve %', v_count;
  end if;
  raise notice 'TESTE 1 OK: camiseta -> % resultados', v_count;

  -- 2) camiseta preta
  select exists (
    select 1
    from public.search_feed_products('camiseta preta', null, null, 50, 0) r
    where public.normalize_search_text(r.nome) like '%camiseta%'
  ) into v_has_camiseta;
  if not v_has_camiseta then
    raise exception 'TESTE 2 FALHOU: "camiseta preta" deveria retornar camiseta básica';
  end if;
  raise notice 'TESTE 2 OK: camiseta preta';

  -- 3) preta (cor)
  select count(*) into v_count
  from public.search_feed_products('preta', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 3 FALHOU: "preta" deveria casar com cor Preto';
  end if;
  raise notice 'TESTE 3 OK: preta -> % resultados', v_count;

  -- 4) algodao (accent insensitive)
  select count(*) into v_count
  from public.search_feed_products('algodao', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 4 FALHOU: "algodao" deveria casar com descricao/nome';
  end if;
  raise notice 'TESTE 4 OK: algodao -> % resultados', v_count;

  -- 5) ER Moda (marca)
  select count(*) into v_count
  from public.search_feed_products('ER Moda', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 5 FALHOU: "ER Moda" deveria casar com marca';
  end if;
  raise notice 'TESTE 5 OK: ER Moda -> % resultados', v_count;

  -- 6) produto só em RJ + SP expande com is_outside_uf
  select exists (
    select 1
    from public.search_feed_products('Camiseta básica algodão', null, 'SP', 50, 0) r
    where r.is_outside_uf = true and upper(r.uf) = 'RJ'
  ) into v_has_outside_uf;
  if not v_has_outside_uf then
    raise exception 'TESTE 6 FALHOU: SP sem produto local deveria expandir RJ com is_outside_uf=true';
  end if;
  raise notice 'TESTE 6 OK: expansão cross-UF para RJ';

  -- 7) typo camisrta (fuzzy)
  select count(*) into v_count
  from public.search_feed_products('camisrta', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 7 FALHOU: typo "camisrta" deveria encontrar camiseta';
  end if;
  raise notice 'TESTE 7 OK: camisrta -> % resultados', v_count;

  -- 8) calcado
  select count(*) into v_count
  from public.search_feed_products('calcado', null, null, 50, 0);
  if v_count < 1 then
    raise exception 'TESTE 8 FALHOU: "calcado" deveria retornar produtos/categorias';
  end if;
  raise notice 'TESTE 8 OK: calcado -> % resultados', v_count;

  -- 9) termo inexistente + sugestões
  select count(*) into v_count
  from public.search_feed_products('xyz_inexistente_123', null, null, 50, 0);
  if v_count <> 0 then
    raise exception 'TESTE 9 FALHOU: termo inexistente deveria retornar 0 produtos';
  end if;

  select exists (
    select 1 from public.search_product_suggestions('cam', 8)
  ) into v_has_suggestions;
  if not v_has_suggestions then
    raise exception 'TESTE 9 FALHOU: sugestões deveriam existir para prefixo "cam"';
  end if;
  raise notice 'TESTE 9 OK: zero-result + sugestões';

  -- 10) filtro categoria Moda Masculina
  select id into v_moda_masculina
  from public.categories
  where slug = 'moda-masculina'
  limit 1;

  if v_moda_masculina is not null then
    v_category_ids := array[v_moda_masculina];
    select count(*) into v_count
    from public.search_feed_products('camiseta', v_category_ids, null, 50, 0) r
    where r.category_id = any(v_category_ids)
       or r.category_id in (
         select c.id from public.categories c where c.parent_id = v_moda_masculina
       );

    if v_count < 1 then
      raise notice 'TESTE 10 SKIP: nenhum produto camiseta na categoria Moda Masculina no seed';
    else
      raise notice 'TESTE 10 OK: camiseta + Moda Masculina -> % resultados', v_count;
    end if;
  else
    raise notice 'TESTE 10 SKIP: categoria moda-masculina não encontrada';
  end if;

  raise notice '=== Todos os testes de busca concluídos com sucesso ===';
end;
$$;
