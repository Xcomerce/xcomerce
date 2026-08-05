-- Prazo desejado passa a incluir horário.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demands'
      and column_name = 'prazo_desejado'
      and udt_name = 'date'
  ) then
    alter table public.demands
      alter column prazo_desejado type timestamptz
      using case
        when prazo_desejado is null then null
        else prazo_desejado::timestamp at time zone 'America/Sao_Paulo'
      end;
  end if;
end;
$$;

comment on column public.demands.prazo_desejado is 'Prazo desejado de entrega (data e hora).';
