-- Reorganize Moda tree into 8 main root categories for the buyer feed.

-- ---------------------------------------------------------------------------
-- 1. Upsert 8 root categories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, parent_id, sort_order, is_active)
values
  ('Moda Masculina', 'moda-masculina', null, 1, true),
  ('Moda Feminina', 'moda-feminina', null, 2, true),
  ('Calçados', 'calcados-principal', null, 3, true),
  ('Acessórios', 'acessorios-principal', null, 4, true),
  ('Enxoval e Casa', 'enxoval-casa', null, 5, true),
  ('Eletrônicos', 'eletronicos', null, 6, true),
  ('Esportes', 'esportes', null, 7, true),
  ('Infantil', 'infantil', null, 8, true)
on conflict (slug) do update
set
  name = excluded.name,
  parent_id = null,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 2. Reparent existing Moda subcategories
-- ---------------------------------------------------------------------------
update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'moda-masculina'
  and c.slug in (
    'camisetas-blusas-camisas',
    'moletons-casacos-jaquetas',
    'calcas',
    'shorts-bermudas',
    'moda-social',
    'uniformes-profissionais'
  );

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'moda-feminina'
  and c.slug in (
    'saias',
    'vestidos',
    'macacoes-jardineiras',
    'conjuntos',
    'moda-intima',
    'modeladores',
    'pijamas-roupas-dormir',
    'moda-praia',
    'moda-gestante-amamentacao',
    'moda-plus-size',
    'festas-cerimonias',
    'moda-religiosa-cultural'
  );

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'calcados-principal'
  and c.slug = 'calcados';

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'acessorios-principal'
  and c.slug in (
    'bolsas-mochilas',
    'malas-acessorios-viagem',
    'bones-chapeus-acessorios-cabeca',
    'acessorios-vestuario',
    'oculos-acessorios',
    'joias',
    'semijoias-bijuterias',
    'relogios-acessorios',
    'acessorios-cabelo'
  );

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'enxoval-casa'
  and c.slug in (
    'tecidos-malhas',
    'aviamentos-insumos',
    'estampas-materiais-personalizacao',
    'embalagens-moda'
  );

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'esportes'
  and c.slug = 'moda-esportiva-fitness';

update public.categories c
set parent_id = p.id
from public.categories p
where p.slug = 'infantil'
  and c.slug in (
    'moda-bebe',
    'moda-infantil',
    'moda-juvenil',
    'uniformes-escolares',
    'fantasias-figurinos',
    'outros-produtos-moda'
  );

-- ---------------------------------------------------------------------------
-- 3. Generic subcategory for Eletrônicos
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, parent_id, sort_order, is_active)
select
  'Eletrônicos gerais',
  'eletronicos-gerais',
  p.id,
  1,
  true
from public.categories p
where p.slug = 'eletronicos'
on conflict (slug) do update
set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Deactivate old Moda root
-- ---------------------------------------------------------------------------
update public.categories
set is_active = false
where slug = 'moda';

-- ---------------------------------------------------------------------------
-- 5. Keep legacy root categories inactive
-- ---------------------------------------------------------------------------
update public.categories
set is_active = false
where slug in (
  'materiais-construcao',
  'alimentos-bebidas',
  'equipamentos-industriais',
  'embalagens',
  'servicos',
  'tecnologia',
  'outros'
)
and parent_id is null;

-- ---------------------------------------------------------------------------
-- 6. Remap supplier_categories pointing to old Moda root
-- ---------------------------------------------------------------------------
delete from public.supplier_categories sc
using public.categories c
where sc.category_id = c.id
  and c.slug = 'moda';
