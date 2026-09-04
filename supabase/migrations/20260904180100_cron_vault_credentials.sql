-- invoke_cron_edge_function: ler credenciais do Vault (app.settings como fallback).

create or replace function public.invoke_cron_edge_function(
  p_function_name text,
  p_body jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_base_url text;
  v_cron_secret text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'supabase_functions_url'
  limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  v_base_url := coalesce(
    nullif(v_base_url, ''),
    nullif(current_setting('app.settings.supabase_functions_url', true), '')
  );
  v_cron_secret := coalesce(
    nullif(v_cron_secret, ''),
    nullif(current_setting('app.settings.cron_secret', true), '')
  );

  if v_base_url is null or v_cron_secret is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron_secret
    ),
    body := coalesce(p_body, '{}'::jsonb)
  );
exception
  when undefined_function or invalid_schema_name then
    null;
end;
$$;
