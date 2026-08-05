-- Fase 4: fluxo comprovante → confirmação do fornecedor

create or replace function public.is_valid_order_transition(
  p_from public.order_status,
  p_to public.order_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then true
    when p_from = 'PROPOSTA_ACEITA'
      and p_to in ('AGUARDANDO_CONFIRMACAO_EXTERNA', 'CANCELADO') then true
    when p_from = 'AGUARDANDO_CONFIRMACAO_EXTERNA'
      and p_to in ('COMPROVANTE_ENVIADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'COMPROVANTE_ENVIADO'
      and p_to in ('PAGAMENTO_CONFIRMADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'PAGAMENTO_CONFIRMADO'
      and p_to in ('ENVIO_INFORMADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'PAGAMENTO_INFORMADO'
      and p_to in ('COMPROVANTE_ENVIADO', 'PAGAMENTO_CONFIRMADO', 'ENVIO_INFORMADO', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'ENVIO_INFORMADO'
      and p_to in ('ENTREGUE', 'CANCELADO', 'EXPIRADO') then true
    when p_from = 'ENTREGUE'
      and p_to in ('CONCLUIDO', 'CANCELADO', 'EXPIRADO') then true
    else false
  end;
$$;

update public.orders
set status = 'COMPROVANTE_ENVIADO'
where status = 'PAGAMENTO_INFORMADO';

create or replace function public.orders_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_recipient uuid;
  v_route text;
  v_status_label text;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_logs (order_id, from_status, to_status, changed_by)
    values (new.id, 'PROPOSTA_ACEITA', new.status, v_actor);

    perform public.create_order_sla(
      new.id,
      'inform_payment',
      new.buyer_id
    );

    perform public.deliver_notification(
      new.supplier_id,
      'order.status_changed',
      'Novo pedido recebido',
      'O comprador aceitou sua proposta. Pedido #' || upper(left(new.id::text, 8)) || ' aguarda pagamento.',
      jsonb_build_object(
        'order_id', new.id,
        'route', '/supplier/orders/' || new.id::text
      ),
      'order-' || new.id::text,
      'order-created-' || new.id::text,
      jsonb_build_object(
        'order_id', upper(left(new.id::text, 8)),
        'new_status', 'Aguardando pagamento',
        'action_url', rtrim(v_app_url, '/') || '/supplier/orders/' || new.id::text
      )
    );
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_logs (order_id, from_status, to_status, changed_by, notes)
    values (
      new.id,
      old.status,
      new.status,
      v_actor,
      new.cancel_reason
    );

    update public.order_sla_deadlines
    set
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where order_id = new.id
      and status = 'pending';

    case new.status
      when 'COMPROVANTE_ENVIADO' then
        perform public.create_order_sla(new.id, 'confirm_payment', new.supplier_id);
      when 'PAGAMENTO_CONFIRMADO' then
        perform public.create_order_sla(new.id, 'inform_shipping', new.supplier_id);
      when 'ENVIO_INFORMADO' then
        perform public.create_order_sla(new.id, 'confirm_delivery', new.buyer_id);
      when 'ENTREGUE' then
        perform public.create_order_sla(new.id, 'confirm_completion', new.buyer_id);
      when 'CONCLUIDO' then
        update public.buyer_profiles
        set orders_completed = orders_completed + 1
        where user_id = new.buyer_id;

        update public.supplier_profiles
        set orders_completed = orders_completed + 1
        where user_id = new.supplier_id;

        insert into public.reputation_events (user_id, order_id, event_type)
        values
          (new.buyer_id, new.id, 'order_completed'),
          (new.supplier_id, new.id, 'order_completed');
      when 'CANCELADO' then
        update public.buyer_profiles
        set cancel_count = cancel_count + 1
        where user_id = new.buyer_id;

        update public.supplier_profiles
        set cancel_count = cancel_count + 1
        where user_id = new.supplier_id;

        insert into public.reputation_events (user_id, order_id, event_type, metadata)
        values
          (
            new.buyer_id,
            new.id,
            'order_canceled',
            jsonb_build_object('canceled_by', new.canceled_by)
          ),
          (
            new.supplier_id,
            new.id,
            'order_canceled',
            jsonb_build_object('canceled_by', new.canceled_by)
          );
      else
        null;
    end case;

    v_status_label := case new.status
      when 'AGUARDANDO_CONFIRMACAO_EXTERNA' then 'Aguardando pagamento'
      when 'COMPROVANTE_ENVIADO' then 'Comprovante enviado'
      when 'PAGAMENTO_CONFIRMADO' then 'Pagamento confirmado'
      when 'PAGAMENTO_INFORMADO' then 'Comprovante enviado'
      when 'ENVIO_INFORMADO' then 'Envio informado'
      when 'ENTREGUE' then 'Entregue'
      when 'CONCLUIDO' then 'Concluído'
      when 'CANCELADO' then 'Cancelado'
      when 'EXPIRADO' then 'Expirado'
      else new.status::text
    end;

    if v_actor is null or v_actor = new.buyer_id then
      v_recipient := new.supplier_id;
      v_route := '/supplier/orders/' || new.id::text;
    else
      v_recipient := new.buyer_id;
      v_route := '/buyer/orders/' || new.id::text;
    end if;

    if v_recipient is not null then
      perform public.deliver_notification(
        v_recipient,
        'order.status_changed',
        'Status do pedido atualizado',
        'Pedido #' || upper(left(new.id::text, 8)) || ' — ' || v_status_label,
        jsonb_build_object(
          'order_id', new.id,
          'from_status', old.status,
          'to_status', new.status,
          'route', v_route
        ),
        'order-status-' || new.id::text,
        'order-status-' || new.id::text || '-' || new.status::text,
        jsonb_build_object(
          'order_id', upper(left(new.id::text, 8)),
          'new_status', v_status_label,
          'action_url', rtrim(v_app_url, '/') || v_route
        )
      );
    end if;
  end if;

  return new;
end;
$$;
