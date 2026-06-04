-- Seed script: extra demands and offers for eduardo.ribeiro@sagittadigital.com.br
-- Paste this script into your Supabase Dashboard SQL Editor (https://supabase.com/dashboard) and run it.

do $$
declare
  v_buyer_id uuid;
  v_category_id uuid;
  v_supplier_id uuid;
  v_supplier_beta_id uuid;
  v_company_id uuid;
  v_company_beta_id uuid;
  v_demand_1_id uuid := gen_random_uuid();
  v_demand_2_id uuid := gen_random_uuid();
  v_cnpj_alpha char(14);
  v_cnpj_beta char(14);
begin
  -- 1. Get the buyer user ID from auth.users
  select id into v_buyer_id
  from auth.users
  where email = 'eduardo.ribeiro@sagittadigital.com.br';

  if v_buyer_id is null then
    raise exception 'User eduardo.ribeiro@sagittadigital.com.br not found in auth.users. Please log in or sign up first.';
  end if;

  -- Generate unique CNPJs using current epoch timestamp to avoid unique constraints
  v_cnpj_alpha := substr(replace(extract(epoch from clock_timestamp())::text, '.', '') || '01', 1, 14);
  v_cnpj_beta  := substr(replace(extract(epoch from clock_timestamp())::text, '.', '') || '02', 1, 14);

  -- Ensure public profile and buyer profile exist
  insert into public.profiles (id, email, full_name, primary_role)
  values (v_buyer_id, 'eduardo.ribeiro@sagittadigital.com.br', 'Eduardo Ribeiro', 'buyer')
  on conflict (id) do update set primary_role = 'buyer';

  insert into public.user_roles (user_id, role)
  values (v_buyer_id, 'buyer')
  on conflict do nothing;

  insert into public.buyer_profiles (user_id)
  values (v_buyer_id)
  on conflict do nothing;

  -- 2. Find a category
  select id into v_category_id
  from public.categories
  where slug = 'cimento-argamassa'
  limit 1;

  if v_category_id is null then
    select id into v_category_id from public.categories limit 1;
  end if;

  -- 3. Get or create Supplier Alpha user
  select id into v_supplier_id
  from auth.users
  where email = 'fornecedor.alpha@example.com';

  if v_supplier_id is null then
    v_supplier_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_supplier_id, 'fornecedor.alpha@example.com', '{"full_name": "Fornecedor Alpha", "primary_role": "supplier"}');
  end if;

  -- Get or create Supplier Beta user
  select id into v_supplier_beta_id
  from auth.users
  where email = 'fornecedor.beta@example.com';

  if v_supplier_beta_id is null then
    v_supplier_beta_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_supplier_beta_id, 'fornecedor.beta@example.com', '{"full_name": "Fornecedor Beta", "primary_role": "supplier"}');
  end if;

  -- Clean up old matches and offers for these suppliers to avoid unique constraint violations
  delete from public.offers where supplier_id in (v_supplier_id, v_supplier_beta_id);
  delete from public.demand_matches where supplier_id in (v_supplier_id, v_supplier_beta_id);
  delete from public.supplier_profiles where user_id in (v_supplier_id, v_supplier_beta_id);
  delete from public.user_roles where user_id in (v_supplier_id, v_supplier_beta_id);
  delete from public.profiles where id in (v_supplier_id, v_supplier_beta_id);

  -- 4. Setup Supplier Alpha profiles
  insert into public.profiles (id, email, full_name, primary_role)
  values (v_supplier_id, 'fornecedor.alpha@example.com', 'Fornecedor Alpha', 'supplier')
  on conflict (id) do update set primary_role = 'supplier';

  insert into public.user_roles (user_id, role)
  values (v_supplier_id, 'supplier')
  on conflict do nothing;

  insert into public.companies (cnpj, razao_social, nome_fantasia, cidade, uf)
  values (v_cnpj_alpha, 'Fornecedora Alpha Ltda', 'Fornecedor Alpha', 'São Paulo', 'SP')
  returning id into v_company_id;

  insert into public.supplier_profiles (user_id, company_id, status)
  values (v_supplier_id, v_company_id, 'aprovado')
  on conflict (user_id) do nothing;

  -- 5. Setup Supplier Beta profiles
  insert into public.profiles (id, email, full_name, primary_role)
  values (v_supplier_beta_id, 'fornecedor.beta@example.com', 'Fornecedor Beta', 'supplier')
  on conflict (id) do update set primary_role = 'supplier';

  insert into public.user_roles (user_id, role)
  values (v_supplier_beta_id, 'supplier')
  on conflict do nothing;

  insert into public.companies (cnpj, razao_social, nome_fantasia, cidade, uf)
  values (v_cnpj_beta, 'Materiais Beta S/A', 'Beta Materiais', 'Guarulhos', 'SP')
  returning id into v_company_beta_id;

  insert into public.supplier_profiles (user_id, company_id, status)
  values (v_supplier_beta_id, v_company_beta_id, 'aprovado')
  on conflict (user_id) do nothing;

  -- 6. Create Demand 1: Cimento (Status: OFERTAS_RECEBIDAS)
  insert into public.demands (
    id, buyer_id, category_id, titulo, descricao, quantidade, unidade, cidade, uf, raio_km, status, published_at
  ) values (
    v_demand_1_id,
    v_buyer_id,
    v_category_id,
    'Cimento Votoran CP II - 50kg',
    'Necessito de 200 sacos de cimento CP II para obra comercial.',
    200,
    'sacos',
    'São Paulo',
    'SP',
    50,
    'OFERTAS_RECEBIDAS',
    now() - interval '1 day'
  ) on conflict (id) do nothing;

  -- Link matches
  insert into public.demand_matches (demand_id, supplier_id, status)
  values (v_demand_1_id, v_supplier_id, 'offer_sent')
  on conflict do nothing;

  insert into public.demand_matches (demand_id, supplier_id, status)
  values (v_demand_1_id, v_supplier_beta_id, 'offer_sent')
  on conflict do nothing;

  -- Insert Offer 1 (Alpha)
  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate, quantidade, mensagem, status
  ) values (
    v_demand_1_id,
    v_supplier_id,
    6400.00, -- R$ 32,00 per bag
    3,
    7,
    now() + interval '6 days',
    200,
    'Consigo entregar em até 3 dias úteis. Cimento novo direto da distribuidora.',
    'enviada'
  ) on conflict do nothing;

  -- Insert Offer 2 (Beta)
  insert into public.offers (
    demand_id, supplier_id, valor, prazo_entrega_dias, validade_dias, validade_ate, quantidade, mensagem, status
  ) values (
    v_demand_1_id,
    v_supplier_beta_id,
    6200.00, -- R$ 31,00 per bag
    5,
    5,
    now() + interval '4 days',
    200,
    'Preço promocional para lote fechado de 200 sacos.',
    'enviada'
  ) on conflict do nothing;

  -- 7. Create Demand 2: Argamassa (Status: PUBLICADA, no offers yet)
  insert into public.demands (
    id, buyer_id, category_id, titulo, descricao, quantidade, unidade, cidade, uf, raio_km, status, published_at
  ) values (
    v_demand_2_id,
    v_buyer_id,
    v_category_id,
    'Argamassa AC-III Cinza 20kg - Quartzolit',
    'Solicitação de 80 sacos de argamassa AC-III cinza de 20kg para assentamento de porcelanato grande formato.',
    80,
    'sacos',
    'São Paulo',
    'SP',
    50,
    'PUBLICADA',
    now()
  ) on conflict (id) do nothing;

  -- Link matches
  insert into public.demand_matches (demand_id, supplier_id, status)
  values (v_demand_2_id, v_supplier_id, 'notified')
  on conflict do nothing;

  raise notice 'Seed executed successfully!';
end $$;
