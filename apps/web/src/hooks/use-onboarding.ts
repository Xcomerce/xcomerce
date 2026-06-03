import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as onboarding from '@/services/onboarding'
import type {
  CompanyInput,
  SupplierAddressInput,
} from '@/services/onboarding'

export function useLookupCnpj() {
  return useMutation({
    mutationFn: (cnpj: string) => onboarding.lookupCnpj(cnpj),
  })
}

export function useSaveCompany() {
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (input: CompanyInput) => onboarding.saveCompany(user!.id, input),
    onSuccess: () => refreshProfile(),
  })
}

export function useSaveSupplierProfile() {
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (input: SupplierAddressInput) => onboarding.saveSupplierProfile(user!.id, input),
    onSuccess: () => refreshProfile(),
  })
}

export function useUploadDocument() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      file,
      documentType,
    }: {
      file: File
      documentType: onboarding.Document['document_type']
    }) => onboarding.uploadDocument(user!.id, file, documentType),
  })
}

export function useSaveSupplierCategories() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: (categoryIds: string[]) => onboarding.saveCategories(user!.id, categoryIds),
  })
}

export function useSubmitForReview() {
  const queryClient = useQueryClient()
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: () => onboarding.submitForReview(user!.id),
    onSuccess: () => {
      refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
