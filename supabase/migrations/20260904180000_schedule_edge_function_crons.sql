-- Agendamento de Edge Functions via pg_cron + pg_net.
--
-- Pré-requisitos (configurados via CLI, não commitar o secret):
--   alter database postgres set app.settings.supabase_functions_url = 'https://<ref>.supabase.co/functions/v1';
--   alter database postgres set app.settings.cron_secret = '<mesmo valor de CRON_SECRET nas Edge Functions>';
--   supabase secrets set CRON_SECRET=<valor>

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.invoke_cron_edge_function(
  p_function_name text,
  p_body jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_base_url text;
  v_cron_secret text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  v_base_url := nullif(current_setting('app.settings.supabase_functions_url', true), '');
  v_cron_secret := nullif(current_setting('app.settings.cron_secret', true), '');
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

revoke all on function public.invoke_cron_edge_function(text, jsonb) from public;
grant execute on function public.invoke_cron_edge_function(text, jsonb) to postgres;

do $$
begin
  perform cron.unschedule('check-sla-deadlines-hourly');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('expire-demands-daily');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('check-diagnostic-alerts-hourly');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'check-sla-deadlines-hourly',
  '0 * * * *',
  $$select public.invoke_cron_edge_function('check-sla-deadlines', '{"dry_run": false}'::jsonb)$$
);

select cron.schedule(
  'expire-demands-daily',
  '0 6 * * *',
  $$select public.invoke_cron_edge_function('expire-demands', '{"dry_run": false}'::jsonb)$$
);

select cron.schedule(
  'check-diagnostic-alerts-hourly',
  '0 * * * *',
  $$select public.invoke_cron_edge_function('check-diagnostic-alerts', '{"threshold": 5}'::jsonb)$$
);
