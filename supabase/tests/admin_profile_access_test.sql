-- Testes manuais para acesso administrativo a perfis.
-- Executar após aplicar migration 20260902140000_admin_profile_access.sql
-- com sessão autenticada como admin.

-- 1. Busca por CNPJ (substituir dígitos)
-- select * from public.search_admin_users('12345678000199', 10, 0);

-- 2. Busca por UUID parcial
-- select * from public.search_admin_users('a1b2c3d4', 10, 0);

-- 3. Motivo curto deve falhar
-- select public.admin_update_user_profile(
--   '<user_id>'::uuid,
--   '{"profiles":{"phone":"11999999999"}}'::jsonb,
--   'curto'
-- );

-- 4. Campo não permitido deve falhar
-- select public.admin_update_user_profile(
--   '<user_id>'::uuid,
--   '{"companies":{"cnpj":"12345678000199"}}'::jsonb,
--   'tentativa de alterar cnpj manualmente'
-- );

-- 5. Logs são append-only (deve falhar por ausência de policy)
-- delete from public.profile_change_logs where id = '<log_id>';

-- 6. Histórico unificado
-- select * from public.fetch_profile_history('<user_id>'::uuid, 50, 0);

-- 7. Exclusão em duas etapas
-- select public.admin_request_account_deletion('<user_id>'::uuid, 'motivo detalhado de exclusao');
-- select public.admin_confirm_account_deletion('<token>', 'EXCLUIR CONTA');
