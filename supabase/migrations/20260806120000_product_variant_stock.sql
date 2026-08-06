-- Estoque por variação (cor/tamanho) no catálogo do fornecedor.

alter table public.products
  add column if not exists estoque_variacoes jsonb not null default '[]'::jsonb;

comment on column public.products.estoque_variacoes is
  'Array JSON: [{ cor, tamanho, quantidade, ilimitado }]. quantidade null quando ilimitado=true.';

alter table public.products
  add constraint products_estoque_variacoes_array_check
  check (jsonb_typeof(estoque_variacoes) = 'array');
