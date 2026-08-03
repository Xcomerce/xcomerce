-- Seed Moda tree; deactivate all other categories

-- ---------------------------------------------------------------------------
-- 1. Deactivate existing categories
-- ---------------------------------------------------------------------------
update public.categories
set is_active = false;

-- ---------------------------------------------------------------------------
-- 2. Upsert root: Moda
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, parent_id, sort_order, is_active)
values (
  'Moda',
  'moda',
  'Vestuário, calçados, acessórios e insumos de moda',
  null,
  1,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  parent_id = null,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 3. Upsert Moda children
-- ---------------------------------------------------------------------------
with moda as (
  select id from public.categories where slug = 'moda' limit 1
),
children (name, slug, sort_order) as (
  values
    ('Camisetas, blusas e camisas', 'camisetas-blusas-camisas', 1),
    ('Moletons, casacos e jaquetas', 'moletons-casacos-jaquetas', 2),
    ('Calças', 'calcas', 3),
    ('Shorts e bermudas', 'shorts-bermudas', 4),
    ('Saias', 'saias', 5),
    ('Vestidos', 'vestidos', 6),
    ('Macacões e jardineiras', 'macacoes-jardineiras', 7),
    ('Conjuntos', 'conjuntos', 8),
    ('Moda íntima', 'moda-intima', 9),
    ('Modeladores', 'modeladores', 10),
    ('Pijamas e roupas para dormir', 'pijamas-roupas-dormir', 11),
    ('Moda praia', 'moda-praia', 12),
    ('Moda esportiva e fitness', 'moda-esportiva-fitness', 13),
    ('Moda bebê', 'moda-bebe', 14),
    ('Moda infantil', 'moda-infantil', 15),
    ('Moda juvenil', 'moda-juvenil', 16),
    ('Moda gestante e amamentação', 'moda-gestante-amamentacao', 17),
    ('Moda plus size', 'moda-plus-size', 18),
    ('Moda social', 'moda-social', 19),
    ('Festas e cerimônias', 'festas-cerimonias', 20),
    ('Uniformes profissionais', 'uniformes-profissionais', 21),
    ('Uniformes escolares', 'uniformes-escolares', 22),
    ('Moda religiosa e cultural', 'moda-religiosa-cultural', 23),
    ('Fantasias e figurinos', 'fantasias-figurinos', 24),
    ('Calçados', 'calcados', 25),
    ('Bolsas e mochilas', 'bolsas-mochilas', 26),
    ('Malas e acessórios de viagem', 'malas-acessorios-viagem', 27),
    ('Bonés, chapéus e acessórios de cabeça', 'bones-chapeus-acessorios-cabeca', 28),
    ('Acessórios de vestuário', 'acessorios-vestuario', 29),
    ('Óculos e acessórios', 'oculos-acessorios', 30),
    ('Joias', 'joias', 31),
    ('Semijoias e bijuterias', 'semijoias-bijuterias', 32),
    ('Relógios e acessórios', 'relogios-acessorios', 33),
    ('Acessórios para cabelo', 'acessorios-cabelo', 34),
    ('Tecidos e malhas', 'tecidos-malhas', 35),
    ('Aviamentos e insumos', 'aviamentos-insumos', 36),
    ('Estampas e materiais para personalização', 'estampas-materiais-personalizacao', 37),
    ('Embalagens para moda', 'embalagens-moda', 38),
    ('Outros produtos de moda', 'outros-produtos-moda', 39)
)
insert into public.categories (name, slug, parent_id, sort_order, is_active)
select
  c.name,
  c.slug,
  moda.id,
  c.sort_order,
  true
from children c
cross join moda
on conflict (slug) do update
set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  is_active = true;
