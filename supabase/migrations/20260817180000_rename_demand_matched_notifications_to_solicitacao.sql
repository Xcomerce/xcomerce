-- Notificações de match: demanda/pedido → solicitação (textos visíveis).

update public.email_templates
set
  name = 'Solicitação compatível',
  subject = 'Nova oportunidade de solicitação',
  html_body = '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5"><h1 style="font-size:20px">Nova solicitação compatível</h1><p>Olá {{supplier_name}},</p><p>Uma nova solicitação foi publicada: <strong>{{demand_title}}</strong> ({{demand_city}}).</p><p style="margin-top:24px"><a href="{{action_url}}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Ver no board</a></p></body></html>'
where key = 'demand_matched';
