---
name: tipe-quality-assurance
description: Use antes de abrir ou atualizar um PR da Tipe, ou ao declarar uma funcionalidade pronta, para rodar os testes certos e registrar o status com evidência.
---

# Qualidade na Tipe

1. Instale sem tocar no lockfile: mova `bun.lock` para fora, `BUN_CONFIG_REGISTRY=https://registry.npmjs.org bun install`, devolva o `bun.lock`. Nunca faça commit de mudança no lockfile.
2. Rode `bunx vitest run` e `bunx tsc --noEmit -p .` (erros só nos arquivos que você tocou importam; o resto é pré-existente).
3. Mexeu em banco: `tests/db/run.sh` com PostgreSQL 16 local.
4. Mexeu em tela: suba `bunx vite dev --host 127.0.0.1 --port 5173` e rode o Playwright (`tests/e2e/demo-journey.mjs` é o modelo: celular iPhone 13 e computador 1366 px, sem rolagem horizontal, sem erro de página). Olhe as capturas.
5. `bun run build` precisa passar.
6. Atualize `docs/tipe-v2/implementation-status.md`: "Testada" só com teste que falharia se a funcionalidade quebrasse. Nunca invente resultado.
7. Nunca faça push no `main` (publica no Lovable). Branch nova + PR rascunho, empilhado sobre o PR que mexe nos mesmos arquivos.
