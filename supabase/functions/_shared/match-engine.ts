import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { invokeSendNotification } from './internal.ts'
import {
  demandHasVariantSpecs,
  productMatchesDemandVariants,
} from './variants.ts'

export type DemandRow = {
  id: string
  titulo: string
  cidade: string
  uf: string
  raio_km: number
  latitude: number | null
  longitude: number | null
  category_id: string
  status: string
  cor: string | null
  tamanho: string | null
}

type SupplierRow = {
  user_id: string
  service_city: string | null
  service_uf: string | null
  service_radius_km: number
  latitude: number | null
  longitude: number | null
  avg_rating: number
  created_at: string
  full_name: string
  is_gold: boolean
  has_category_product: boolean
  has_supplier_category: boolean
  has_variant_match: boolean
}

type ProductRow = {
  supplier_id: string
  tem_cor: boolean
  tem_tamanho: boolean
  cores: string[]
  tamanhos: string[]
}

export type MatchResult = {
  demand_id: string
  matches_created: number
  suppliers_notified: number
  skipped: {
    already_matched: number
    not_approved: number
    out_of_region: number
    variant_mismatch: number
  }
}

const OPEN_DEMAND_STATUSES = ['PUBLICADA', 'OFERTAS_RECEBIDAS', 'EM_NEGOCIACAO']

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function geoEligible(
  demand: Pick<DemandRow, 'cidade' | 'uf' | 'raio_km' | 'latitude' | 'longitude'>,
  supplier: Pick<
    SupplierRow,
    'service_city' | 'service_uf' | 'service_radius_km' | 'latitude' | 'longitude'
  >,
): { eligible: boolean; sameCity: boolean; distanceKm: number | null } {
  const sameCity =
    demand.cidade.toLowerCase() === (supplier.service_city ?? '').toLowerCase() &&
    demand.uf.toUpperCase() === (supplier.service_uf ?? '').toUpperCase()

  if (sameCity) {
    return { eligible: true, sameCity: true, distanceKm: 0 }
  }

  if (
    demand.latitude != null &&
    demand.longitude != null &&
    supplier.latitude != null &&
    supplier.longitude != null
  ) {
    const distanceKm = haversineKm(
      Number(demand.latitude),
      Number(demand.longitude),
      Number(supplier.latitude),
      Number(supplier.longitude),
    )
    const maxRadius = Math.min(demand.raio_km, supplier.service_radius_km)
    return { eligible: distanceKm <= maxRadius, sameCity: false, distanceKm }
  }

  return { eligible: false, sameCity: false, distanceKm: null }
}

function computeScore(
  supplier: SupplierRow,
  geo: { sameCity: boolean; distanceKm: number | null },
  demandRaioKm: number,
  demand: Pick<DemandRow, 'cor' | 'tamanho'>,
): number {
  let score = 0
  if (supplier.has_category_product) score += 40
  else if (supplier.has_supplier_category) score += 20
  if (geo.sameCity) score += 30
  else if (geo.distanceKm != null && demandRaioKm > 0) {
    const ratio = 1 - Math.min(geo.distanceKm / demandRaioKm, 1)
    score += Math.round(10 + ratio * 15)
  }
  if (supplier.is_gold) score += 15
  if (Number(supplier.avg_rating) >= 4) score += 5
  if (supplier.has_variant_match && demandHasVariantSpecs(demand)) score += 10
  return score
}

function supplierHasCompatibleProduct(
  supplierId: string,
  products: ProductRow[],
  demand: Pick<DemandRow, 'cor' | 'tamanho'>,
): boolean {
  return products.some(
    (product) =>
      product.supplier_id === supplierId &&
      productMatchesDemandVariants(
        {
          tem_cor: product.tem_cor,
          tem_tamanho: product.tem_tamanho,
          cores: product.cores ?? [],
          tamanhos: product.tamanhos ?? [],
        },
        demand,
      ),
  )
}

function formatDemandNotificationBody(demand: DemandRow): string {
  const parts: string[] = [`"${demand.titulo}" em ${demand.cidade}/${demand.uf}`]
  const specs: string[] = []
  if (demand.cor?.trim()) specs.push(`cor ${demand.cor.trim()}`)
  if (demand.tamanho?.trim()) specs.push(`tamanho ${demand.tamanho.trim()}`)
  if (specs.length > 0) parts.push(`(${specs.join(', ')})`)
  return `Demanda compatível: ${parts.join(' ')}.`
}

export async function runDemandMatch(
  supabase: SupabaseClient,
  demandId: string,
  options: { onlySupplierId?: string } = {},
): Promise<MatchResult> {
  const skipped = {
    already_matched: 0,
    not_approved: 0,
    out_of_region: 0,
    variant_mismatch: 0,
  }

  const { data: demand, error: demandErr } = await supabase
    .from('demands')
    .select(
      'id, titulo, cidade, uf, raio_km, latitude, longitude, category_id, status, cor, tamanho',
    )
    .eq('id', demandId)
    .maybeSingle()

  if (demandErr || !demand) {
    throw new Error('DEMAND_NOT_FOUND')
  }

  const demandRow = demand as DemandRow

  if (!OPEN_DEMAND_STATUSES.includes(demandRow.status)) {
    throw new Error('DEMAND_NOT_OPEN')
  }

  const requiresVariantMatch = demandHasVariantSpecs(demandRow)

  let suppliersQuery = supabase
    .from('supplier_profiles')
    .select(`
      user_id,
      service_city,
      service_uf,
      service_radius_km,
      latitude,
      longitude,
      avg_rating,
      created_at,
      profiles!inner(full_name)
    `)
    .eq('status', 'aprovado')

  if (options.onlySupplierId) {
    suppliersQuery = suppliersQuery.eq('user_id', options.onlySupplierId)
  }

  const { data: suppliers } = await suppliersQuery

  const { data: existingMatches } = await supabase
    .from('demand_matches')
    .select('supplier_id')
    .eq('demand_id', demandId)

  const alreadyMatched = new Set((existingMatches ?? []).map((m) => m.supplier_id))
  const supplierIds = (suppliers ?? []).map((s) => s.user_id)
  const emptyUuid = '00000000-0000-0000-0000-000000000000'
  const idFilter = supplierIds.length ? supplierIds : [emptyUuid]

  const [{ data: categoryLinks }, { data: products }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('supplier_categories')
      .select('supplier_id')
      .eq('category_id', demandRow.category_id)
      .in('supplier_id', idFilter),
    supabase
      .from('products')
      .select('supplier_id, tem_cor, tem_tamanho, cores, tamanhos')
      .eq('category_id', demandRow.category_id)
      .eq('is_active', true)
      .in('supplier_id', idFilter),
    supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .in('user_id', idFilter)
      .eq('status', 'active'),
  ])

  const categorySet = new Set((categoryLinks ?? []).map((c) => c.supplier_id))
  const productRows = (products ?? []) as ProductRow[]
  const productSet = new Set(productRows.map((p) => p.supplier_id))

  const planIds = [...new Set((subscriptions ?? []).map((s) => s.plan_id))]
  const { data: plans } = planIds.length
    ? await supabase.from('plans').select('id, code, match_priority').in('id', planIds)
    : { data: [] as { id: string; code: string; match_priority: boolean }[] }

  const goldPlanIds = new Set(
    (plans ?? [])
      .filter((p) => p.match_priority === true || p.code === 'gold')
      .map((p) => p.id),
  )
  const goldSet = new Set(
    (subscriptions ?? []).filter((s) => goldPlanIds.has(s.plan_id)).map((s) => s.user_id),
  )

  const candidates: { supplier: SupplierRow; score: number }[] = []

  for (const row of suppliers ?? []) {
    const hasCategoryProduct = productSet.has(row.user_id)
    const hasSupplierCategory = categorySet.has(row.user_id)

    if (requiresVariantMatch) {
      if (!supplierHasCompatibleProduct(row.user_id, productRows, demandRow)) {
        if (hasCategoryProduct || hasSupplierCategory) skipped.variant_mismatch++
        continue
      }
    } else if (!hasCategoryProduct && !hasSupplierCategory) {
      continue
    }

    const hasVariantMatch = supplierHasCompatibleProduct(row.user_id, productRows, demandRow)

    const supplier: SupplierRow = {
      user_id: row.user_id,
      service_city: row.service_city,
      service_uf: row.service_uf,
      service_radius_km: row.service_radius_km,
      latitude: row.latitude,
      longitude: row.longitude,
      avg_rating: row.avg_rating,
      created_at: row.created_at,
      full_name: (row.profiles as { full_name: string })?.full_name ?? 'Fornecedor',
      is_gold: goldSet.has(row.user_id),
      has_category_product: hasCategoryProduct,
      has_supplier_category: hasSupplierCategory,
      has_variant_match: hasVariantMatch,
    }

    const geo = geoEligible(demandRow, supplier)
    if (!geo.eligible) {
      skipped.out_of_region++
      continue
    }

    if (alreadyMatched.has(row.user_id)) {
      skipped.already_matched++
      continue
    }

    candidates.push({
      supplier,
      score: computeScore(supplier, geo, demandRow.raio_km, demandRow),
    })
  }

  candidates.sort((a, b) => {
    if (a.supplier.is_gold !== b.supplier.is_gold) return a.supplier.is_gold ? -1 : 1
    if (b.score !== a.score) return b.score - a.score
    if (b.supplier.avg_rating !== a.supplier.avg_rating) {
      return Number(b.supplier.avg_rating) - Number(a.supplier.avg_rating)
    }
    return new Date(a.supplier.created_at).getTime() - new Date(b.supplier.created_at).getTime()
  })

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.keve.com.br'
  let matchesCreated = 0
  let suppliersNotified = 0

  for (const { supplier, score } of candidates) {
    const { error: insertErr } = await supabase.from('demand_matches').insert({
      demand_id: demandId,
      supplier_id: supplier.user_id,
      score,
      status: 'notified',
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        skipped.already_matched++
        continue
      }
      console.error('demand_matches insert:', insertErr)
      continue
    }

    matchesCreated++

    const { data: autoOfferResult, error: autoOfferErr } = await supabase.rpc(
      'try_create_auto_offer',
      {
        p_demand_id: demandId,
        p_supplier_id: supplier.user_id,
      },
    )

    if (autoOfferErr) {
      console.error('try_create_auto_offer:', autoOfferErr)
    } else if (autoOfferResult?.status === 'sent') {
      console.info('auto_offer_sent', {
        demand_id: demandId,
        supplier_id: supplier.user_id,
        offer_id: autoOfferResult.offer_id,
      })
    }

    const notifRes = await invokeSendNotification({
      user_id: supplier.user_id,
      type: 'demand.matched',
      title: 'Nova oportunidade de demanda',
      body: formatDemandNotificationBody(demandRow),
      data: {
        demand_id: demandId,
        route: `/supplier/board`,
      },
      channels: ['in_app', 'email'],
      idempotency_key: `notif-demand-matched-${demandId}-${supplier.user_id}`,
      email_data: {
        supplier_name: supplier.full_name,
        demand_title: demandRow.titulo,
        demand_city: demandRow.cidade,
        action_url: `${appUrl}/supplier/board`,
      },
    })

    if (notifRes.ok) suppliersNotified++
  }

  await supabase
    .from('demands')
    .update({ match_processed_at: new Date().toISOString() })
    .eq('id', demandId)

  return {
    demand_id: demandId,
    matches_created: matchesCreated,
    suppliers_notified: suppliersNotified,
    skipped,
  }
}

export async function runSupplierCatalogMatch(
  supabase: SupabaseClient,
  supplierId: string,
): Promise<{ demands_checked: number; matches_created: number; suppliers_notified: number }> {
  const { data: products } = await supabase
    .from('products')
    .select('category_id')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)

  const categoryIds = [...new Set((products ?? []).map((p) => p.category_id))]
  if (categoryIds.length === 0) {
    return { demands_checked: 0, matches_created: 0, suppliers_notified: 0 }
  }

  const { data: demands } = await supabase
    .from('demands')
    .select('id')
    .in('category_id', categoryIds)
    .in('status', OPEN_DEMAND_STATUSES)

  let matchesCreated = 0
  let suppliersNotified = 0

  for (const demand of demands ?? []) {
    try {
      const result = await runDemandMatch(supabase, demand.id, { onlySupplierId: supplierId })
      matchesCreated += result.matches_created
      suppliersNotified += result.suppliers_notified
    } catch (err) {
      console.error('runSupplierCatalogMatch demand', demand.id, err)
    }
  }

  return {
    demands_checked: demands?.length ?? 0,
    matches_created: matchesCreated,
    suppliers_notified: suppliersNotified,
  }
}
