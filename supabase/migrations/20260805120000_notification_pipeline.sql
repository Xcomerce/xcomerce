-- Fase 3: pipeline unificado de notificações (in-app agrupado + e-mail + chat + pedidos)

create or replace function public.notification_email_template(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'demand.matched' then 'demand_matched'
    when 'offer.received' then 'offer_received'
    when 'chat.message' then 'chat_message'
    when 'order.status_changed' then 'order_status_changed'
    when 'sla.reminder' then 'sla_reminder'
    when 'sla.expired' then 'sla_expired'
    when 'supplier.approved' then 'supplier_approved'
    when 'supplier.rejected' then 'supplier_rejected'
    when 'admin.supplier_pending' then 'admin_supplier_pending'
    when 'subscription.activated' then 'subscription_activated'
    when 'subscription.past_due' then 'subscription_past_due'
    else null
  end;
$$;

create or replace function public.build_grouped_notification_body(p_original text, p_count integer)
returns text
language plpgsql
immutable
as $$
begin
  if p_original ~* '(\d+)\s+nova(s)?\s+proposta' then
    return regexp_replace(
      p_original,
      '(\d+)\s+nova(s)?\s+proposta',
      p_count::text || case when p_count > 1 then ' novas propostas' else ' nova proposta' end,
      'i'
    );
  end if;

  if p_original ~* 'recebeu\s+1\s+nova' then
    return regexp_replace(
      p_original,
      'recebeu\s+1\s+nova',
      'recebeu ' || p_count::text || case when p_count > 1 then ' novas' else ' nova' end,
      'i'
    );
  end if;

  return 'Você recebeu ' || p_count::text || ' novas notificações. ' || p_original;
end;
$$;

create or replace function public.deliver_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb,
  p_group_key text default null,
  p_idempotency_key text default null,
  p_email_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_grouped boolean := false;
  v_group_count integer := 1;
  v_new_body text;
  v_in_app_enabled boolean := true;
  v_email_enabled boolean := true;
  v_email_template text;
  v_user_email text;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  select coalesce(np.in_app_enabled, true), coalesce(np.email_enabled, true)
  into v_in_app_enabled, v_email_enabled
  from public.notification_preferences np
  where np.user_id = p_user_id
    and np.notification_type = p_type;

  if not found then
    v_in_app_enabled := true;
    v_email_enabled := true;
  end if;

  if v_in_app_enabled then
    if p_group_key is not null then
      select n.id, coalesce(n.group_count, 1)
      into v_notification_id, v_group_count
      from public.notifications n
      where n.user_id = p_user_id
        and n.group_key = p_group_key
        and n.read_at is null
      limit 1;

      if v_notification_id is not null then
        v_group_count := v_group_count + 1;
        v_new_body := public.build_grouped_notification_body(p_body, v_group_count);

        update public.notifications
        set
          body = v_new_body,
          group_count = v_group_count,
          data = p_data,
          type = p_type,
          title = p_title
        where id = v_notification_id;

        v_grouped := true;
      end if;
    end if;

    if v_notification_id is null then
      insert into public.notifications (user_id, type, title, body, data, group_key, group_count)
      values (p_user_id, p_type, p_title, p_body, p_data, p_group_key, 1)
      returning id into v_notification_id;
    end if;
  end if;

  if v_email_enabled and not v_grouped then
    v_email_template := public.notification_email_template(p_type);

    if v_email_template is not null then
      select p.email
      into v_user_email
      from public.profiles p
      where p.id = p_user_id;

      if v_user_email is not null then
        perform public.invoke_send_email(jsonb_build_object(
          'to', v_user_email,
          'template', v_email_template,
          'locale', 'pt-BR',
          'user_id', p_user_id,
          'idempotency_key', coalesce(
            p_idempotency_key,
            'email-' || p_type || '-' || p_user_id::text || '-' || coalesce(p_group_key, v_notification_id::text)
          ),
          'data', coalesce(p_email_data, '{}'::jsonb) || jsonb_build_object(
            'action_url', rtrim(v_app_url, '/') || coalesce(p_data->>'route', '')
          )
        ));
      end if;
    end if;
  end if;

  return v_notification_id;
end;
$$;

create or replace function public.offers_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_titulo text;
  v_buyer_name text;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  if tg_op = 'INSERT' then
    perform public.bump_usage_counter(new.supplier_id, 'offers_sent');

    update public.demand_matches
    set status = 'offer_sent'
    where demand_id = new.demand_id
      and supplier_id = new.supplier_id;

    update public.demands
    set status = 'OFERTAS_RECEBIDAS'
    where id = new.demand_id
      and status = 'PUBLICADA';

    select d.buyer_id, d.titulo
    into v_buyer_id, v_titulo
    from public.demands d
    where d.id = new.demand_id;

    select coalesce(nullif(btrim(p.full_name), ''), 'Comprador')
    into v_buyer_name
    from public.profiles p
    where p.id = v_buyer_id;

    perform public.deliver_notification(
      v_buyer_id,
      'offer.received',
      'Nova proposta recebida',
      'Você recebeu 1 nova proposta para: ' || v_titulo,
      jsonb_build_object(
        'demand_id', new.demand_id,
        'offer_id', new.id,
        'route', '/buyer/dashboard'
      ),
      'demand-' || new.demand_id::text,
      'offer-received-' || new.id::text,
      jsonb_build_object(
        'buyer_name', v_buyer_name,
        'demand_title', v_titulo,
        'offer_count', 1,
        'action_url', rtrim(v_app_url, '/') || '/buyer/dashboard'
      )
    );
  end if;

  if tg_op = 'UPDATE' and new.status = 'aceita' and old.status is distinct from 'aceita' then
    update public.offers
    set status = 'rejeitada'
    where demand_id = new.demand_id
      and id <> new.id
      and status = 'enviada';

    update public.demands
    set status = 'PROPOSTA_ACEITA'
    where id = new.demand_id;
  end if;

  if tg_op = 'UPDATE'
     and new.contact_revealed = true
     and old.contact_revealed = false then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      (select auth.uid()),
      'offer.contact_revealed',
      'offers',
      new.id,
      jsonb_build_object(
        'demand_id', new.demand_id,
        'supplier_id', new.supplier_id
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.offer_messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demand_title text;
  v_sender_name text;
  v_recipient_role text;
  v_route text;
  v_preview text;
  v_app_url text := coalesce(nullif(current_setting('app.settings.app_url', true), ''), 'https://xcomerce.com.br');
begin
  if new.sender_id = new.recipient_id then
    return new;
  end if;

  select d.titulo
  into v_demand_title
  from public.demands d
  where d.id = new.demand_id;

  select coalesce(nullif(btrim(p.full_name), ''), 'Usuário')
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  v_preview := left(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), 120);
  if v_preview = '' then
    v_preview := '(anexo)';
  end if;

  if exists (
    select 1
    from public.demands d
    where d.id = new.demand_id
      and d.buyer_id = new.recipient_id
  ) then
    v_recipient_role := 'buyer';
    v_route := case
      when new.offer_id is not null then '/buyer/offers/' || new.offer_id::text
      else '/buyer/dashboard'
    end;
  else
    v_recipient_role := 'supplier';
    v_route := case
      when new.offer_id is not null then '/supplier/offers/' || new.demand_id::text
      else '/supplier/board'
    end;
  end if;

  perform public.deliver_notification(
    new.recipient_id,
    'chat.message',
    'Nova mensagem',
    v_sender_name || ' enviou uma mensagem sobre "' || coalesce(v_demand_title, 'negociação') || '"',
    jsonb_build_object(
      'demand_id', new.demand_id,
      'supplier_id', new.supplier_id,
      'offer_id', new.offer_id,
      'message_id', new.id,
      'route', v_route
    ),
    'chat-' || new.demand_id::text || '-' || new.supplier_id::text,
    'chat-message-' || new.id::text,
    jsonb_build_object(
      'sender_name', v_sender_name,
      'demand_title', coalesce(v_demand_title, 'Negociação'),
      'preview', v_preview,
      'action_url', rtrim(v_app_url, '/') || v_route
    )
  );

  return new;
end;
$$;

drop trigger if exists offer_messages_after_insert_trg on public.offer_messages;

create trigger offer_messages_after_insert_trg
  after insert on public.offer_messages
  for each row execute function public.offer_messages_after_insert();

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
      'O comprador aceitou sua proposta. Pedido #' || upper(left(new.id::text, 8)) || ' aguarda confirmação.',
      jsonb_build_object(
        'order_id', new.id,
        'route', '/supplier/orders/' || new.id::text
      ),
      'order-' || new.id::text,
      'order-created-' || new.id::text,
      jsonb_build_object(
        'order_id', upper(left(new.id::text, 8)),
        'new_status', 'Aguardando confirmação',
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
      when 'PAGAMENTO_INFORMADO' then
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
      when 'AGUARDANDO_CONFIRMACAO_EXTERNA' then 'Aguardando confirmação'
      when 'PAGAMENTO_INFORMADO' then 'Pagamento informado'
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

revoke all on function public.notification_email_template(text) from public;
revoke all on function public.build_grouped_notification_body(text, integer) from public;
revoke all on function public.deliver_notification(uuid, text, text, text, jsonb, text, text, jsonb) from public;
