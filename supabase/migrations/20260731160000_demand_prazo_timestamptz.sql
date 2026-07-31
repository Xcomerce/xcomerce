-- Prazo desejado passa a incluir horário.

alter table public.demands
  alter column prazo_desejado type timestamptz
  using case
    when prazo_desejado is null then null
    else (prazo_desejado::text || ' 00:00:00')::timestamp at time zone 'America/Sao_Paulo'
  end;

comment on column public.demands.prazo_desejado is 'Prazo desejado de entrega (data e hora).';
