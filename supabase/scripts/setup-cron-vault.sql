-- Setup único por ambiente: credenciais do pg_cron no Vault + secret das Edge Functions.
-- Substituir os placeholders antes de executar:
--   npx supabase db query --linked -f supabase/scripts/setup-cron-vault.sql
--   npx supabase secrets set CRON_SECRET=<mesmo_valor>

select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1',
  'supabase_functions_url',
  'Base URL for Edge Functions cron'
)
where not exists (
  select 1 from vault.secrets where name = 'supabase_functions_url'
);

select vault.create_secret(
  'REPLACE_WITH_CRON_SECRET',
  'cron_secret',
  'Bearer token for cron Edge Function calls'
)
where not exists (
  select 1 from vault.secrets where name = 'cron_secret'
);
