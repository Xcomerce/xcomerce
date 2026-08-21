#!/usr/bin/env node
/**
 * Seed 100k produtos LOADTEST + benchmark de busca multi-token
 *
 * Uso:
 *   node scripts/run-search-load-test.mjs --linked --seed
 *   node scripts/run-search-load-test.mjs --linked --test
 *   node scripts/run-search-load-test.mjs --linked --seed --test
 *   node scripts/run-search-load-test.mjs --linked --cleanup
 */

import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const args = process.argv.slice(2)
const useLinked = args.includes('--linked')
const doSeed = args.includes('--seed')
const doTest = args.includes('--test')
const doCleanup = args.includes('--cleanup')
const flag = useLinked ? '--linked' : '--local'
const envLabel = useLinked ? 'Supabase linked (remoto)' : 'Supabase local'

const precisionScenarios = [
  {
    id: 1,
    label: 'Nome + cor (AND)',
    query: 'camiseta preta',
    expectMin: 1,
    expectTopSku: null,
  },
  {
    id: 2,
    label: '4 tokens — produto exato top 1',
    query: 'camiseta preta 42 algodao',
    expectMin: 1,
    expectTopSku: 'LOADTEST-000001',
  },
  {
    id: 3,
    label: 'Nome + cor + tamanho numérico',
    query: 'camiseta preta 42',
    expectMin: 1,
    expectSkuInResults: 'LOADTEST-000001',
  },
  {
    id: 4,
    label: 'Nome + cor + tamanho M (1 char)',
    query: 'camiseta preto m',
    expectMin: 1,
    expectAnySkuInResults: ['LOADTEST-000001', 'LOADTEST-000002'],
  },
  {
    id: 5,
    label: 'Token inexistente (zero resultados)',
    query: 'camiseta preta 42 algodao xyz_inexistente_123',
    expectMax: 0,
  },
  {
    id: 6,
    label: 'Typo fuzzy + cor',
    query: 'camisrta preta',
    expectMin: 1,
  },
  {
    id: 7,
    label: '4+ tokens variados',
    query: 'loadtest camiseta premium preto',
    expectMin: 1,
  },
]

const latencyQueries = [
  { label: '1 token', query: 'camiseta' },
  { label: '2 tokens', query: 'camiseta preta' },
  { label: '4 tokens', query: 'camiseta preta 42 algodao' },
]

function parseCliJson(output) {
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(output.slice(start, end + 1))
  } catch {
    return null
  }
}

function runSql(sql, label) {
  const dir = mkdtempSync(join(tmpdir(), 'search-load-'))
  const file = join(dir, 'query.sql')
  writeFileSync(file, sql, 'utf8')
  const started = Date.now()
  try {
    const output = execSync(`npx supabase db query ${flag} -f "${file}"`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    rmSync(dir, { recursive: true, force: true })
    return { ok: true, output, json: parseCliJson(output), ms: Date.now() - started, label }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    return {
      ok: false,
      output: error.stdout?.toString() ?? '',
      json: parseCliJson(error.stdout?.toString() ?? ''),
      error: error.stderr?.toString() ?? error.message,
      ms: Date.now() - started,
      label,
    }
  }
}

function runSqlFile(relativePath, label) {
  const started = Date.now()
  try {
    const output = execSync(`npx supabase db query ${flag} -f "${relativePath}"`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { ok: true, output, ms: Date.now() - started, label }
  } catch (error) {
    return {
      ok: false,
      output: error.stdout?.toString() ?? '',
      error: error.stderr?.toString() ?? error.message,
      ms: Date.now() - started,
      label,
    }
  }
}

function escapeSql(value) {
  return value.replace(/'/g, "''")
}

function countLoadTestProducts() {
  const result = runSql(
    `select count(*)::int as total from public.products where sku like 'LOADTEST-%';`,
    'count-loadtest',
  )
  return result.json?.rows?.[0]?.total ?? null
}

function runSearchScenario(scenario) {
  const safeQuery = escapeSql(scenario.query)
  const countSql = `
select count(*)::int as total
from public.search_feed_products('${safeQuery}', null, null, 50, 0);
`
  const countResult = runSql(countSql, scenario.label)
  const total = countResult.json?.rows?.[0]?.total ?? null

  let topSku = null
  let skus = []

  if (total > 0) {
    const topSql = `
select coalesce(json_agg(sku order by rank desc), '[]'::json) as skus
from (
  select sku, rank
  from public.search_feed_products('${safeQuery}', null, null, 10, 0)
) s;
`
    const topResult = runSql(topSql, `${scenario.label}-top`)
    const rawSkus = topResult.json?.rows?.[0]?.skus
    if (Array.isArray(rawSkus)) {
      skus = rawSkus
      topSku = rawSkus[0] ?? null
    }
  }

  return { ...countResult, total, topSku, skus }
}

function evaluateScenario(scenario, result) {
  if (!result.ok) {
    return { pass: false, reason: (result.error ?? 'Erro SQL').split('\n')[0] }
  }
  if (scenario.expectMax === 0 && result.total !== 0) {
    return { pass: false, reason: `Esperado 0, obteve ${result.total}` }
  }
  if (scenario.expectMin != null && (result.total ?? 0) < scenario.expectMin) {
    return { pass: false, reason: `Esperado >=${scenario.expectMin}, obteve ${result.total}` }
  }
  if (scenario.expectTopSku && result.topSku !== scenario.expectTopSku) {
    return {
      pass: false,
      reason: `Top1 esperado ${scenario.expectTopSku}, obteve ${result.topSku ?? '(null)'}`,
    }
  }
  if (scenario.expectSkuInResults && !result.skus.includes(scenario.expectSkuInResults)) {
    return {
      pass: false,
      reason: `Esperado SKU ${scenario.expectSkuInResults} nos resultados`,
    }
  }
  if (
    scenario.expectAnySkuInResults &&
    !scenario.expectAnySkuInResults.some((sku) => result.skus.includes(sku))
  ) {
    return {
      pass: false,
      reason: `Esperado um de [${scenario.expectAnySkuInResults.join(', ')}] nos resultados`,
    }
  }
  return { pass: true, reason: 'OK' }
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

function measureLatency(query) {
  const samples = []
  for (let i = 0; i < 5; i += 1) {
    const safeQuery = escapeSql(query)
    const result = runSql(
      `select count(*)::int as total from public.search_feed_products('${safeQuery}', null, null, 50, 0);`,
      `latency-${query}`,
    )
    if (result.ok) samples.push(result.ms)
  }
  return {
    query,
    samples,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
  }
}

function printUsage() {
  console.log(`Uso: node scripts/run-search-load-test.mjs [opções]

Opções:
  --linked     Usa Supabase linkado (remoto)
  --local      Usa Supabase local (padrão)
  --seed       Insere 100k produtos LOADTEST
  --test       Executa benchmark + testes SQL
  --cleanup    Remove produtos LOADTEST
  --seed --test  Seed + benchmark completo`)
}

if (!doSeed && !doTest && !doCleanup) {
  printUsage()
  process.exit(1)
}

console.log(`Search load test (${envLabel})`)

const report = {
  env: envLabel,
  startedAt: new Date().toISOString(),
  seed: null,
  cleanup: null,
  loadCount: null,
  precision: [],
  latency: [],
  integration: null,
}

if (doCleanup) {
  console.log('Removendo produtos LOADTEST...')
  report.cleanup = runSql('select public.cleanup_search_load_test_products() as deleted;', 'cleanup')
  report.loadCount = countLoadTestProducts()
  console.log(`Cleanup: ${report.cleanup.ok ? 'OK' : 'FALHOU'} (${report.cleanup.ms} ms)`)
  if (!doSeed && !doTest) {
    process.exit(report.cleanup.ok ? 0 : 1)
  }
}

if (doSeed) {
  console.log('Executando seed 100k (pode levar vários minutos)...')
  report.seed = runSqlFile('supabase/seed/search_load_test_100k.sql', 'seed-100k')
  report.loadCount = countLoadTestProducts()
  console.log(
    `Seed: ${report.seed.ok ? 'OK' : 'FALHOU'} em ${report.seed.ms} ms — ${report.loadCount ?? '?'} produtos LOADTEST`,
  )
  if (!report.seed.ok) {
    console.error(report.seed.error ?? report.seed.output)
    process.exit(1)
  }
}

if (doTest) {
  report.loadCount = countLoadTestProducts()
  if ((report.loadCount ?? 0) < 100000) {
    console.error(
      `Pré-requisito: >=100000 produtos LOADTEST (atual: ${report.loadCount ?? 0}). Rode com --seed primeiro.`,
    )
    process.exit(1)
  }

  console.log('Rodando cenários de precisão multi-token...')
  for (const scenario of precisionScenarios) {
    const measured = runSearchScenario(scenario)
    const evaluation = evaluateScenario(scenario, measured)
    report.precision.push({ scenario, measured, evaluation })
    console.log(`[${evaluation.pass ? 'PASS' : 'FAIL'}] #${scenario.id} ${scenario.label}`)
  }

  console.log('Medindo latência (5 amostras por query)...')
  for (const item of latencyQueries) {
    const measured = measureLatency(item.query)
    report.latency.push({ ...item, ...measured })
    console.log(`Latência ${item.label}: p50=${measured.p50}ms p95=${measured.p95}ms`)
  }

  console.log('Executando teste SQL integrado search_load.test.sql...')
  report.integration = runSqlFile('supabase/tests/search_load.test.sql', 'integration')
  console.log(`Integração SQL: ${report.integration.ok ? 'OK' : 'FALHOU'}`)
}

const passed = report.precision.filter((r) => r.evaluation.pass).length
const total = report.precision.length
const allPrecisionPass = total === 0 || passed === total
const integrationPass = !doTest || report.integration?.ok

const lines = [
  '# Relatório — Search Load Test (100k produtos)',
  '',
  `**Data:** ${report.startedAt}`,
  `**Ambiente:** ${envLabel}`,
  '',
  '## Resumo',
  '',
  `- Produtos LOADTEST: **${report.loadCount ?? 'N/A'}**`,
]

if (report.seed) {
  lines.push(`- Seed: **${report.seed.ok ? 'OK' : 'FALHOU'}** (${report.seed.ms} ms)`)
}
if (report.cleanup) {
  lines.push(`- Cleanup: **${report.cleanup.ok ? 'OK' : 'FALHOU'}** (${report.cleanup.ms} ms)`)
}
if (doTest) {
  lines.push(`- Precisão multi-token: **${passed}/${total}**`)
  lines.push(`- Teste SQL integrado: **${integrationPass ? 'OK' : 'FALHOU'}**`)
}

lines.push('', '## Precisão multi-token', '')
lines.push('| # | Cenário | Query | Resultados | Top SKU | Tempo (ms) | Status |')
lines.push('|---|---------|-------|------------|---------|------------|--------|')

for (const { scenario, measured, evaluation } of report.precision) {
  lines.push(
    `| ${scenario.id} | ${scenario.label} | \`${scenario.query}\` | ${measured.total ?? 'N/A'} | ${measured.topSku ?? '—'} | ${measured.ms ?? '—'} | ${evaluation.pass ? 'PASS' : `FAIL (${evaluation.reason})`} |`,
  )
}

if (report.latency.length > 0) {
  lines.push('', '## Latência', '')
  lines.push('| Query | p50 (ms) | p95 (ms) | Amostras |')
  lines.push('|-------|----------|----------|----------|')
  for (const row of report.latency) {
    lines.push(`| \`${row.query}\` | ${row.p50} | ${row.p95} | ${row.samples.join(', ')} |`)
  }
}

lines.push('', '## Teste SQL integrado', '')
if (!doTest) {
  lines.push('Não executado nesta rodada.')
} else if (integrationPass) {
  lines.push('`supabase/tests/search_load.test.sql` passou.')
} else {
  lines.push('Falha em `supabase/tests/search_load.test.sql`.')
  lines.push('')
  lines.push('```')
  lines.push((report.integration.error ?? report.integration.output).trim().slice(0, 3000))
  lines.push('```')
}

const docsDir = join(root, 'docs')
mkdirSync(docsDir, { recursive: true })
const reportPath = join(docsDir, 'search-load-test-report.md')
writeFileSync(reportPath, lines.join('\n'), 'utf8')
console.log(`\nRelatório: ${reportPath}`)

const exitOk =
  (!doSeed || report.seed?.ok) &&
  (!doCleanup || report.cleanup?.ok) &&
  allPrecisionPass &&
  integrationPass

process.exit(exitOk ? 0 : 1)
