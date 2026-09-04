select public.invoke_cron_edge_function(
  'check-diagnostic-alerts',
  '{"dry_run": true}'::jsonb
);
