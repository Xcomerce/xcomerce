-- Seed: planos e categorias iniciais
-- Executar após init migration (supabase db reset ou seed local)

-- ---------------------------------------------------------------------------
-- Planos (M13 — PRD)
-- ---------------------------------------------------------------------------
insert into public.plans (
  code,
  name,
  description,
  max_demands_monthly,
  max_offers_monthly,
  max_catalog_items,
  match_priority,
  price,
  trial_days,
  sort_order
) values
  (
    'free',
    'Free',
    'Plano gratuito com limites básicos',
    3,
    5,
    10,
    false,
    0,
    0,
    1
  ),
  (
    'pro',
    'Pro',
    'Plano profissional para operação regular',
    15,
    30,
    50,
    false,
    99.90,
    14,
    2
  ),
  (
    'gold',
    'Gold',
    'Prioridade no match e limites ampliados',
    null,
    null,
    200,
    true,
    249.90,
    14,
    3
  )
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Categorias raiz (exemplos — admin pode expandir)
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, sort_order) values
  ('Materiais de Construção', 'materiais-construcao', 1),
  ('Alimentos e Bebidas', 'alimentos-bebidas', 2),
  ('Equipamentos Industriais', 'equipamentos-industriais', 3),
  ('Embalagens', 'embalagens', 4),
  ('Serviços', 'servicos', 5),
  ('Tecnologia', 'tecnologia', 6),
  ('Outros', 'outros', 99)
on conflict (slug) do nothing;

-- Subcategorias exemplo (Materiais de Construção)
insert into public.categories (parent_id, name, slug, sort_order)
select c.id, sub.name, sub.slug, sub.sort_order
from public.categories c
cross join (values
  ('Cimento e Argamassa', 'cimento-argamassa', 1),
  ('Ferragens', 'ferragens', 2),
  ('Tintas e Vernizes', 'tintas-vernizes', 3)
) as sub(name, slug, sort_order)
where c.slug = 'materiais-construcao'
on conflict (slug) do nothing;
