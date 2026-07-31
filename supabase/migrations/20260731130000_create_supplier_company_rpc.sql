-- Cria empresa + supplier_profiles em uma transação (evita 403 no INSERT com SELECT sob RLS).

create or replace function public.create_supplier_company(
  p_cnpj text,
  p_razao_social text,
  p_cidade text,
  p_uf text,
  p_nome_fantasia text default null,
  p_logradouro text default null,
  p_numero text default null,
  p_bairro text default null,
  p_cep text default null,
  p_situacao text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cnpj char(14);
  v_company public.companies;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.has_role('supplier'::public.user_role) then
    raise exception 'Apenas fornecedores podem cadastrar empresa';
  end if;

  if exists (
    select 1
    from public.supplier_profiles sp
    where sp.user_id = v_user_id
  ) then
    raise exception 'Perfil de fornecedor já possui empresa vinculada';
  end if;

  v_cnpj := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  if length(v_cnpj) <> 14 then
    raise exception 'CNPJ inválido';
  end if;

  if exists (
    select 1
    from public.companies c
    join public.supplier_profiles sp on sp.company_id = c.id
    where c.cnpj = v_cnpj
      and sp.user_id <> v_user_id
  ) then
    raise exception 'CNPJ já cadastrado por outro fornecedor';
  end if;

  insert into public.companies (
    cnpj,
    razao_social,
    nome_fantasia,
    cidade,
    uf,
    logradouro,
    numero,
    bairro,
    cep,
    situacao
  )
  values (
    v_cnpj,
    p_razao_social,
    nullif(btrim(p_nome_fantasia), ''),
    p_cidade,
    upper(p_uf),
    nullif(btrim(p_logradouro), ''),
    nullif(btrim(p_numero), ''),
    nullif(btrim(p_bairro), ''),
    nullif(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g'), ''),
    nullif(btrim(p_situacao), '')
  )
  returning * into v_company;

  insert into public.supplier_profiles (user_id, company_id, status)
  values (v_user_id, v_company.id, 'pendente'::public.supplier_status);

  return v_company;
end;
$$;

revoke all on function public.create_supplier_company(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.create_supplier_company(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
