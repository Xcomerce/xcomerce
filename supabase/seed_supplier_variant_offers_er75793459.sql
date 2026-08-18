-- Seed: propostas com variações de cor/tamanho para er75793459@gmail.com
-- Executar: npx supabase db query --linked -f supabase/seed_supplier_variant_offers_er75793459.sql

do $$
declare
  v_supplier_email text := 'er75793459@gmail.com';
  v_supplier_id uuid;
  v_buyer_id uuid;
  v_cat_camisetas uuid;
  v_cat_calcados uuid;
  v_cat_vestidos uuid;
  v_demand_id uuid;
  v_seed_demands uuid[];
begin
  select id into v_supplier_id from auth.users where email = v_supplier_email;
  if v_supplier_id is null then
    raise exception 'Usuário % não encontrado.', v_supplier_email;
  end if;

  if not exists (
    select 1 from public.supplier_profiles
    where user_id = v_supplier_id and status = 'aprovado'
  ) then
    raise exception 'Fornecedor % precisa estar aprovado.', v_supplier_email;
  end if;

  select id into v_buyer_id
  from auth.users
  where email = 'eduardo.azevedo@sagittadigital.com.br';

  if v_buyer_id is null then
    select u.id into v_buyer_id
    from auth.users u
    join public.buyer_profiles bp on bp.user_id = u.id
    limit 1;
  end if;

  if v_buyer_id is null then
    raise exception 'Nenhum comprador encontrado.';
  end if;

  select id into v_cat_camisetas from public.categories where slug = 'camisetas-blusas-camisas' limit 1;
  select id into v_cat_calcados from public.categories where slug = 'calcados-principal' limit 1;
  select id into v_cat_vestidos from public.categories where slug = 'vestidos' limit 1;

  -- Produtos de catálogo com variantes (para match e referência de preço)
  insert into public.products (
    supplier_id, category_id, nome, sku, descricao, marca,
    preco_referencia, cidade, uf, is_active,
    tem_cor, tem_tamanho, tipo_tamanho, cores, tamanhos
  )
  select
    v_supplier_id,
    v_cat_camisetas,
    'Camiseta básica algodão penteado',
    'SEED-ER-CAM-001',
    'Camiseta 100% algodão penteado, gola redonda.',
    'ER Moda',
    19.90,
    'Rio de Janeiro',
    'RJ',
    true,
    true,
    true,
    'roupa',
    array['Branco', 'Preto', 'Azul Marinho', 'Cinza'],
    array['P', 'M', 'G', 'GG']
  where v_cat_camisetas is not null
    and not exists (
      select 1 from public.products
      where supplier_id = v_supplier_id and sku = 'SEED-ER-CAM-001'
    );

  insert into public.products (
    supplier_id, category_id, nome, sku, descricao, marca,
    preco_referencia, cidade, uf, is_active,
    tem_cor, tem_tamanho, tipo_tamanho, cores, tamanhos
  )
  select
    v_supplier_id,
    v_cat_calcados,
    'Tênis casual unissex',
    'SEED-ER-TEN-001',
    'Tênis casual leve, solado antiderrapante.',
    'ER Moda',
    89.90,
    'Rio de Janeiro',
    'RJ',
    true,
    true,
    true,
    'calcado',
    array['Branco', 'Preto', 'Bege'],
    array['38', '39', '40', '41', '42', '43']
  where v_cat_calcados is not null
    and not exists (
      select 1 from public.products
      where supplier_id = v_supplier_id and sku = 'SEED-ER-TEN-001'
    );

  insert into public.products (
    supplier_id, category_id, nome, sku, descricao, marca,
    preco_referencia, cidade, uf, is_active,
    tem_cor, tem_tamanho, tipo_tamanho, cores, tamanhos
  )
  select
    v_supplier_id,
    v_cat_vestidos,
    'Vestido midi viscose',
    'SEED-ER-VES-001',
    'Vestido midi em viscose, caimento fluido.',
    'ER Moda',
    74.50,
    'Rio de Janeiro',
    'RJ',
    true,
    true,
    true,
    'roupa',
    array['Preto', 'Vermelho', 'Verde Musgo', 'Nude'],
    array['P', 'M', 'G']
  where v_cat_vestidos is not null
    and not exists (
      select 1 from public.products
      where supplier_id = v_supplier_id and sku = 'SEED-ER-VES-001'
    );

  -- Cleanup re-execução
  select array_agg(d.id)
  into v_seed_demands
  from public.demands d
  where d.titulo like '[SEED-ER-VAR]%';

  if v_seed_demands is not null then
    delete from public.orders where demand_id = any (v_seed_demands);
    delete from public.offers where demand_id = any (v_seed_demands);
    delete from public.demand_matches where demand_id = any (v_seed_demands);
    delete from public.demands where id = any (v_seed_demands);
  end if;

  -- -------------------------------------------------------------------------
  -- 1) Camisetas — 4 combinações cor/tamanho, proposta enviada
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado,
    especificacoes
  ) values (
    v_buyer_id, v_cat_camisetas,
    '[SEED-ER-VAR] Camisetas básicas — grade por cor e tamanho',
    'Uniforme corporativo com grade definida por combinação de cor e tamanho.',
    180, 'unidades', 'Rio de Janeiro', 'RJ', 50, 'OFERTAS_RECEBIDAS',
    now() - interval '6 hours', 19.90,
    '[
      {"cor": "Branco", "tamanho": "P", "quantidade": 40},
      {"cor": "Branco", "tamanho": "M", "quantidade": 60},
      {"cor": "Preto", "tamanho": "G", "quantidade": 50},
      {"cor": "Azul Marinho", "tamanho": "GG", "quantidade": 30}
    ]'::jsonb
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 95, now() - interval '6 hours', now() - interval '4 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status, source
  ) values (
    v_demand_id, v_supplier_id,
    3385.00, 5, 7, now() + interval '6 days',
    180,
    'Grade atendida integralmente. Preços: Branco P/M R$ 18,50 · Preto G R$ 19,00 · Azul Marinho GG R$ 19,50.',
    'enviada', 'manual'
  );

  -- -------------------------------------------------------------------------
  -- 2) Tênis — numeração calçado, proposta enviada
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado,
    especificacoes
  ) values (
    v_buyer_id, v_cat_calcados,
    '[SEED-ER-VAR] Tênis casual — mix de numerações e cores',
    'Reposição de estoque com combinações específicas de cor e numeração.',
    72, 'pares', 'Rio de Janeiro', 'RJ', 45, 'OFERTAS_RECEBIDAS',
    now() - interval '1 day', 89.90,
    '[
      {"cor": "Branco", "tamanho": "38", "quantidade": 12},
      {"cor": "Branco", "tamanho": "40", "quantidade": 18},
      {"cor": "Preto", "tamanho": "39", "quantidade": 15},
      {"cor": "Preto", "tamanho": "41", "quantidade": 15},
      {"cor": "Bege", "tamanho": "42", "quantidade": 12}
    ]'::jsonb
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 91, now() - interval '1 day', now() - interval '18 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status, source
  ) values (
    v_demand_id, v_supplier_id,
    6220.80, 7, 10, now() + interval '9 days',
    72,
    'Branco 38/40 R$ 84,90 · Preto 39/41 R$ 86,90 · Bege 42 R$ 88,90 por par. Estoque imediato.',
    'enviada', 'manual'
  );

  -- -------------------------------------------------------------------------
  -- 3) Vestidos — cores e tamanhos, oportunidade nova (sem proposta ainda)
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado,
    especificacoes
  ) values (
    v_buyer_id, v_cat_vestidos,
    '[SEED-ER-VAR] Vestidos midi — coleção outono por cor/tamanho',
    'Pedido sazonal com grade fechada por cor e tamanho para loja multimarca.',
    95, 'unidades', 'Niterói', 'RJ', 60, 'PUBLICADA',
    now() - interval '3 hours', 74.50,
    '[
      {"cor": "Preto", "tamanho": "P", "quantidade": 20},
      {"cor": "Preto", "tamanho": "M", "quantidade": 25},
      {"cor": "Vermelho", "tamanho": "M", "quantidade": 15},
      {"cor": "Verde Musgo", "tamanho": "G", "quantidade": 20},
      {"cor": "Nude", "tamanho": "G", "quantidade": 15}
    ]'::jsonb
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'notified', 88, now() - interval '3 hours');

  -- -------------------------------------------------------------------------
  -- 4) Camisetas — proposta com preços diferenciados por tamanho
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado,
    especificacoes
  ) values (
    v_buyer_id, v_cat_camisetas,
    '[SEED-ER-VAR] Camisetas premium — evento corporativo',
    'Camisetas para evento com especificação detalhada por cor e tamanho.',
    120, 'unidades', 'Rio de Janeiro', 'RJ', 35, 'OFERTAS_RECEBIDAS',
    now() - interval '2 days', 22.00,
    '[
      {"cor": "Branco", "tamanho": "M", "quantidade": 30},
      {"cor": "Branco", "tamanho": "G", "quantidade": 30},
      {"cor": "Cinza", "tamanho": "M", "quantidade": 30},
      {"cor": "Cinza", "tamanho": "G", "quantidade": 30}
    ]'::jsonb
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 93, now() - interval '2 days', now() - interval '1 day');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status, source
  ) values (
    v_demand_id, v_supplier_id,
    2610.00, 4, 7, now() + interval '5 days',
    120,
    'Branco M/G R$ 21,00 · Cinza M/G R$ 22,50. Personalização de estampa inclusa no lote.',
    'enviada', 'manual'
  );

  raise notice 'Seed variantes concluído: 3 produtos + 4 demandas (3 com proposta, 1 nova).';
end $$;
