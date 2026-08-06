-- Contatos de suporte configuráveis pelo admin (e-mail e WhatsApp).

create table public.support_contact_settings (
  id smallint primary key default 1 check (id = 1),
  email text,
  whatsapp text,
  updated_at timestamptz not null default now()
);

comment on table public.support_contact_settings is
  'Contatos exibidos nas telas de suporte (singleton, id=1).';
comment on column public.support_contact_settings.whatsapp is
  'Telefone com DDI/DDD, somente dígitos (ex.: 5511999999999).';

insert into public.support_contact_settings (id, email)
values (1, 'suporte@xcommerce.com.br')
on conflict (id) do nothing;

create trigger support_contact_settings_set_updated_at
  before update on public.support_contact_settings
  for each row execute function public.set_updated_at();

alter table public.support_contact_settings enable row level security;

create policy support_contact_settings_select on public.support_contact_settings
  for select to authenticated
  using (true);

create policy support_contact_settings_staff_update on public.support_contact_settings
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.support_contact_settings to authenticated;
grant update on public.support_contact_settings to authenticated;
