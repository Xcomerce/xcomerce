-- Novos status de pedido (commit separado antes de usar os valores).

alter type public.order_status add value if not exists 'COMPROVANTE_ENVIADO';
alter type public.order_status add value if not exists 'PAGAMENTO_CONFIRMADO';

alter type public.sla_action add value if not exists 'confirm_payment';
