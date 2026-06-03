-- Keve Marketplace B2B — Seed de catálogo demo (vários segmentos)
-- EXECUTE MANUALMENTE no SQL Editor do Supabase remoto
--
-- Pré-requisitos:
--   1. Migrations aplicadas (init + RLS + triggers)
--   2. seed.sql aplicado (planos + categorias)
--
-- Passos:
--   1. Usuário correaelias1as31@gmail.com deve existir no Auth (signup fornecedor)
--   2. Execute este script no SQL Editor
--
-- Para outro e-mail, altere v_supplier_email abaixo.
-- O script:
--   - Cria empresa + supplier_profile (se ainda não existir)
--   - Marca fornecedor como APROVADO (match/board)
--   - Vincula categorias ao fornecedor
--   - Insere 28 produtos em todos os segmentos do seed.sql
--   - Sobe plano para Gold (limite de catálogo para demo)

DO $$
DECLARE
  v_supplier_email text := 'correaelias1as31@gmail.com';
  v_supplier_id      uuid;
  v_company_id       uuid;
  v_inserted         integer := 0;
BEGIN
  SELECT id INTO v_supplier_id
  FROM public.profiles
  WHERE email = v_supplier_email;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não encontrado em profiles. Faça signup (role supplier) antes.', v_supplier_email;
  END IF;

  -- Bootstrap: empresa + perfil fornecedor
  SELECT sp.company_id INTO v_company_id
  FROM public.supplier_profiles sp
  WHERE sp.user_id = v_supplier_id;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (
      cnpj, razao_social, nome_fantasia,
      logradouro, numero, bairro, cidade, uf, cep
    ) VALUES (
      '11222333000181',
      'Distribuidora Seed Keve LTDA',
      'Keve Supply Demo',
      'Av. Paulista', '1000', 'Bela Vista',
      'São Paulo', 'SP', '01310100'
    )
    ON CONFLICT (cnpj) DO UPDATE
      SET nome_fantasia = EXCLUDED.nome_fantasia
    RETURNING id INTO v_company_id;

    IF v_company_id IS NULL THEN
      SELECT id INTO v_company_id FROM public.companies WHERE cnpj = '11222333000181';
    END IF;

    INSERT INTO public.supplier_profiles (
      user_id, company_id, status, verified_at,
      service_city, service_uf, service_radius_km
    ) VALUES (
      v_supplier_id, v_company_id, 'aprovado', now(),
      'São Paulo', 'SP', 150
    );
  ELSE
    UPDATE public.supplier_profiles
    SET
      status = 'aprovado',
      verified_at = coalesce(verified_at, now()),
      service_city = coalesce(service_city, 'São Paulo'),
      service_uf = coalesce(service_uf, 'SP'),
      service_radius_km = greatest(service_radius_km, 100)
    WHERE user_id = v_supplier_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_supplier_id, 'supplier')
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET primary_role = 'supplier'
  WHERE id = v_supplier_id;

  -- Categorias do fornecedor (necessário para match)
  INSERT INTO public.supplier_categories (supplier_id, category_id)
  SELECT v_supplier_id, c.id
  FROM public.categories c
  WHERE c.slug IN (
    'materiais-construcao', 'cimento-argamassa', 'ferragens', 'tintas-vernizes',
    'alimentos-bebidas', 'equipamentos-industriais', 'embalagens',
    'servicos', 'tecnologia', 'outros'
  )
  ON CONFLICT DO NOTHING;

  -- Produtos demo (SKU SEED-* — re-execução segura)
  INSERT INTO public.products (
    supplier_id, category_id, nome, sku, descricao, marca,
    preco_referencia, cidade, uf, is_active
  )
  SELECT
    v_supplier_id,
    c.id,
    p.nome,
    p.sku,
    p.descricao,
    p.marca,
    p.preco,
    'São Paulo',
    'SP',
    true
  FROM (VALUES
    ('materiais-construcao', 'Tijolo cerâmico 6 furos',            'SEED-MAT-001', 'Tijolo cerâmico estrutural 9x14x24 cm. Palete 500 un.',         'Cerâmica São Jorge',   890.00),
    ('materiais-construcao', 'Brita 1 média — caminhão',         'SEED-MAT-002', 'Brita 1 para concreto e pavimentação. Entrega caminhão 5 m³.',  'Pedreira Central',     420.00),
    ('cimento-argamassa',    'Cimento CP-II 50 kg',              'SEED-CIM-001', 'Cimento Portland composto saco 50 kg. NF e lote.',              'Votoran',               32.90),
    ('cimento-argamassa',    'Argamassa AC-III externa 20 kg',   'SEED-CIM-002', 'Argamassa colante para fachada e áreas molhadas.',              'Quartzolit',            28.50),
    ('cimento-argamassa',    'Rejunte acrílico branco 1 kg',     'SEED-CIM-003', 'Rejunte flexível anti-mofo para porcelanato.',                    'Porcelanato Plus',      18.90),
    ('ferragens',            'Parafuso sextavado M8 x 50',       'SEED-FER-001', 'Parafuso zincado M8x50 mm. Caixa 100 un.',                        'Belenus',               45.00),
    ('ferragens',            'Porca sextavada M8',               'SEED-FER-002', 'Porca zincada M8. Caixa 200 un.',                                 'Belenus',               38.00),
    ('ferragens',            'Dobradiça 3" aço inox',            'SEED-FER-003', 'Dobradiça 3 polegadas inox escovado. Par.',                       'Fortfix',               22.00),
    ('tintas-vernizes',      'Tinta acrílica premium branco 18L', 'SEED-TIN-001', 'Tinta acrílica lavável alto rendimento.',                        'Suvinil',              289.00),
    ('tintas-vernizes',      'Esmalte sintético preto 3,6 L',    'SEED-TIN-002', 'Esmalte base solvente para metal e madeira.',                     'Coral',                145.00),
    ('alimentos-bebidas',    'Arroz tipo 1 pacote 5 kg',         'SEED-ALI-001', 'Arroz branco tipo 1 longo fino. Atacado.',                        'Tio João',              24.90),
    ('alimentos-bebidas',    'Feijão carioca 1 kg',              'SEED-ALI-002', 'Feijão carioca selecionado. Saco 1 kg.',                          'Camil',                  8.50),
    ('alimentos-bebidas',    'Azeite extra virgem 500 ml',       'SEED-ALI-003', 'Azeite português extra virgem. Caixa 12 un.',                     'Gallo',                 32.00),
    ('alimentos-bebidas',    'Água mineral sem gás 510 ml',      'SEED-ALI-004', 'Água mineral natural. Fardo 12 garrafas.',                        'Crystal',               18.00),
    ('equipamentos-industriais', 'Motobomba periférica 1 cv',    'SEED-EQP-001', 'Motobomba monofásica 1 cv para água limpa.',                      'Thebe',                890.00),
    ('equipamentos-industriais', 'Compressor ar 10 pcm',         'SEED-EQP-002', 'Compressor pistão 2 hp 10 pcm tanque 24 L.',                      'Schulz',              1890.00),
    ('equipamentos-industriais', 'Empilhadeira manual 1,5 t',    'SEED-EQP-003', 'Empilhadeira hidráulica manual capacidade 1500 kg.',               'Nobrelift',           3200.00),
    ('equipamentos-industriais', 'Inversor de frequência 5 cv',  'SEED-EQP-004', 'Inversor trifásico 380 V para controle de motor.',                  'WEG',                 2450.00),
    ('embalagens',           'Caixa papelão P — pack 25 un',     'SEED-EMB-001', 'Caixa papelão ondulado 30x20x15 cm. Pack atacado.',               'Klabin',                62.00),
    ('embalagens',           'Filme stretch 500 mm 25 kg',       'SEED-EMB-002', 'Filme stretch manual para paletização.',                            'Plasfil',              118.00),
    ('embalagens',           'Saco plástico LDPE 40x60',         'SEED-EMB-003', 'Saco plástico incolor 40x60 cm. Milheiro.',                       'Embalflex',             95.00),
    ('servicos',             'Instalação elétrica industrial',   'SEED-SRV-001', 'Serviço de instalação e adequação NR-10. Orçamento por visita.',   'Keve Serviços',       1500.00),
    ('servicos',             'Manutenção preventiva HVAC',       'SEED-SRV-002', 'Contrato mensal manutenção ar condicionado central.',              'Keve Serviços',        980.00),
    ('tecnologia',           'Notebook corporativo 14" i5',      'SEED-TEC-001', 'Notebook 14 pol i5 16 GB 512 GB SSD Windows 11 Pro.',             'Dell',                4299.00),
    ('tecnologia',           'Switch gerenciável 24 portas',     'SEED-TEC-002', 'Switch Gigabit L2 24 portas + 4 SFP.',                            'TP-Link',              890.00),
    ('tecnologia',           'Impressora laser mono A4',         'SEED-TEC-003', 'Impressora laser monocromática rede Wi-Fi duplex.',                 'HP',                  1290.00),
    ('tecnologia',           'Licença Microsoft 365 Business',   'SEED-TEC-004', 'Assinatura anual M365 Business Standard por usuário.',            'Microsoft',            360.00),
    ('outros',               'EPI kit básico construção',        'SEED-OUT-001', 'Kit capacete, luva, óculos e protetor auricular.',                  '3M',                   185.00),
    ('outros',               'Uniforme operacional camisa',      'SEED-OUT-002', 'Camisa polo operacional com logo (mín. 20 un).',                    'Keve Uniformes',        45.00)
  ) AS p(slug, nome, sku, descricao, marca, preco)
  JOIN public.categories c ON c.slug = p.slug
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products pr
    WHERE pr.supplier_id = v_supplier_id AND pr.sku = p.sku
  );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Plano Gold demo (200 itens de catálogo)
  UPDATE public.subscriptions s
  SET plan_id = (SELECT id FROM public.plans WHERE code = 'gold' LIMIT 1)
  WHERE s.user_id = v_supplier_id
    AND EXISTS (SELECT 1 FROM public.plans WHERE code = 'gold');

  RAISE NOTICE 'Seed catálogo OK — fornecedor: % (%)', v_supplier_email, v_supplier_id;
  RAISE NOTICE 'Produtos inseridos agora: %', v_inserted;
  RAISE NOTICE 'Total produtos do fornecedor: %',
    (SELECT count(*) FROM public.products WHERE supplier_id = v_supplier_id);
END $$;

-- Verificar resultado:
-- SELECT p.sku, p.nome, c.name AS categoria, p.preco_referencia
-- FROM public.products p
-- JOIN public.categories c ON c.id = p.category_id
-- JOIN public.profiles pr ON pr.id = p.supplier_id
-- WHERE pr.email = 'correaelias1as31@gmail.com'
-- ORDER BY c.slug, p.nome;
