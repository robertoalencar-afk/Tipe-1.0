# Tipe Guest · Relatório da Fase 1

Branch `guest/fase-1-auditoria`, PR em rascunho contra `main` (nada é mesclado). Só documentação.

## Feito
- `AUDITORIA.md`: rotas, auth, papéis, RLS, restaurante/mesa/salão, QR e pagamento, avaliação pós-pagamento, CRM #29, `/demo` #20, Order #31–#33, landing #28/#30, numeração de migrações, skills da sessão.
- `ARQUITETURA.md`: onde cada peça mora, modelo de dados esboçado, concorrência, identidade do consumidor, flags, navegação, mapas, riscos.
- `OPENTABLE-BENCHMARK.md`: matriz com o lado da Tipe preenchido e **benchmark parcial pela REA** (28/10, UTC): home do OpenTable capturada (evidence_id e sha256 na seção 3) e usada na coluna "OpenTable hoje" + coluna Fonte; linha 19 nova (busca assistida por IA, prioridade "depois"). As outras quatro abas (perfil Carbone, busca, restaurant-solutions, App Store) não responderam à captura em 60 s e a REA desconectou em seguida; essas linhas ficaram "não observado nas páginas capturadas".

## Migrações
Nenhuma criada. Reservadas ao Guest: **0040–0049** (0040 avaliações, 0041 Restaurante Fundador, 0042+ reservas). Renumerado em 28/10: 0031–0032 foram usadas pelo PR #45/release e 0033 por caixa/esperado-no-servidor. Nada aplicado em produção.

## Testes
Não se aplica (só documentos). Auditoria feita por leitura de código e `git show` nas branches remotas.

## Situação
- Implementado e verificado: auditoria e arquitetura.
- Segunda rodada REA (28/10, 10:20 UTC): perfil, `/restaurant-solutions/` e App Store capturados. Pendente: busca com resultados e mapa (a `/s` não carrega e a listagem testada deu 404) e a barra de abas do app (não aparece nas imagens da loja).
- Fora do escopo: Fases 2 a 9.

## Decisões para o Roberto
1. Autorizar a Fase 2 (avaliações com consentimento) e, em paralelo, 3 (Fundador) e 8 (landing).
2. Base da Fase 2: `order/base` (recomendado, evita conflito em `$restaurante.$mesa.tsx`) ou `main`.
3. Confirmar a numeração 0040–0049 do Guest.
