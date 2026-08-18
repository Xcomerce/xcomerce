-- Seed: cadastro completo + oportunidades/propostas para er75793459@gmail.com (fornecedor teste)
-- Executar: npx supabase db query --linked -f supabase/seed_supplier_er75793459.sql

do $$
declare
  v_supplier_email text := 'er75793459@gmail.com';
  v_supplier_id uuid;
  v_buyer_id uuid;
  v_company_id uuid;
  v_gold_plan_id uuid;
  v_demand_id uuid;
  v_offer_id uuid;
  v_order_id uuid;
  v_seed_demands uuid[];
  v_cat_camisetas uuid;
  v_cat_moda_masc uuid;
  v_cat_moda_fem uuid;
  v_cat_calcados uuid;
  v_year smallint := extract(year from now())::smallint;
  v_month smallint := extract(month from now())::smallint;
begin
  select id into v_supplier_id
  from auth.users
  where email = v_supplier_email;

  if v_supplier_id is null then
    raise exception 'Usuário % não encontrado. Faça login ou cadastre-se primeiro.', v_supplier_email;
  end if;

  select id into v_cat_camisetas from public.categories where slug = 'camisetas-blusas-camisas' limit 1;
  select id into v_cat_moda_masc from public.categories where slug = 'moda-masculina' limit 1;
  select id into v_cat_moda_fem from public.categories where slug = 'moda-feminina' limit 1;
  select id into v_cat_calcados from public.categories where slug = 'calcados-principal' limit 1;

  if v_cat_camisetas is null then
    select id into v_cat_camisetas from public.categories where is_active = true limit 1;
  end if;

  -- -------------------------------------------------------------------------
  -- Cadastro completo do fornecedor
  -- -------------------------------------------------------------------------
  insert into public.companies (
    cnpj,
    razao_social,
    nome_fantasia,
    situacao,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep
  ) values (
    '33456789000123',
    'Eduardo Ribeiro Comercio de Moda LTDA',
    'ER Moda Atacado',
    'ATIVA',
    'Rua Visconde de Pirajá',
    '550',
    'Sala 302',
    'Ipanema',
    'Rio de Janeiro',
    'RJ',
    '22410002'
  )
  on conflict (cnpj) do update
  set
    razao_social = excluded.razao_social,
    nome_fantasia = excluded.nome_fantasia,
    situacao = excluded.situacao,
    logradouro = excluded.logradouro,
    numero = excluded.numero,
    complemento = excluded.complemento,
    bairro = excluded.bairro,
    cidade = excluded.cidade,
    uf = excluded.uf,
    cep = excluded.cep
  returning id into v_company_id;

  if v_company_id is null then
    select id into v_company_id from public.companies where cnpj = '33456789000123';
  end if;

  insert into public.supplier_profiles (
    user_id,
    company_id,
    status,
    store_name,
    verified_at,
    service_city,
    service_uf,
    service_radius_km,
    avg_rating,
    total_ratings
  ) values (
    v_supplier_id,
    v_company_id,
    'aprovado',
    'ER Moda Atacado',
    now(),
    'Rio de Janeiro',
    'RJ',
    80,
    4.8,
    12
  )
  on conflict (user_id) do update
  set
    company_id = excluded.company_id,
    status = 'aprovado',
    store_name = excluded.store_name,
    verified_at = coalesce(public.supplier_profiles.verified_at, now()),
    service_city = excluded.service_city,
    service_uf = excluded.service_uf,
    service_radius_km = excluded.service_radius_km;

  insert into public.user_roles (user_id, role)
  values (v_supplier_id, 'supplier')
  on conflict do nothing;

  insert into public.user_roles (user_id, role)
  values (v_supplier_id, 'buyer')
  on conflict do nothing;

  insert into public.buyer_profiles (user_id)
  values (v_supplier_id)
  on conflict do nothing;

  update public.profiles
  set
    full_name = coalesce(full_name, 'Eduardo Ribeiro'),
    phone = coalesce(phone, '21979742966'),
    primary_role = 'supplier'
  where id = v_supplier_id;

  delete from public.documents where supplier_id = v_supplier_id;

  insert into public.documents (
    supplier_id,
    document_type,
    storage_path,
    file_name,
    mime_type,
    file_size_bytes,
    review_status,
    reviewed_at
  ) values
    (
      v_supplier_id,
      'cnpj_card',
      'documents/seed-er75793459/cnpj.pdf',
      'cartao_cnpj_er_moda.pdf',
      'application/pdf',
      98304,
      'aprovado',
      now()
    ),
    (
      v_supplier_id,
      'address_proof',
      'documents/seed-er75793459/comprovante.pdf',
      'comprovante_endereco_er_moda.pdf',
      'application/pdf',
      156672,
      'aprovado',
      now()
    );

  insert into public.supplier_categories (supplier_id, category_id)
  select v_supplier_id, c.id
  from public.categories c
  where c.slug in (
    'moda-masculina',
    'moda-feminina',
    'camisetas-blusas-camisas',
    'calcados-principal',
    'shorts-bermudas',
    'vestidos'
  )
  on conflict do nothing;

  select id into v_gold_plan_id from public.plans where code = 'gold' limit 1;

  if v_gold_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    values (
      v_supplier_id,
      v_gold_plan_id,
      'active',
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    on conflict (user_id) do update
    set plan_id = excluded.plan_id, status = 'active';
  end if;

  -- -------------------------------------------------------------------------
  -- Oportunidades e propostas de teste
  -- -------------------------------------------------------------------------
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

  if v_gold_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    values (
      v_buyer_id,
      v_gold_plan_id,
      'active',
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
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
  where d.titulo like '[SEED-ER]%';

  if v_seed_demands is not null then
    delete from public.orders where demand_id = any (v_seed_demands);
    delete from public.offers where demand_id = any (v_seed_demands);
    delete from public.demand_matches where demand_id = any (v_seed_demands);
    delete from public.demands where id = any (v_seed_demands);
  end if;

  -- Novas (notified)
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_camisetas,
    '[SEED-ER] Camisetas básicas algodão — uniforme corporativo',
    'Lote de 500 camisetas 100% algodão, cores variadas, tamanhos P ao GG.',
    500, 'unidades', 'Rio de Janeiro', 'RJ', 50, 'PUBLICADA', now() - interval '2 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'notified', 94, now() - interval '2 hours');

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_moda_masc,
    '[SEED-ER] Polos masculinas — coleção verão',
    'Pedido de 200 polos masculinas em malha piquet, mix de cores.',
    200, 'unidades', 'Rio de Janeiro', 'RJ', 40, 'PUBLICADA', now() - interval '5 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at)
  values (v_demand_id, v_supplier_id, 'notified', 91, now() - interval '5 hours');

  -- Visualizadas
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_moda_fem,
    '[SEED-ER] Vestidos midi — loja de bairro',
    'Reposição de 80 vestidos midi em viscose, estampas variadas.',
    80, 'unidades', 'Niterói', 'RJ', 60, 'PUBLICADA', now() - interval '1 day'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'viewed', 86, now() - interval '1 day', now() - interval '20 hours');

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_calcados,
    '[SEED-ER] Tênis casual unissex — atacado',
    'Compra de 120 pares de tênis casual, numeração 36 ao 44.',
    120, 'pares', 'Rio de Janeiro', 'RJ', 35, 'PUBLICADA', now() - interval '18 hours'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'viewed', 83, now() - interval '18 hours', now() - interval '12 hours');

  -- Com proposta enviada
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_camisetas,
    '[SEED-ER] Camisetas estampadas — evento',
    '600 camisetas estampadas para evento corporativo em Copacabana.',
    600, 'unidades', 'Rio de Janeiro', 'RJ', 30, 'OFERTAS_RECEBIDAS', now() - interval '2 days', 22.50
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 96, now() - interval '2 days', now() - interval '1 day 20 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status, source
  ) values (
    v_demand_id, v_supplier_id, 10800.00, 5, 7, now() + interval '5 days',
    600, 'Estampas personalizadas inclusas. Entrega em até 5 dias úteis na Zona Sul.', 'enviada', 'manual'
  );

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_moda_fem,
    '[SEED-ER] Blusas femininas — coleção outono',
    '300 blusas em malha fria, cores neutras, tamanhos P ao G.',
    300, 'unidades', 'Rio de Janeiro', 'RJ', 45, 'OFERTAS_RECEBIDAS', now() - interval '3 days', 35.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'notified', 89, now() - interval '3 days', now() - interval '2 days 12 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status, source
  ) values (
    v_demand_id, v_supplier_id, 8250.00, 7, 10, now() + interval '8 days',
    300, 'Mix de cores neutras com estoque imediato no Centro de Distribuição RJ.', 'enviada', 'manual'
  );

  -- Dispensadas
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at
  ) values (
    v_buyer_id, v_cat_calcados,
    '[SEED-ER] Botas de segurança — fora do perfil',
    'Pedido industrial de 400 botas com biqueira de aço, fora do catálogo de moda.',
    400, 'pares', 'Duque de Caxias', 'RJ', 80, 'PUBLICADA', now() - interval '4 days'
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'dismissed', 35, now() - interval '4 days', now() - interval '3 days 18 hours');

  -- Pedidos (propostas aceitas)
  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_camisetas,
    '[SEED-ER] Pedido — Camisetas premium algodão penteado',
    'Compra fechada de 250 camisetas premium para loja conceito.',
    250, 'unidades', 'Rio de Janeiro', 'RJ', 40, 'PROPOSTA_ACEITA', now() - interval '6 days', 28.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 92, now() - interval '6 days', now() - interval '5 days 20 hours');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 6250.00, 4, 7, now() + interval '3 days',
    250, 'Proposta aceita — aguardando confirmação de pagamento externo.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_moda_masc,
    '[SEED-ER] Pedido — Bermudas masculinas sarja',
    'Lote de 180 bermudas sarja, cores sólidas, tamanhos 38 ao 48.',
    180, 'unidades', 'Rio de Janeiro', 'RJ', 50, 'PROPOSTA_ACEITA', now() - interval '8 days', 42.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 88, now() - interval '8 days', now() - interval '7 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 7020.00, 6, 7, now() + interval '2 days',
    180, 'Bermudas em produção após confirmação de pagamento.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'COMPROVANTE_ENVIADO' where id = v_order_id;

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_calcados,
    '[SEED-ER] Pedido — Sapatilhas femininas conforto',
    'Fornecimento de 90 pares de sapatilhas conforto para loja de calçados.',
    90, 'pares', 'Rio de Janeiro', 'RJ', 35, 'PROPOSTA_ACEITA', now() - interval '10 days', 65.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 90, now() - interval '10 days', now() - interval '9 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 5130.00, 5, 7, now() + interval '1 day',
    90, 'Pedido em trânsito — rastreio disponível no detalhe.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'COMPROVANTE_ENVIADO' where id = v_order_id;
  update public.orders set status = 'PAGAMENTO_CONFIRMADO' where id = v_order_id;
  update public.orders set status = 'ENVIO_INFORMADO' where id = v_order_id;

  insert into public.demands (
    buyer_id, category_id, titulo, descricao, quantidade, unidade,
    cidade, uf, raio_km, status, published_at, preco_referencia_mercado
  ) values (
    v_buyer_id, v_cat_moda_fem,
    '[SEED-ER] Pedido — Conjuntos moda praia',
    'Entrega concluída de 60 conjuntos moda praia (biquíni + saída).',
    60, 'conjuntos', 'Rio de Janeiro', 'RJ', 30, 'PROPOSTA_ACEITA', now() - interval '15 days', 95.00
  ) returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (v_demand_id, v_supplier_id, 'offer_sent', 97, now() - interval '15 days', now() - interval '14 days');

  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate,
    quantidade, mensagem, status
  ) values (
    v_demand_id, v_supplier_id, 5100.00, 3, 7, now() - interval '5 days',
    60, 'Pedido entregue e confirmado pelo comprador.', 'enviada'
  ) returning id into v_offer_id;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, v_buyer_id, v_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  update public.orders set status = 'COMPROVANTE_ENVIADO' where id = v_order_id;
  update public.orders set status = 'PAGAMENTO_CONFIRMADO' where id = v_order_id;
  update public.orders set status = 'ENVIO_INFORMADO' where id = v_order_id;
  update public.orders set status = 'ENTREGUE' where id = v_order_id;
  update public.orders set status = 'CONCLUIDO' where id = v_order_id;

  raise notice 'Seed concluído para %: cadastro aprovado + 9 oportunidades + 5 propostas + 4 pedidos.', v_supplier_email;
end $$;
