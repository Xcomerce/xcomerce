-- Endereço de entrega padrão do comprador (buyer_profiles)

alter table public.buyer_profiles
  add column if not exists cep char(8),
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists complemento text;

comment on column public.buyer_profiles.cep is 'CEP de entrega padrão (8 dígitos, sem hífen)';
comment on column public.buyer_profiles.logradouro is 'Logradouro de entrega padrão';
comment on column public.buyer_profiles.numero is 'Número do endereço de entrega padrão';
comment on column public.buyer_profiles.bairro is 'Bairro de entrega padrão';
comment on column public.buyer_profiles.complemento is 'Complemento opcional do endereço de entrega';
