-- Permite que staff ative/inative contas de outros usuários (não a própria).

create or replace function public.set_user_active_status(
  p_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Acesso negado';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'Não é possível alterar o status da própria conta';
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

revoke all on function public.set_user_active_status(uuid, boolean) from public;
grant execute on function public.set_user_active_status(uuid, boolean) to authenticated;
