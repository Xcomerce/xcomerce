import { supabase } from '@/lib/supabase'
import { uploadFile, documentPath } from '@/lib/storage'
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

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  const digits = cnpj.replace(/\D/g, '')
  const { data, error } = await supabase.functions.invoke('lookup-cnpj', {
    body: { cnpj: digits },
  })
  if (error) throw error
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

  const { error: profileError } = await supabase.from('supplier_profiles').upsert(
    {
      user_id: userId,
      company_id: company.id,
      status: 'pendente',
    },
    { onConflict: 'user_id' },
  )

  if (profileError) throw profileError
  return company as Company
}

export async function saveSupplierProfile(
  userId: string,
  input: SupplierAddressInput,
): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .upsert(
      {
        user_id: userId,
        service_city: input.service_city,
        service_uf: input.service_uf.toUpperCase(),
        service_radius_km: input.service_radius_km,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as SupplierProfile
}

export async function uploadDocument(
  userId: string,
  file: File,
  documentType: Document['document_type'],
): Promise<Document> {
  const path = documentPath(userId, file.name)
  const storagePath = await uploadFile('documents', path, file)

  const { data, error } = await supabase
    .from('documents')
    .insert({
      supplier_id: userId,
      document_type: documentType,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
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

export async function submitForReview(userId: string): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .update({ status: 'em_revisao', rejection_reason: null })
    .eq('user_id', userId)
    .in('status', ['pendente', 'recusado'])
    .select()
    .single()

  if (error) throw error
  return data as SupplierProfile
}
