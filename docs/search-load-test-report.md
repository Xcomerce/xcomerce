# Relatório — Search Load Test (100k produtos)

**Data:** 2026-08-21T19:32:58.550Z
**Ambiente:** Supabase linked (remoto)

## Resumo

- Produtos LOADTEST: **100000**
- Precisão multi-token: **0/7**
- Teste SQL integrado: **FALHOU**

## Precisão multi-token

| # | Cenário | Query | Resultados | Top SKU | Tempo (ms) | Status |
|---|---------|-------|------------|---------|------------|--------|
| 1 | Nome + cor (AND) | `camiseta preta` | N/A | — | 136008 | FAIL (Initialising login role...) |
| 2 | 4 tokens — produto exato top 1 | `camiseta preta 42 algodao` | N/A | — | 133086 | FAIL (Initialising login role...) |
| 3 | Nome + cor + tamanho numérico | `camiseta preta 42` | N/A | — | 133713 | FAIL (Initialising login role...) |
| 4 | Nome + cor + tamanho M (1 char) | `camiseta preto m` | N/A | — | 133494 | FAIL (Initialising login role...) |
| 5 | Token inexistente (zero resultados) | `camiseta preta 42 algodao xyz_inexistente_123` | N/A | — | 129396 | FAIL (Initialising login role...) |
| 6 | Typo fuzzy + cor | `camisrta preta` | N/A | — | 129378 | FAIL (Initialising login role...) |
| 7 | 4+ tokens variados | `loadtest camiseta premium preto` | N/A | — | 137004 | FAIL (Initialising login role...) |

## Latência

| Query | p50 (ms) | p95 (ms) | Amostras |
|-------|----------|----------|----------|
| `camiseta` | 0 | 0 |  |
| `camiseta preta` | 9368 | 9859 | 7702, 9859, 8996, 9368, 9528 |
| `camiseta preta 42 algodao` | 16317 | 70251 | 10821, 12659, 16317, 70251, 39339 |

## Teste SQL integrado

Falha em `supabase/tests/search_load.test.sql`.

```
Initialising login role...
```