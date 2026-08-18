-- Seed: pedidos em todos os status para eduardo.azevedo+1@sagittadigital.com.br
-- Executar: npx supabase db query --linked -f supabase/seed_buyer_orders_eduardo_azevedo_plus1.sql

create or replace function pg_temp.seed_buyer_order(
  p_buyer_id uuid,
  p_supplier_id uuid,
  p_category_id uuid,
  p_suffix text,
  p_titulo text,
  p_target_status public.order_status
)
returns void
language plpgsql
as $$
declare
  v_demand_id uuid;
  v_offer_id uuid;
  v_order_id uuid;
begin
  insert into public.demands (
    buyer_id,
    category_id,
    titulo,
    descricao,
    quantidade,
    unidade,
    cidade,
    uf,
    raio_km,
    status,
    published_at,
    preco_referencia_mercado
  ) values (
    p_buyer_id,
    p_category_id,
    '[SEED-EA1-ORD] ' || p_titulo,
    'Pedido de demonstração para validar a tela Meus pedidos — status ' || p_suffix || '.',
    100,
    'unidades',
    'Rio de Janeiro',
    'RJ',
    50,
    'PROPOSTA_ACEITA',
    now() - interval '3 days',
    35.00
  )
  returning id into v_demand_id;

  insert into public.demand_matches (demand_id, supplier_id, status, score, notified_at, viewed_at)
  values (
    v_demand_id,
    p_supplier_id,
    'offer_sent',
    90,
    now() - interval '3 days',
    now() - interval '2 days'
  );

  insert into public.offers (
    demand_id,
    supplier_id,
    valor,
    prazo_entrega_dias,
    validade_dias,
    validade_ate,
    quantidade,
    mensagem,
    status
  ) values (
    v_demand_id,
    p_supplier_id,
    3500.00,
    5,
    7,
    now() + interval '5 days',
    100,
    'Proposta seed — ' || p_suffix,
    'enviada'
  )
  returning id into v_offer_id;

  if p_target_status = 'PAGAMENTO_INFORMADO' then
    insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
    values (v_demand_id, v_offer_id, p_buyer_id, p_supplier_id, 'PAGAMENTO_INFORMADO');
    return;
  end if;

  insert into public.orders (demand_id, offer_id, buyer_id, supplier_id, status)
  values (v_demand_id, v_offer_id, p_buyer_id, p_supplier_id, 'PROPOSTA_ACEITA')
  returning id into v_order_id;

  if p_target_status = 'AGUARDANDO_CONFIRMACAO_EXTERNA' then
    return;
  end if;

  if p_target_status in (
    'COMPROVANTE_ENVIADO',
    'PAGAMENTO_CONFIRMADO',
    'ENVIO_INFORMADO',
    'ENTREGUE',
    'CONCLUIDO'
  ) then
    update public.orders set status = 'COMPROVANTE_ENVIADO' where id = v_order_id;
  end if;

  if p_target_status in (
    'PAGAMENTO_CONFIRMADO',
    'ENVIO_INFORMADO',
    'ENTREGUE',
    'CONCLUIDO'
  ) then
    update public.orders set status = 'PAGAMENTO_CONFIRMADO' where id = v_order_id;
  end if;

  if p_target_status in ('ENVIO_INFORMADO', 'ENTREGUE', 'CONCLUIDO') then
    update public.orders set status = 'ENVIO_INFORMADO' where id = v_order_id;
  end if;

  if p_target_status in ('ENTREGUE', 'CONCLUIDO') then
    update public.orders set status = 'ENTREGUE' where id = v_order_id;
  end if;

  if p_target_status = 'CONCLUIDO' then
    update public.orders
    set status = 'CONCLUIDO', completed_at = now() - interval '1 day'
    where id = v_order_id;
  end if;

  if p_target_status = 'CANCELADO' then
    update public.orders
    set
      status = 'CANCELADO',
      cancel_reason = 'Seed: pedido cancelado para demonstração.',
      canceled_by = p_buyer_id
    where id = v_order_id;
  end if;

  if p_target_status = 'EXPIRADO' then
    update public.orders set status = 'EXPIRADO' where id = v_order_id;
  end if;
end;
$$;

do $$
declare
  v_buyer_email text := 'eduardo.azevedo+1@sagittadigital.com.br';
  v_supplier_email text := 'er75793459@gmail.com';
  v_buyer_id uuid;
  v_supplier_id uuid;
  v_category_id uuid;
  v_seed_demands uuid[];
begin
  select id into v_buyer_id
  from auth.users
  where email = v_buyer_email;

  if v_buyer_id is null then
    raise exception 'Usuário % não encontrado. Faça login ou cadastre-se primeiro.', v_buyer_email;
  end if;

  select id into v_supplier_id
  from auth.users
  where email = v_supplier_email;

  if v_supplier_id is null then
    raise exception 'Fornecedor % não encontrado. Execute seed_supplier_er75793459.sql antes.', v_supplier_email;
  end if;

  insert into public.profiles (id, email, full_name, primary_role)
  values (v_buyer_id, v_buyer_email, 'Eduardo Azevedo', 'buyer')
  on conflict (id) do update
  set email = excluded.email, full_name = excluded.full_name, primary_role = 'buyer';

  insert into public.user_roles (user_id, role)
  values (v_buyer_id, 'buyer')
  on conflict do nothing;

  insert into public.buyer_profiles (user_id)
  values (v_buyer_id)
  on conflict do nothing;

  select id into v_category_id
  from public.categories
  where slug = 'camisetas-blusas-camisas'
  limit 1;

  if v_category_id is null then
    select id into v_category_id from public.categories where is_active = true limit 1;
  end if;

  select array_agg(d.id)
  into v_seed_demands
  from public.demands d
  where d.titulo like '[SEED-EA1-ORD]%';

  if v_seed_demands is not null then
    delete from public.orders where demand_id = any (v_seed_demands);
    delete from public.offers where demand_id = any (v_seed_demands);
    delete from public.demand_matches where demand_id = any (v_seed_demands);
    delete from public.demands where id = any (v_seed_demands);
  end if;

  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'AGUARDANDO_CONFIRMACAO_EXTERNA', 'Aguardando pagamento', 'AGUARDANDO_CONFIRMACAO_EXTERNA');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'COMPROVANTE_ENVIADO', 'Comprovante enviado', 'COMPROVANTE_ENVIADO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'PAGAMENTO_CONFIRMADO', 'Pagamento confirmado', 'PAGAMENTO_CONFIRMADO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'PAGAMENTO_INFORMADO', 'Pagamento informado (legado)', 'PAGAMENTO_INFORMADO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'ENVIO_INFORMADO', 'Envio informado', 'ENVIO_INFORMADO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'ENTREGUE', 'Entregue', 'ENTREGUE');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'CONCLUIDO', 'Concluído', 'CONCLUIDO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'CANCELADO', 'Cancelado', 'CANCELADO');
  perform pg_temp.seed_buyer_order(v_buyer_id, v_supplier_id, v_category_id, 'EXPIRADO', 'Expirado', 'EXPIRADO');

  raise notice 'Seed concluído: 9 pedidos criados para %.', v_buyer_email;
end $$;
