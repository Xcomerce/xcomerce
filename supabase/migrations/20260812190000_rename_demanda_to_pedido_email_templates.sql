-- Atualiza textos visíveis ao usuário nos templates de e-mail (demanda → pedido).

update public.email_templates
set
  name = 'Pedido compatível',
  subject = 'Nova oportunidade de pedido',
  html_body = '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Novo pedido compatível</h1><p>Olá {{supplier_name}},</p><p>Um novo pedido foi publicado: <strong>{{demand_title}}</strong> ({{demand_city}}).</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Ver no board</a></p></body></html>'
where key = 'demand_matched';

update public.email_templates
set
  subject = 'Nova proposta no seu pedido',
  html_body = '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Proposta recebida</h1><p>Olá {{buyer_name}},</p><p>Você recebeu <strong>{{offer_count}}</strong> proposta(s) no pedido "{{demand_title}}".</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Abrir</a></p></body></html>'
where key = 'offer_received';
