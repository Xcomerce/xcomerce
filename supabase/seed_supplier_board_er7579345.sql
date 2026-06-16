-- Seed: oportunidades e pedidos de teste para er7579345@gmail.com (fornecedor)
-- Executar: npx supabase db query --linked -f supabase/seed_supplier_board_er7579345.sql
-- Ou colar no SQL Editor do Supabase Dashboard.

do $$
declare
  v_supplier_id uuid;
  v_buyer_id uuid;
  v_cat_alimentos uuid := '4786faa5-b127-4408-922f-af91372d1ab3';
  v_cat_embalagens uuid := '7148a9c4-cc12-46df-ab41-ba7173673279';
  v_gold_plan_id uuid;
  v_demand_id uuid;
  v_offer_id uuid;
  v_order_id uuid;
  v_seed_demands uuid[];
  v_year smallint := extract(year from now())::smallint;
  v_month smallint := extract(month from now())::smallint;
begin
  select id into v_supplier_id
  from auth.users
  where email = 'er7579345@gmail.com';

  if v_supplier_id is null then
    raise exception 'Usuário er7579345@gmail.com não encontrado. Faça login ou cadastre-se primeiro.';
  end if;

  if not exists (
    select 1 from public.supplier_profiles
    where user_id = v_supplier_id and status = 'aprovado'
  ) then
    raise exception 'Fornecedor er7579345@gmail.com precisa estar com status aprovado.';
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
    raise exception 'Nenhum comprador encontrado para vincular às demandas de teste.';
  end if;

  select id into v_gold_plan_id from public.plans where code = 'gold' limit 1;

  if v_gold_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    values
      (v_supplier_id, v_gold_plan_id, 'active', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month'),
      (v_buyer_id, v_gold_plan_id, 'active', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month')
    on conflict (user_id) do update
    set plan_id = excluded.plan_id, status = 'active';
  end if;

  update public.usage_counters
  set count = 0, updated_at = now()
  where user_id in (v_supplier_id, v_buyer_id)
    and counter_type in ('offers_sent', 'demands_published')
    and period_year = v_year
    and period_month = v_month;

  select array_agg(d.id)
  into v_seed_demands
  from public.demands d
  where d.titulo like '[SEED-TEST]%';

  if v_seed_demands is not null then
    delete from public.orders where demand_id = any (v_seed_demands);
    delete from public.offers where demand_id = any (v_seed_demands);
    delete from public.demand_matches where demand_id = any (v_seed_demands);
    delete from public.demands where id = any (v_seed_demands);
  end if;

  -- -------------------------------------------------------------------------
  -- Novas (notified)
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Água mineral 500ml — lote corporativo',
    'Demanda de 1200 garrafas de água mineral 500ml para escritórios no Rio de Janeiro.',
    1200, 'unidades', 'Rio de Janeiro', 'RJ', 50, 'PUBLICADA', now() - interval '2 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'notified', 92, now() - interval '2 hours');

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Café em grãos especial — torrefação local',
    'Compra recorrente de 80 kg de café em grãos torrado médio para cafeteria.',
    80, 'kg', 'Rio de Janeiro', 'RJ', 40, 'PUBLICADA', now() - interval '5 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'notified', 88, now() - interval '5 hours');

  -- -------------------------------------------------------------------------
  -- Visualizadas
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_embalagens,
    '[SEED-TEST] Embalagens PET 500ml — personalizadas',
    'Solicitação de 5000 unidades de garrafas PET 500ml com tampa, para linha de sucos.',
    5000, 'unidades', 'Niterói', 'RJ', 60, 'PUBLICADA', now() - interval '1 day'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'viewed', 76, now() - interval '1 day', now() - interval '20 hours');

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Molhos e temperos para restaurante',
    'Kit mensal com 40 unidades de molhos industriais (ketchup, mostarda, maionese).',
    40, 'kits', 'Rio de Janeiro', 'RJ', 35, 'PUBLICADA', now() - interval '18 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'viewed', 81, now() - interval '18 hours', now() - interval '12 hours');

  -- -------------------------------------------------------------------------
  -- Com proposta
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Refrigerante lata 350ml — evento',
    'Necessário 600 latas sortidas para evento corporativo em Copacabana.',
    600, 'latas', 'Rio de Janeiro', 'RJ', 30, 'OFERTAS_RECEBIDAS', now() - interval '2 days', 8.75
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 94, now() - interval '2 days', now() - interval '1 day 20 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 4200.00, 2, 7, now() + interval '5 days',
    600, 'Lote completo com entrega em até 48h na Zona Sul.', 'enviada'
  );

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Snacks embalados — conveniência',
    'Reposição de 300 pacotes de snacks variados para loja de conveniência.',
    300, 'pacotes', 'Rio de Janeiro', 'RJ', 45, 'OFERTAS_RECEBIDAS', now() - interval '3 days', 11.88
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 87, now() - interval '3 days', now() - interval '2 days 12 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 2850.00, 4, 10, now() + interval '8 days',
    300, 'Mix de marcas nacionais com estoque imediato.', 'enviada'
  );

  -- -------------------------------------------------------------------------
  -- Dispensadas
  -- -------------------------------------------------------------------------
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_embalagens,
    '[SEED-TEST] Caixas de papelão ondulado — mudança de layout',
    'Demanda fora do perfil logístico: 2000 caixas grandes para envio interestadual.',
    2000, 'caixas', 'Duque de Caxias', 'RJ', 80, 'PUBLICADA', now() - interval '4 days'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'dismissed', 38, now() - interval '4 days', now() - interval '3 days 18 hours');

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Insumos refrigerados — fora da área',
    'Solicitação de produtos refrigerados com entrega em Petrópolis (fora do raio).',
    150, 'caixas', 'Petrópolis', 'RJ', 25, 'PUBLICADA', now() - interval '5 days'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'dismissed', 42, now() - interval '5 days');

  -- -------------------------------------------------------------------------
  -- Pedidos (propostas aceitas)
  -- -------------------------------------------------------------------------

  -- Aceito
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Pedido — Suco integral 1L',
    'Compra fechada de 200 unidades de suco integral 1L para hotel.',
    200, 'unidades', 'Rio de Janeiro', 'RJ', 40, 'PROPOSTA_ACEITA', now() - interval '6 days', 11.25
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 90, now() - interval '6 days', now() - interval '5 days 20 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 1800.00, 3, 7, now() + interval '3 days',
    200, 'Proposta aceita — aguardando confirmação de pagamento externo.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  -- Pagamento informado
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_embalagens,
    '[SEED-TEST] Pedido — Sacolas kraft personalizadas',
    'Lote de 1000 sacolas kraft com impressão simples para loja de alimentos.',
    1000, 'unidades', 'Rio de Janeiro', 'RJ', 50, 'PROPOSTA_ACEITA', now() - interval '8 days', 4.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 85, now() - interval '8 days', now() - interval '7 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 3200.00, 5, 7, now() + interval '2 days',
    1000, 'Sacolas em produção após confirmação de pagamento.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'PAGAMENTO_INFORMADO' where id = v_order_id;

  -- Envio informado
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Pedido — Água saborizada 310ml',
    'Fornecimento mensal de 800 unidades de água saborizada para academia.',
    800, 'unidades', 'Rio de Janeiro', 'RJ', 35, 'PROPOSTA_ACEITA', now() - interval '10 days', 8.75
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 89, now() - interval '10 days', now() - interval '9 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 5600.00, 4, 7, now() + interval '1 day',
    800, 'Pedido em trânsito — rastreio disponível no detalhe.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'PAGAMENTO_INFORMADO' where id = v_order_id;
  update public.orders set status = 'ENVIO_INFORMADO' where id = v_order_id;

  -- Concluído
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_alimentos,
    '[SEED-TEST] Pedido — Mix de bebidas para coworking',
    'Entrega concluída de 400 unidades sortidas (refrigerante, água e energético).',
    400, 'unidades', 'Rio de Janeiro', 'RJ', 30, 'PROPOSTA_ACEITA', now() - interval '15 days', 11.25
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 96, now() - interval '15 days', now() - interval '14 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 3600.00, 2, 7, now() - interval '5 days',
    400, 'Pedido entregue e confirmado pelo comprador.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'PAGAMENTO_INFORMADO' where id = v_order_id;
  update public.orders set status = 'ENVIO_INFORMADO' where id = v_order_id;
  update public.orders set status = 'ENTREGUE' where id = v_order_id;
  update public.orders set status = 'CONCLUIDO' where id = v_order_id;

  raise notice 'Seed concluído para er7579345@gmail.com: 8 oportunidades + 4 pedidos de teste.';
end $$;
