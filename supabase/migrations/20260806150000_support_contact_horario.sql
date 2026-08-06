-- Horário de atendimento configurável na tela de suporte.

alter table public.support_contact_settings
  add column if not exists horario text;

comment on column public.support_contact_settings.horario is
  'Texto exibido como horário de atendimento (ex.: Seg–Sex, 9h às 18h).';

update public.support_contact_settings
set horario = 'Seg–Sex, 9h às 18h (BRT)'
where id = 1 and (horario is null or horario = '');
