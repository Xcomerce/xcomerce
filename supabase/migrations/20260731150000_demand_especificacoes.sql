-- Múltiplas especificações cor/tamanho por demanda.

alter table public.demands
  add column if not exists especificacoes jsonb not null default '[]'::jsonb;

comment on column public.demands.especificacoes is
  'Combinações desejadas de cor/tamanho: [{ "cor": "...", "tamanho": "..." }].';

update public.demands
set especificacoes = jsonb_build_array(
  jsonb_strip_nulls(
    jsonb_build_object(
      'cor', nullif(trim(cor), ''),
      'tamanho', nullif(trim(tamanho), '')
    )
  )
)
where especificacoes = '[]'::jsonb
  and (
    coalesce(trim(cor), '') <> ''
    or coalesce(trim(tamanho), '') <> ''
  );

create or replace function public.supplier_has_compatible_product(
  p_supplier_id uuid,
  p_demand_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.demands d
    join public.products p
      on p.supplier_id = p_supplier_id
     and p.category_id = d.category_id
     and p.is_active = true
    where d.id = p_demand_id
      and (
        case
          when jsonb_array_length(coalesce(d.especificacoes, '[]'::jsonb)) > 0 then
            exists (
              select 1
              from jsonb_array_elements(d.especificacoes) as spec(value)
              where public.product_matches_demand_variants(
                p.tem_cor,
                p.tem_tamanho,
                p.cores,
                p.tamanhos,
                spec.value->>'cor',
                spec.value->>'tamanho'
              )
            )
          else
            public.product_matches_demand_variants(
              p.tem_cor,
              p.tem_tamanho,
              p.cores,
              p.tamanhos,
              d.cor,
              d.tamanho
            )
        end
      )
  );
$$;
