-- Keve Marketplace B2B — Supabase Realtime
-- Ref: docs/SCHEMA.md · docs/ARQUITETURA.md §5.5 · docs/MODULOS.md M8/M11

-- REPLICA IDENTITY FULL permite filtros em UPDATE/DELETE (read_at, etc.)
alter table public.offer_messages replica identity full;
alter table public.notifications replica identity full;

-- Publicação Realtime (chat contextual + notificações in-app)
alter publication supabase_realtime add table public.offer_messages;
alter publication supabase_realtime add table public.notifications;
