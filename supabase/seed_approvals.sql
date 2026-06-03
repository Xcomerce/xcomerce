-- Keve Marketplace B2B — Seed para a tela de Aprovações
-- Esse script popula o banco com fornecedores fictícios aguardando revisão.
-- EXECUTE NO SQL EDITOR DO SUPABASE (dashboard.supabase.com)

-- Fornecedor 1: Alfa Construções e Ferragens LTDA (Em Revisão, possui documentos)
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- 1. Cria usuário auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'fornecedor.alfa@example.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'fornecedor.alfa@example.com',
      crypt('senha123Alfa', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Carlos Silva", "phone": "11999999991", "primary_role": "supplier"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );
  END IF;

  -- 2. Cria Empresa
  INSERT INTO public.companies (
    cnpj,
    razao_social,
    nome_fantasia,
    situacao,
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    cep
  ) VALUES (
    '12345678000199',
    'Alfa Construções e Ferragens LTDA',
    'Alfa Materiais',
    'ATIVA',
    'Avenida das Nações',
    '1500',
    'Centro',
    'São Paulo',
    'SP',
    '01000000'
  )
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social
  RETURNING id INTO v_company_id;

  -- 3. Cria Perfil do Fornecedor
  INSERT INTO public.supplier_profiles (
    user_id,
    company_id,
    status,
    service_city,
    service_uf,
    service_radius_km
  ) VALUES (
    v_user_id,
    v_company_id,
    'em_revisao',
    'São Paulo',
    'SP',
    50
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'em_revisao',
    company_id = EXCLUDED.company_id;

  -- 4. Cria Documentos pendentes
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE supplier_id = v_user_id) THEN
    INSERT INTO public.documents (
      supplier_id,
      document_type,
      storage_path,
      file_name,
      mime_type,
      file_size_bytes,
      review_status
    ) VALUES 
      (v_user_id, 'cnpj_card', 'documents/alfa/cnpj.pdf', 'cartao_cnpj_alfa.pdf', 'application/pdf', 102400, 'pendente'),
      (v_user_id, 'address_proof', 'documents/alfa/comprovante.pdf', 'comprovante_endereco_alfa.pdf', 'application/pdf', 204800, 'pendente');
  END IF;

END $$;


-- Fornecedor 2: Beta Alimentos e Bebidas (Em Revisão, possui apenas CNPJ pendente)
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- 1. Cria usuário auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'fornecedor.beta@example.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'fornecedor.beta@example.com',
      crypt('senha123Beta', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Mariana Souza", "phone": "21988888882", "primary_role": "supplier"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );
  END IF;

  -- 2. Cria Empresa
  INSERT INTO public.companies (
    cnpj,
    razao_social,
    nome_fantasia,
    situacao,
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    cep
  ) VALUES (
    '98765432000188',
    'Beta Alimentos e Bebidas Distribuidora',
    'Beta Alimentos',
    'ATIVA',
    'Rua das Palmeiras',
    '45',
    'Copacabana',
    'Rio de Janeiro',
    'RJ',
    '22000000'
  )
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social
  RETURNING id INTO v_company_id;

  -- 3. Cria Perfil do Fornecedor
  INSERT INTO public.supplier_profiles (
    user_id,
    company_id,
    status,
    service_city,
    service_uf,
    service_radius_km
  ) VALUES (
    v_user_id,
    v_company_id,
    'em_revisao',
    'Rio de Janeiro',
    'RJ',
    30
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'em_revisao',
    company_id = EXCLUDED.company_id;

  -- 4. Cria Documentos pendentes
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE supplier_id = v_user_id) THEN
    INSERT INTO public.documents (
      supplier_id,
      document_type,
      storage_path,
      file_name,
      mime_type,
      file_size_bytes,
      review_status
    ) VALUES 
      (v_user_id, 'cnpj_card', 'documents/beta/cnpj.pdf', 'cnpj_beta.pdf', 'application/pdf', 95000, 'pendente');
  END IF;

END $$;


-- Fornecedor 3: Gama Equipamentos Industriais (Pendente, não enviou documentos)
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- 1. Cria usuário auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'fornecedor.gama@example.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'fornecedor.gama@example.com',
      crypt('senha123Gama', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Roberto Costa", "phone": "31977777773", "primary_role": "supplier"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );
  END IF;

  -- 2. Cria Empresa
  INSERT INTO public.companies (
    cnpj,
    razao_social,
    nome_fantasia,
    situacao,
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    cep
  ) VALUES (
    '11223344000177',
    'Gama Equipamentos Industriais Ltda',
    'Gama Industrial',
    'ATIVA',
    'Rua Metalúrgica',
    '101',
    'Industrial',
    'Belo Horizonte',
    'MG',
    '30000000'
  )
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social
  RETURNING id INTO v_company_id;

  -- 3. Cria Perfil do Fornecedor
  INSERT INTO public.supplier_profiles (
    user_id,
    company_id,
    status,
    service_city,
    service_uf,
    service_radius_km
  ) VALUES (
    v_user_id,
    v_company_id,
    'pendente',
    'Belo Horizonte',
    'MG',
    100
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'pendente',
    company_id = EXCLUDED.company_id;

  -- Fornecedor 3 não tem documentos em public.documents pois seu status é 'pendente' (ainda não submeteu)

END $$;
