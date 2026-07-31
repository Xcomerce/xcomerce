-- Notificações de onboarding/aprovação de fornecedor (in-app + e-mail via pg_net quando configurado).

create or replace function public.invoke_send_email(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_base_url text;
  v_service_key text;
begin
  if not exists (
    select 1 from pg_extension where extname = 'pg_net'
  ) then
    return;
  end if;

  v_base_url := nullif(current_setting('app.settings.supabase_functions_url', true), '');
  if v_base_url is null then
    return;
  end if;

  v_service_key := coalesce(nullif(current_setting('app.settings.service_role_key', true), ''), '');

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := p_payload
  );
exception
  when undefined_function or invalid_schema_name then
    null;
end;
$$;

create or replace function public.supplier_profiles_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier_name text;
  v_supplier_email text;
  v_company_name text;
  v_staff record;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  select p.full_name, p.email
  into v_supplier_name, v_supplier_email
  from public.profiles p
  where p.id = new.user_id;

  select coalesce(nullif(btrim(c.nome_fantasia), ''), c.razao_social)
  into v_company_name
  from public.companies c
  where c.id = new.company_id;

  v_supplier_name := coalesce(nullif(btrim(v_supplier_name), ''), 'Fornecedor');
  v_company_name := coalesce(nullif(btrim(v_company_name), ''), 'empresa');

  if new.status = 'em_revisao' and old.status is distinct from 'em_revisao' then
    for v_staff in
      select distinct ur.user_id, p.email as staff_email
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role in ('admin', 'commercial')
    loop
      insert into public.notifications (user_id, type, title, body, data, group_key)
      values (
        v_staff.user_id,
        'admin.supplier_pending',
        'Novo fornecedor aguardando aprovação',
        v_supplier_name || ' (' || v_company_name || ') enviou cadastro para revisão.',
        jsonb_build_object(
          'supplier_id', new.user_id,
          'route', '/admin/approvals'
        ),
        'admin-supplier-pending-' || new.user_id::text
      );

      if v_staff.staff_email is not null then
        perform public.invoke_send_email(jsonb_build_object(
          'to', v_staff.staff_email,
          'template', 'admin_supplier_pending',
          'locale', 'pt-BR',
          'user_id', v_staff.user_id,
          'idempotency_key', 'admin-supplier-pending-' || new.user_id::text || '-' || v_staff.user_id::text,
          'data', jsonb_build_object(
            'supplier_name', v_supplier_name,
            'company_name', v_company_name,
            'action_url', rtrim(v_app_url, '/') || '/admin/approvals'
          )
        ));
      end if;
    end loop;
  end if;

  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    insert into public.notifications (user_id, type, title, body, data, group_key)
    values (
      new.user_id,
      'supplier.approved',
      'Cadastro aprovado!',
      'Seu cadastro de fornecedor foi aprovado. Agora você já pode receber pedidos de compradores e enviar suas propostas pela XCOMERCE.',
      jsonb_build_object(
        'supplier_id', new.user_id,
        'route', '/supplier/board'
      ),
      'supplier-approved-' || new.user_id::text
    );

    if v_supplier_email is not null then
      perform public.invoke_send_email(jsonb_build_object(
        'to', v_supplier_email,
        'template', 'supplier_approved',
        'locale', 'pt-BR',
        'user_id', new.user_id,
        'idempotency_key', 'supplier-approved-' || new.user_id::text,
        'data', jsonb_build_object(
          'supplier_name', v_supplier_name,
          'action_url', rtrim(v_app_url, '/') || '/supplier/board'
        )
      ));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists supplier_profiles_after_status_change_trg on public.supplier_profiles;

create trigger supplier_profiles_after_status_change_trg
  after update of status on public.supplier_profiles
  for each row execute function public.supplier_profiles_after_status_change();

revoke all on function public.invoke_send_email(jsonb) from public;
revoke all on function public.supplier_profiles_after_status_change() from public;
