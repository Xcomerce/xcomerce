# Relatório de Validação — Busca de Produtos

**Data:** 2026-08-18T17:17:56.255Z
**Ambiente:** Supabase linked (remoto)

## Resumo executivo

- Cenários automatizados: **10/10** aprovados
- Teste SQL integrado: **aprovado**
- Latência média por consulta: **16639 ms**

## Matriz de cenários

| # | Cenário | Query | UF | Resultados | Top produtos | Tempo (ms) | Status |
|---|---------|-------|----|------------|--------------|------------|--------|
| 1 | Busca por nome parcial | `camiseta` | — | 3 | Camiseta básica algodão penteado; Camiseta Premium 26.1; Camiseta Adulto | 21151 | PASS |
| 2 | Nome + variante de cor | `camiseta preta` | — | 3 | Camiseta Adulto; Camiseta básica algodão penteado; Camiseta Premium 26.1 | 19882 | PASS |
| 3 | Busca só por cor | `preta` | — | 5 | Camiseta básica algodão penteado; Tênis casual unissex; Vestido midi viscose | 12557 | PASS |
| 4 | Accent-insensitive | `algodao` | — | 2 | Camiseta básica algodão penteado; Camiseta Premium 26.1 | 14395 | PASS |
| 5 | Busca por marca | `ER Moda` | — | 3 | Camiseta básica algodão penteado; Tênis casual unissex; Vestido midi viscose | 16421 | PASS |
| 6 | Expansão cross-UF | `Camiseta básica algodão` | SP | 1 | Camiseta básica algodão penteado | 14781 | PASS |
| 7 | Typo fuzzy | `camisrta` | — | 3 | Camiseta básica algodão penteado; Camiseta Premium 26.1; Camiseta Adulto | 18775 | PASS |
| 8 | Categoria/produto calcados | `calcado` | — | 1 | Tênis casual unissex | 12732 | PASS |
| 9 | Termo inexistente | `xyz_inexistente_123` | — | 0 | — | 16571 | PASS |
| 10 | Busca geral camiseta | `camiseta` | — | 3 | Camiseta básica algodão penteado; Camiseta Premium 26.1; Camiseta Adulto | 19125 | PASS |

## Falhas

Nenhuma falha nos cenários executados.

## Teste SQL integrado

Todos os 10 cenários em `supabase/tests/product_search.test.sql` passaram.

## Recomendações futuras

- Analytics de queries zero-result para expandir sinônimos
- Reindexação quando categoria/fornecedor mudar (trigger cross-table)
- Cache de sugestões populares no client