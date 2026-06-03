-- Keve Marketplace B2B — Seed admin user
-- EXECUTE MANUALMENTE no SQL Editor do Supabase remoto
-- Substitua os valores abaixo antes de executar

-- 1. Crie o usuário admin no Auth (Dashboard > Authentication > Users > Add user)
--    Email: admin@keve.com.br
--    Password: (defina uma senha forte)
--    Copie o UUID gerado e substitua abaixo:

-- \set admin_id 'COLE-UUID-DO-USUARIO-AQUI'

-- 2. Execute o bloco abaixo substituindo o UUID:

/*
DO $$
DECLARE
  v_admin_id uuid := 'COLE-UUID-DO-USUARIO-AQUI';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, primary_role, is_active)
  VALUES (v_admin_id, 'admin@keve.com.br', 'Administrador Keve', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET
    primary_role = 'admin',
    full_name = EXCLUDED.full_name,
    is_active = true;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'commercial')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin configurado: %', v_admin_id;
END $$;
*/

-- Alternativa: se o usuário já fez signup e você só quer promover:
-- UPDATE public.profiles SET primary_role = 'admin' WHERE email = 'admin@keve.com.br';
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM public.profiles WHERE email = 'admin@keve.com.br'
-- ON CONFLICT DO NOTHING;
