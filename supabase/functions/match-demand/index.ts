import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { checkIdempotency, markIdempotency } from '../_shared/idempotency.ts'
import { validateServiceRole } from '../_shared/auth.ts'
import { invokeSendNotification } from '../_shared/internal.ts'

interface MatchDemandBody {
  demand_id: string
  idempotency_key?: string
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
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
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
  demand: {
    cidade: string
    uf: string
    raio_km: number
    latitude: number | null
    longitude: number | null
  },
  supplier: SupplierRow,
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
  return score
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  if (!validateServiceRole(req)) {
    return error('FORBIDDEN', 'Acesso restrito a chamadas internas.', 403)
  }

  const started = Date.now()
  let body: MatchDemandBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const { demand_id, idempotency_key } = body
  if (!demand_id) {
    return error('INVALID_PAYLOAD', 'demand_id é obrigatório.', 400)
  }

  const supabase = createServiceClient()
  const idemKey = idempotency_key ?? `demand-${demand_id}-publish`

  const existing = await checkIdempotency(supabase, idemKey)
  if (existing?.response) {
    return json(existing.response, 200)
  }
  if (existing) {
    return error('ALREADY_PROCESSED', 'Match já em processamento.', 409)
  }

  const { data: demand, error: demandErr } = await supabase
    .from('demands')
    .select('id, titulo, cidade, uf, raio_km, latitude, longitude, category_id, status')
    .eq('id', demand_id)
    .maybeSingle()

  if (demandErr || !demand) {
    return error('DEMAND_NOT_FOUND', 'Demanda não encontrada.', 404)
  }

  if (demand.status !== 'PUBLICADA') {
    return error('DEMAND_NOT_PUBLISHED', 'Demanda precisa estar PUBLICADA.', 422)
  }

  const skipped = { already_matched: 0, not_approved: 0, out_of_region: 0 }

  const { data: suppliers } = await supabase
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

  const { data: existingMatches } = await supabase
    .from('demand_matches')
    .select('supplier_id')
    .eq('demand_id', demand_id)

  const alreadyMatched = new Set((existingMatches ?? []).map((m) => m.supplier_id))

  const supplierIds = (suppliers ?? []).map((s) => s.user_id)

  const emptyUuid = '00000000-0000-0000-0000-000000000000'
  const idFilter = supplierIds.length ? supplierIds : [emptyUuid]

  const [{ data: categoryLinks }, { data: products }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('supplier_categories')
      .select('supplier_id')
      .eq('category_id', demand.category_id)
      .in('supplier_id', idFilter),
    supabase
      .from('products')
      .select('supplier_id')
      .eq('category_id', demand.category_id)
      .eq('is_active', true)
      .in('supplier_id', idFilter),
    supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .in('user_id', idFilter)
      .eq('status', 'active'),
  ])

  const categorySet = new Set((categoryLinks ?? []).map((c) => c.supplier_id))
  const productSet = new Set((products ?? []).map((p) => p.supplier_id))

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
    if (!hasCategoryProduct && !hasSupplierCategory) continue

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
    }

    const geo = geoEligible(demand, supplier)
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
      score: computeScore(supplier, geo, demand.raio_km),
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
      demand_id,
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

    const notifRes = await invokeSendNotification({
      user_id: supplier.user_id,
      type: 'demand.matched',
      title: 'Nova oportunidade de demanda',
      body: `Demanda compatível: "${demand.titulo}" em ${demand.cidade}/${demand.uf}.`,
      data: {
        demand_id,
        route: `/supplier/board`,
      },
      channels: ['in_app', 'email'],
      idempotency_key: `notif-demand-matched-${demand_id}-${supplier.user_id}`,
      email_data: {
        supplier_name: supplier.full_name,
        demand_title: demand.titulo,
        demand_city: demand.cidade,
        action_url: `${appUrl}/supplier/board`,
      },
    })

    if (notifRes.ok) suppliersNotified++
  }

  await supabase
    .from('demands')
    .update({ match_processed_at: new Date().toISOString() })
    .eq('id', demand_id)

  const result = {
    demand_id,
    matches_created: matchesCreated,
    suppliers_notified: suppliersNotified,
    skipped,
    processing_ms: Date.now() - started,
  }

  await markIdempotency(supabase, idemKey, 'match-demand', result, 168)

  return json(result)
})
