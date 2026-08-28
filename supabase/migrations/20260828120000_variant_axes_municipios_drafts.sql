-- Eixos genéricos de variação, municípios IBGE, rascunhos e normalização aprimorada.

-- ---------------------------------------------------------------------------
-- Normalização unificada (unaccent + espaços colapsados)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_variant_value(p_value text)
returns text
language sql
immutable
as $$
  select lower(
    trim(
      regexp_replace(
        extensions.unaccent(coalesce(p_value, '')),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Produtos: eixos genéricos e rascunhos
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists variant_axes jsonb not null default '[]'::jsonb,
  add column if not exists is_draft boolean not null default false,
  add column if not exists draft_expires_at timestamptz;

comment on column public.products.variant_axes is
  'Eixos de variação: [{ "name": "Cor", "options": ["Azul"], "images": { "Azul": "url" } }].';
comment on column public.products.is_draft is
  'Rascunho auto-salvo; não conta no limite do catálogo enquanto is_draft=true.';
comment on column public.products.draft_expires_at is
  'Expiração do rascunho (30 dias após última edição).';

alter table public.products
  add constraint products_variant_axes_array_check
  check (jsonb_typeof(variant_axes) = 'array');

-- Migrar tem_cor/tem_tamanho legado → variant_axes
update public.products p
set variant_axes = (
  select coalesce(jsonb_agg(axis order by sort_order), '[]'::jsonb)
  from (
    select 1 as sort_order, jsonb_build_object(
      'name', 'Cor',
      'options', to_jsonb(p.cores),
      'images', '{}'::jsonb
    ) as axis
    where p.tem_cor and coalesce(array_length(p.cores, 1), 0) > 0
    union all
    select 2, jsonb_build_object(
      'name', case
        when p.tipo_tamanho = 'calcado' then 'Numeração'
        else 'Tamanho'
      end,
      'options', to_jsonb(p.tamanhos),
      'images', '{}'::jsonb
    )
    where p.tem_tamanho and coalesce(array_length(p.tamanhos, 1), 0) > 0
  ) axes
)
where variant_axes = '[]'::jsonb
  and (p.tem_cor or p.tem_tamanho);

-- Migrar estoque_variacoes: adicionar campo values
update public.products p
set estoque_variacoes = (
  select coalesce(jsonb_agg(
    case
      when elem ? 'values' then elem
      else elem || jsonb_build_object(
        'values',
        jsonb_strip_nulls(
          jsonb_build_object(
            'Cor', nullif(trim(elem->>'cor'), ''),
            'Tamanho', nullif(trim(elem->>'tamanho'), ''),
            'Numeração', case
              when p.tipo_tamanho = 'calcado' then nullif(trim(elem->>'tamanho'), '')
              else null
            end
          )
        )
      )
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(p.estoque_variacoes) elem
)
where jsonb_array_length(p.estoque_variacoes) > 0
  and exists (
    select 1
    from jsonb_array_elements(p.estoque_variacoes) elem
    where not (elem ? 'values')
  );

-- Demandas: eixos de variação editáveis
alter table public.demands
  add column if not exists variant_axes jsonb not null default '[]'::jsonb;

comment on column public.demands.variant_axes is
  'Nomes dos eixos de variação: [{ "name": "Cor" }, { "name": "Tamanho" }].';

-- Migrar especificacoes legado → values quando ausente
update public.demands d
set especificacoes = (
  select coalesce(jsonb_agg(
    case
      when elem ? 'values' then elem
      else elem || jsonb_build_object(
        'values',
        jsonb_strip_nulls(
          jsonb_build_object(
            'Cor', nullif(trim(elem->>'cor'), ''),
            'Tamanho', nullif(trim(elem->>'tamanho'), '')
          )
        )
      )
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(d.especificacoes) elem
)
where jsonb_array_length(d.especificacoes) > 0
  and exists (
    select 1
    from jsonb_array_elements(d.especificacoes) elem
    where not (elem ? 'values')
  );

-- ---------------------------------------------------------------------------
-- Municípios IBGE (coordenadas para proximidade cross-UF)
-- ---------------------------------------------------------------------------
create table if not exists public.municipios_ibge (
  id serial primary key,
  nome text not null,
  uf char(2) not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  nome_normalizado text generated always as (
    public.normalize_variant_value(nome)
  ) stored,
  constraint municipios_ibge_nome_uf_unique unique (nome, uf)
);

create index if not exists idx_municipios_ibge_nome_norm on public.municipios_ibge (nome_normalizado);
create index if not exists idx_municipios_ibge_geo on public.municipios_ibge (latitude, longitude);

comment on table public.municipios_ibge is
  'Municípios brasileiros com coordenadas IBGE para busca por proximidade.';

-- Seed inicial (cidades-chave + amostra regional)
insert into public.municipios_ibge (nome, uf, latitude, longitude) values
  ('Franca', 'SP', -20.5386110, -47.4008330),
  ('Batatais', 'SP', -20.8911110, -47.5850000),
  ('Claraval', 'MG', -20.3988890, -47.2666670),
  ('São Paulo', 'SP', -23.5505200, -46.6333090),
  ('Ribeirão Preto', 'SP', -21.1775000, -47.8102780),
  ('Uberaba', 'MG', -19.7477780, -47.9380560),
  ('Passos', 'MG', -20.7188890, -46.6100000),
  ('Cristais Paulista', 'SP', -20.3936110, -47.5216670),
  ('Itirapuã', 'SP', -20.6477780, -47.2222220),
  ('Restinga', 'SP', -20.6033330, -47.4788890),
  ('Patrocínio Paulista', 'SP', -20.6386110, -47.2816670),
  ('Jeriquara', 'SP', -20.3116670, -47.5930560),
  ('Rio de Janeiro', 'RJ', -22.9068470, -43.1728970),
  ('Belo Horizonte', 'MG', -19.9166810, -43.9344930),
  ('Curitiba', 'PR', -25.4289540, -49.2671370),
  ('Porto Alegre', 'RS', -30.0346470, -51.2176580),
  ('Brasília', 'DF', -15.7938890, -47.8827780),
  ('Salvador', 'BA', -12.9777490, -38.5016290),
  ('Fortaleza', 'CE', -3.7318620, -38.5266670),
  ('Recife', 'PE', -8.0475620, -34.8770030)
on conflict (nome, uf) do nothing;

-- Haversine em km
create or replace function public.haversine_km(
  p_lat1 numeric,
  p_lon1 numeric,
  p_lat2 numeric,
  p_lon2 numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    (
      6371 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(p_lat1)) * cos(radians(p_lat2))
          * cos(radians(p_lon2) - radians(p_lon1))
          + sin(radians(p_lat1)) * sin(radians(p_lat2))
        ))
      )
    )::numeric,
    1
  );
$$;

-- Busca municípios por query (ignora acento, cross-UF)
create or replace function public.search_municipios_ibge(
  p_query text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_limit integer default 10
)
returns table (
  nome text,
  uf char(2),
  latitude numeric,
  longitude numeric,
  distance_km numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      m.nome,
      m.uf,
      m.latitude,
      m.longitude,
      case
        when p_lat is not null and p_lng is not null then
          public.haversine_km(p_lat, p_lng, m.latitude, m.longitude)
        else null
      end as distance_km
    from public.municipios_ibge m
    where
      p_query is null
      or trim(p_query) = ''
      or m.nome_normalizado like '%' || public.normalize_variant_value(p_query) || '%'
  )
  select
    b.nome,
    b.uf,
    b.latitude,
    b.longitude,
    b.distance_km
  from base b
  order by
    case when b.distance_km is not null then 0 else 1 end,
    b.distance_km nulls last,
    b.nome
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

-- Match genérico produto ↔ demanda via variant_axes + values
create or replace function public.product_matches_demand_spec(
  p_variant_axes jsonb,
  p_spec_values jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_spec_values is null
    or p_spec_values = '{}'::jsonb
    or not exists (
      select 1
      from jsonb_each(p_spec_values) as spec(axis_name, axis_value)
      where public.normalize_variant_value(spec.axis_value #>> '{}') <> ''
        and not exists (
          select 1
          from jsonb_array_elements(coalesce(p_variant_axes, '[]'::jsonb)) as ax(elem)
          where public.normalize_variant_value(ax.elem->>'name')
              = public.normalize_variant_value(spec.axis_name)
            and exists (
              select 1
              from jsonb_array_elements_text(coalesce(ax.elem->'options', '[]'::jsonb)) as opt(val)
              where public.normalize_variant_value(opt.val)
                  = public.normalize_variant_value(spec.axis_value #>> '{}')
            )
        )
    );
$$;

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
     and p.is_draft = false
    where d.id = p_demand_id
      and (
        case
          when jsonb_array_length(coalesce(d.especificacoes, '[]'::jsonb)) > 0 then
            exists (
              select 1
              from jsonb_array_elements(d.especificacoes) as spec(value)
              where (
                spec.value ? 'values'
                and public.product_matches_demand_spec(p.variant_axes, spec.value->'values')
              ) or (
                not (spec.value ? 'values')
                and public.product_matches_demand_variants(
                  p.tem_cor,
                  p.tem_tamanho,
                  p.cores,
                  p.tamanhos,
                  spec.value->>'cor',
                  spec.value->>'tamanho'
                )
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

grant execute on function public.haversine_km(numeric, numeric, numeric, numeric) to authenticated, service_role;
grant execute on function public.search_municipios_ibge(text, numeric, numeric, integer) to authenticated, service_role;
grant execute on function public.product_matches_demand_spec(jsonb, jsonb) to authenticated, service_role;

grant select on public.municipios_ibge to authenticated, service_role;
