import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as orders from '@/services/orders'
import type { OrderRole, OrderStatus } from '@/services/orders'

export const orderKeys = {
  all: ['orders'] as const,
  list: (userId: string, role: OrderRole) => [...orderKeys.all, 'list', userId, role] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  logs: (orderId: string) => [...orderKeys.all, 'logs', orderId] as const,
  sla: (orderId: string) => [...orderKeys.all, 'sla', orderId] as const,
}

export function useOrders(role: OrderRole = 'buyer') {
  const { user } = useAuth()
  return useQuery({
    queryKey: orderKeys.list(user?.id ?? '', role),
    queryFn: () => orders.fetchOrders(user!.id, role),
    enabled: !!user?.id,
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => orders.fetchOrder(id!),
    enabled: !!id,
  })
}

export function useOrderLogs(orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.logs(orderId ?? ''),
    queryFn: () => orders.fetchOrderLogs(orderId!),
    enabled: !!orderId,
  })
}

export function useOrderSlaDeadlines(orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.sla(orderId ?? ''),
    queryFn: () => orders.fetchSlaDeadlines(orderId!),
    enabled: !!orderId,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      id,
      status,
      cancelReason,
    }: {
      id: string
      status: OrderStatus
      cancelReason?: string
    }) => orders.updateOrderStatus(id, status, cancelReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.logs(data.id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: orderKeys.list(user.id, 'buyer') })
      }
    },
  })
}
