#!/usr/bin/env node
/**
 * Executa validação de busca e gera docs/search-validation-report.md
 *
 * Uso:
 *   node scripts/run-search-validation.mjs
 *   node scripts/run-search-validation.mjs --linked
 */

import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, mkdtempSync, writeFileSync as writeTmp, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const useLinked = process.argv.includes('--linked')
const flag = useLinked ? '--linked' : '--local'

const scenarios = [
  { id: 1, query: 'camiseta', uf: null, expectMin: 1, label: 'Busca por nome parcial' },
  { id: 2, query: 'camiseta preta', uf: null, expectMin: 1, label: 'Nome + variante de cor' },
  { id: 3, query: 'preta', uf: null, expectMin: 1, label: 'Busca só por cor' },
  { id: 4, query: 'algodao', uf: null, expectMin: 1, label: 'Accent-insensitive' },
  { id: 5, query: 'ER Moda', uf: null, expectMin: 1, label: 'Busca por marca' },
  { id: 6, query: 'Camiseta básica algodão', uf: 'SP', expectOutsideUf: true, label: 'Expansão cross-UF' },
  { id: 7, query: 'camisrta', uf: null, expectMin: 1, label: 'Typo fuzzy' },
  { id: 8, query: 'calcado', uf: null, expectMin: 1, label: 'Categoria/produto calcados' },
  { id: 9, query: 'xyz_inexistente_123', uf: null, expectMin: 0, expectMax: 0, label: 'Termo inexistente' },
  { id: 10, query: 'camiseta', uf: null, expectMin: 1, label: 'Busca geral camiseta' },
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

function runSqlFile(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'search-val-'))
  const file = join(dir, 'query.sql')
  writeTmp(file, sql, 'utf8')
  const started = Date.now()
  try {
    const output = execSync(`npx supabase db query ${flag} -f "${file}"`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    rmSync(dir, { recursive: true, force: true })
    return { ok: true, output, json: parseCliJson(output), ms: Date.now() - started }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    return {
      ok: false,
      output: error.stdout?.toString() ?? '',
      json: parseCliJson(error.stdout?.toString() ?? ''),
      error: error.stderr?.toString() ?? error.message,
      ms: Date.now() - started,
    }
  }
}

function countSearch(query, uf) {
  const ufSql = uf ? `'${uf}'` : 'null'
  const safeQuery = query.replace(/'/g, "''")
  const countSql = `
select
  count(*)::int as total,
  coalesce(bool_or(is_outside_uf), false) as has_outside
from public.search_feed_products('${safeQuery}', null, ${ufSql}, 50, 0);
`
  const result = runSqlFile(countSql)
  if (!result.ok) return { ...result, total: null, hasOutside: null, topNames: [] }

  const row = result.json?.rows?.[0]
  const total = row?.total ?? 0
  const hasOutside = Boolean(row?.has_outside)

  const namesSql = `
select coalesce(string_agg(nome, ', ' order by rank desc), '') as names
from (
  select nome, rank
  from public.search_feed_products('${safeQuery}', null, ${ufSql}, 50, 0)
  limit 3
) s;
`
  const namesResult = runSqlFile(namesSql)
  const namesRow = namesResult.json?.rows?.[0]
  const topNames = (namesRow?.names ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return { ...result, total, hasOutside, topNames }
}

function runIntegrationTestFile() {
  const cmd = `npx supabase db query ${flag} -f supabase/tests/product_search.test.sql`
  try {
    const output = execSync(cmd, { cwd: root, encoding: 'utf8' })
    return { ok: true, output }
  } catch (error) {
    return {
      ok: false,
      output: error.stdout?.toString() ?? '',
      error: error.stderr?.toString() ?? error.message,
    }
  }
}

function evaluateScenario(scenario, result) {
  if (!result.ok) return { pass: false, reason: (result.error ?? 'Erro SQL').split('\n')[0] }

  if (scenario.expectMax === 0 && result.total !== 0) {
    return { pass: false, reason: `Esperado 0 resultados, obteve ${result.total}` }
  }

  if (scenario.expectOutsideUf && !result.hasOutside) {
    return { pass: false, reason: 'Esperado is_outside_uf=true' }
  }

  if (scenario.expectMin != null && scenario.expectMin > 0 && (result.total ?? 0) < scenario.expectMin) {
    return { pass: false, reason: `Esperado >=${scenario.expectMin}, obteve ${result.total}` }
  }

  return { pass: true, reason: 'OK' }
}

console.log(`Validando busca (${useLinked ? 'linked' : 'local'})...`)

const results = []
for (const scenario of scenarios) {
  const measured = countSearch(scenario.query, scenario.uf)
  const evaluation = evaluateScenario(scenario, measured)
  results.push({ scenario, measured, evaluation })
  console.log(`[${evaluation.pass ? 'PASS' : 'FAIL'}] #${scenario.id} ${scenario.label}`)
}

const integration = runIntegrationTestFile()
const passed = results.filter((r) => r.evaluation.pass).length
const total = results.length
const avgMs = Math.round(results.reduce((sum, r) => sum + (r.measured.ms ?? 0), 0) / Math.max(total, 1))

const lines = [
  '# Relatório de Validação — Busca de Produtos',
  '',
  `**Data:** ${new Date().toISOString()}`,
  `**Ambiente:** ${useLinked ? 'Supabase linked (remoto)' : 'Supabase local'}`,
  '',
  '## Resumo executivo',
  '',
  `- Cenários automatizados: **${passed}/${total}** aprovados`,
  `- Teste SQL integrado: **${integration.ok ? 'aprovado' : 'falhou ou indisponível'}**`,
  `- Latência média por consulta: **${avgMs} ms**`,
  '',
  '## Matriz de cenários',
  '',
  '| # | Cenário | Query | UF | Resultados | Top produtos | Tempo (ms) | Status |',
  '|---|---------|-------|----|------------|--------------|------------|--------|',
]

for (const { scenario, measured, evaluation } of results) {
  lines.push(
    `| ${scenario.id} | ${scenario.label} | \`${scenario.query}\` | ${scenario.uf ?? '—'} | ${measured.total ?? 'N/A'} | ${measured.topNames?.slice(0, 3).join('; ') || '—'} | ${measured.ms ?? '—'} | ${evaluation.pass ? 'PASS' : `FAIL (${evaluation.reason})`} |`,
  )
}

lines.push('', '## Falhas', '')
const failures = results.filter((r) => !r.evaluation.pass)
if (failures.length === 0) {
  lines.push('Nenhuma falha nos cenários executados.')
} else {
  for (const failure of failures) {
    lines.push(`- **#${failure.scenario.id} ${failure.scenario.label}:** ${failure.evaluation.reason}`)
  }
}

lines.push('', '## Teste SQL integrado', '')
if (integration.ok) {
  lines.push('Todos os 10 cenários em `supabase/tests/product_search.test.sql` passaram.')
} else {
  lines.push('Falha ao executar `supabase/tests/product_search.test.sql`.')
  lines.push('')
  lines.push('```')
  lines.push((integration.error ?? integration.output).trim().slice(0, 2000))
  lines.push('```')
}

lines.push('', '## Recomendações futuras', '')
lines.push('- Analytics de queries zero-result para expandir sinônimos')
lines.push('- Reindexação quando categoria/fornecedor mudar (trigger cross-table)')
lines.push('- Cache de sugestões populares no client')

const docsDir = join(root, 'docs')
mkdirSync(docsDir, { recursive: true })
const reportPath = join(docsDir, 'search-validation-report.md')
writeFileSync(reportPath, lines.join('\n'), 'utf8')

console.log(`\nRelatório gerado em ${reportPath}`)
process.exit(passed === total && integration.ok ? 0 : 1)
