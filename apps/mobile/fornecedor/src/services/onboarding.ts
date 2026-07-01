import { supabase } from '@/lib/supabase'
import { uploadFileFromUri, documentPath } from '@/lib/storage'
import { supplierAddressSchema } from '@keve/shared'
import type { z } from 'zod'
import type { Tables } from '@keve/shared'

export type SupplierAddressInput = z.infer<typeof supplierAddressSchema>

export type CompanyInput = {
  cnpj: string
  razao_social: string
  nome_fantasia?: string | null
  cidade: string
  uf: string
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
  situacao?: string | null
}

export type CnpjLookupResult = {
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  situacao: string
  endereco: {
    logradouro: string
    bairro: string
    cidade: string
    uf: string
    cep: string
  }
  cached: boolean
}

export type Company = Tables<'companies'>
export type SupplierProfile = Tables<'supplier_profiles'>
export type Document = Tables<'documents'>

export type OnboardingState = {
  company: Company | null
  profile: SupplierProfile | null
  documents: Document[]
  categoryIds: string[]
}

export type DocumentUploadInput = {
  uri: string
  fileName: string
  mimeType: string
}

export function companyToLookupResult(company: Company): CnpjLookupResult {
  return {
    cnpj: company.cnpj,
    razao_social: company.razao_social,
    nome_fantasia: company.nome_fantasia,
    situacao: company.situacao ?? 'ATIVA',
    endereco: {
      logradouro: company.logradouro ?? '',
      bairro: company.bairro ?? '',
      cidade: company.cidade,
      uf: company.uf,
      cep: company.cep ?? '',
    },
    cached: true,
  }
}

export function companyToInput(company: Company): CompanyInput {
  return {
    cnpj: company.cnpj,
    razao_social: company.razao_social,
    nome_fantasia: company.nome_fantasia,
    cidade: company.cidade,
    uf: company.uf,
    logradouro: company.logradouro,
    bairro: company.bairro,
    cep: company.cep,
    situacao: company.situacao,
  }
}

export function computeOnboardingStep(state: OnboardingState): number {
  if (!state.company || !state.profile?.company_id) return 1
  if (!state.profile.service_city?.trim() || !state.profile.service_uf?.trim()) return 2
  const docTypes = new Set(state.documents.map((doc) => doc.document_type))
  if (!docTypes.has('cnpj_card') || !docTypes.has('address_proof')) return 3
  if (state.categoryIds.length === 0) return 4
  return 5
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const { data: profile } = await supabase
    .from('supplier_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let company: Company | null = null
  if (profile?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .maybeSingle()
    company = (data as Company | null) ?? null
  }

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('supplier_id', userId)

  const { data: categories } = await supabase
    .from('supplier_categories')
    .select('category_id')
    .eq('supplier_id', userId)

  return {
    company,
    profile: (profile as SupplierProfile | null) ?? null,
    documents: (documents ?? []) as Document[],
    categoryIds: (categories ?? []).map((row) => row.category_id),
  }
}

export async function lookupOwnCompanyCnpj(
  userId: string,
  cnpj: string,
): Promise<CnpjLookupResult | null> {
  const digits = cnpj.replace(/\D/g, '')
  const state = await getOnboardingState(userId)
  if (!state.company || state.company.cnpj !== digits) return null
  return companyToLookupResult(state.company)
}

function parseFunctionError(data: unknown): void {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    data.error &&
    typeof data.error === 'object' &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    throw new Error(data.error.message)
  }
}

async function readFunctionErrorMessage(err: unknown): Promise<string | null> {
  if (!err || typeof err !== 'object' || !('context' in err)) return null
  const response = (err as { context?: unknown }).context
  if (!(response instanceof Response)) return null

  try {
    const body = await response.clone().json()
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'message' in body.error &&
      typeof body.error.message === 'string'
    ) {
      return body.error.message
    }
  } catch {
    return null
  }

  return null
}

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  const digits = cnpj.replace(/\D/g, '')
  const { data, error } = await supabase.functions.invoke('lookup-cnpj', {
    body: { cnpj: digits },
  })
  if (error) {
    const message = await readFunctionErrorMessage(error)
    throw new Error(message ?? 'Falha ao consultar CNPJ.')
  }
  parseFunctionError(data)
  return data as CnpjLookupResult
}

export async function saveCompany(userId: string, input: CompanyInput): Promise<Company> {
  const cnpj = input.cnpj.replace(/\D/g, '')

  const { data: existingSupplier } = await supabase
    .from('supplier_profiles')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle()

  let companyId = existingSupplier?.company_id ?? null

  if (companyId) {
    const { data, error } = await supabase
      .from('companies')
      .update({
        cnpj,
        razao_social: input.razao_social,
        nome_fantasia: input.nome_fantasia ?? null,
        cidade: input.cidade,
        uf: input.uf.toUpperCase(),
        logradouro: input.logradouro ?? null,
        numero: input.numero ?? null,
        bairro: input.bairro ?? null,
        cep: input.cep?.replace(/\D/g, '') ?? null,
        situacao: input.situacao ?? null,
      })
      .eq('id', companyId)
      .select()
      .single()

    if (error) throw error
    return data as Company
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      cnpj,
      razao_social: input.razao_social,
      nome_fantasia: input.nome_fantasia ?? null,
      cidade: input.cidade,
      uf: input.uf.toUpperCase(),
      logradouro: input.logradouro ?? null,
      numero: input.numero ?? null,
      bairro: input.bairro ?? null,
      cep: input.cep?.replace(/\D/g, '') ?? null,
      situacao: input.situacao ?? null,
    })
    .select()
    .single()

  if (companyError) throw companyError

  const { error: profileError } = await supabase.from('supplier_profiles').insert({
    user_id: userId,
    company_id: company.id,
    status: 'pendente',
  })

  if (profileError) throw profileError
  return company as Company
}

export async function saveSupplierProfile(
  userId: string,
  input: SupplierAddressInput,
): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .update({
      service_city: input.service_city,
      service_uf: input.service_uf.toUpperCase(),
      service_radius_km: input.service_radius_km,
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Complete o passo do CNPJ antes de salvar a área de atuação.')
    }
    throw error
  }
  return data as SupplierProfile
}

export async function uploadDocument(
  userId: string,
  file: DocumentUploadInput,
  documentType: Document['document_type'],
): Promise<Document> {
  const path = documentPath(userId, file.fileName)
  const storagePath = await uploadFileFromUri(
    'documents',
    path,
    file.uri,
    file.mimeType || 'application/octet-stream',
  )

  const { data, error } = await supabase
    .from('documents')
    .insert({
      supplier_id: userId,
      document_type: documentType,
      storage_path: storagePath,
      file_name: file.fileName,
      mime_type: file.mimeType || 'application/octet-stream',
    })
    .select()
    .single()

  if (error) throw error
  return data as Document
}

export async function saveCategories(userId: string, categoryIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('supplier_categories')
    .delete()
    .eq('supplier_id', userId)

  if (deleteError) throw deleteError
  if (categoryIds.length === 0) return

  const rows = categoryIds.map((category_id) => ({
    supplier_id: userId,
    category_id,
  }))

  const { error } = await supabase.from('supplier_categories').insert(rows)
  if (error) throw error
}

export async function submitForReview(userId: string): Promise<{
  profile: SupplierProfile
  alreadySubmitted: boolean
  alreadyApproved: boolean
}> {
  const { data: profile, error: fetchError } = await supabase
    .from('supplier_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!profile) {
    throw new Error('Complete o onboarding antes de enviar para revisão.')
  }

  if (profile.status === 'aprovado') {
    return {
      profile: profile as SupplierProfile,
      alreadySubmitted: false,
      alreadyApproved: true,
    }
  }

  if (profile.status === 'em_revisao') {
    return {
      profile: profile as SupplierProfile,
      alreadySubmitted: true,
      alreadyApproved: false,
    }
  }

  if (profile.status !== 'pendente' && profile.status !== 'recusado') {
    throw new Error('Não é possível enviar para revisão neste momento.')
  }

  const { data, error } = await supabase
    .from('supplier_profiles')
    .update({ status: 'em_revisao', rejection_reason: null })
    .eq('user_id', userId)
    .in('status', ['pendente', 'recusado'])
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('Não foi possível enviar para revisão. Atualize a página e tente novamente.')
  }

  return {
    profile: data as SupplierProfile,
    alreadySubmitted: false,
    alreadyApproved: false,
  }
}
