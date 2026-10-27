# Tipe Guest · Relatório da Fase 1

Branch `guest/fase-1-auditoria`, PR em rascunho contra `main` (nada é mesclado). Só documentação.

## Feito
- `AUDITORIA.md`: rotas, auth, papéis, RLS, restaurante/mesa/salão, QR e pagamento, avaliação pós-pagamento, CRM #29, `/demo` #20, Order #31–#33, landing #28/#30, numeração de migrações, skills da sessão.
- `ARQUITETURA.md`: onde cada peça mora, modelo de dados esboçado, concorrência, identidade do consumidor, flags, navegação, mapas, riscos.
- `OPENTABLE-BENCHMARK.md`: matriz com o lado da Tipe preenchido; **lado OpenTable pendente da REA** (Chrome de depuração fechado; contêiner sem acesso a opentable.com).

## Migrações
Nenhuma criada. Reservadas ao Guest: **0031–0039** (combinado com a thread do Tipe Order em 27/10). Nada aplicado em produção.

## Testes
Não se aplica (só documentos). Auditoria feita por leitura de código e `git show` nas branches remotas.

## Situação
- Implementado e verificado: auditoria e arquitetura.
- Pendente: capturas do OpenTable pela REA e a coluna "OpenTable hoje" da matriz; validação final das 5 abas.
- Fora do escopo: Fases 2 a 9.

## Decisões para o Roberto
1. Autorizar a Fase 2 (avaliações com consentimento) e, em paralelo, 3 (Fundador) e 8 (landing).
2. Base da Fase 2: `order/base` (recomendado, evita conflito em `$restaurante.$mesa.tsx`) ou `main`.
3. Confirmar reserva de numeração 0031–0039.
