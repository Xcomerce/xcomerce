import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as crm from '@/services/crm'
import type { LeadFilters } from '@/services/crm'

export const crmKeys = {
  all: ['crm'] as const,
  leads: (filters?: LeadFilters) => [...crmKeys.all, 'leads', filters ?? {}] as const,
  lead: (id: string) => [...crmKeys.all, 'lead', id] as const,
  metrics: () => [...crmKeys.all, 'metrics'] as const,
  templates: () => [...crmKeys.all, 'templates'] as const,
  providers: () => [...crmKeys.all, 'providers'] as const,
}

export function useLeadMetrics() {
  return useQuery({
    queryKey: crmKeys.metrics(),
    queryFn: crm.fetchLeadMetrics,
  })
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: crmKeys.leads(filters),
    queryFn: () => crm.fetchLeads(filters),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: crmKeys.lead(id),
    queryFn: () => crm.fetchLead(id),
    enabled: Boolean(id),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Parameters<typeof crm.updateLead>[1]
    }) => crm.updateLead(id, patch),
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
      qc.setQueryData(crmKeys.lead(lead.id), lead)
    },
  })
}

export function useSendLeadInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) => crm.sendLeadInvite(leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: crmKeys.templates(),
    queryFn: crm.fetchEmailTemplates,
  })
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Parameters<typeof crm.updateEmailTemplate>[1]
    }) => crm.updateEmailTemplate(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.templates() }),
  })
}

export function useSendTemplateTest() {
  return useMutation({
    mutationFn: ({ key, to }: { key: string; to: string }) => crm.sendTemplateTest(key, to),
  })
}

export function useEmailProviders() {
  return useQuery({
    queryKey: crmKeys.providers(),
    queryFn: crm.fetchEmailProviders,
  })
}

export function useSetDefaultProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => crm.setDefaultEmailProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.providers() }),
  })
}

export function useSetProviderEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      crm.setEmailProviderEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.providers() }),
  })
}
