# STATUS: ecossistema Sunday → evolução da Tipe

Atualizado em 19/10/2026. Prompt: `/mnt/project-files/prompts/sunday-ecossistema-evolucao-tipe-v2.md`.

## Fase atual e próxima tarefa exata

- **Fase:** C (cliente), D (garçom) e E (restaurante) entregues em PR (#12, #13, #15 a #19); F (backoffice) só tem P2. Todos os P0/P1 da matriz estão em PR.
- **Próxima tarefa exata:** observação passiva concluída em 20/10 (cliente, garçom, lojas, central de ajuda). Gorjeta antes de pagar no PR #21. Restam itens P2 novos na matriz.

## Ferramentas testadas (16/10/2026)

| Ferramenta | Resultado | Detalhe |
|---|---|---|
| REA `list_browser_targets` (Chrome do Mac, `127.0.0.1:9222`) | Funcionou | 30 abas: 4 da Sunday (home, digital-bill, staff-app, pricing) e as folhas de contato servidas em `http://127.0.0.1:8765` |
| REA `capture_web_screenshot` | Funcionou | PNG inline de 2880×1224 (1,4 MB); grande demais para a resposta, salvo em arquivo e lido com `jq` |
| REA `list_adb_devices` | Funcionou, sem aparelho | adb 37.0.1 em `/usr/local/bin/adb`; nenhum aparelho nem emulador |
| Playwright na nuvem → `sundayapp.com` | Falhou | `CONNECT tunnel failed, response 403` (também `intercom.help`, Google Play e YouTube) |
| VM do Mac (`device_bash`) → `sundayapp.com` | Falhou | `Received HTTP code 403 from proxy after CONNECT`; sem acesso ao CDP 9222 |
| Remote Control no Mac | Iniciou em 16/10 20:25 | Sessão de observação com Playwright; o Mac ficou fora do ar e a sessão parou sem entregar resultado. Retomar |
| Playwright na nuvem → Tipe local | Funcionou | `vite dev` + backend Supabase falso em memória (fora do repositório), restaurante de demonstração `teste-tipe` |
| Lighthouse 12.8.2 | Funcionou | Build `node-server` + proxy Brotli |
| Computer Use / Mobile MCP / Playwright MCP | Não testados | Sem necessidade nesta rodada; Mobile e Playwright MCP não instalados |

## PRs abertos por esta missão

| PR | Frente | Base | Estado |
|---|---|---|---|
| [#12](https://github.com/robertoalencar-afk/Tipe-1.0/pull/12) | Conta do cliente mais curta (8 → 5 toques; 3 para quem volta) | `redesign-landing-v3` (PR #10) | Rascunho, validado |
| [#13](https://github.com/robertoalencar-afk/Tipe-1.0/pull/13) | Avisos de mesa paga para o garçom | `integracao/colibri-b-garcom` (PR #7) | Rascunho, validado |

## Bloqueios e quem desbloqueia

| Bloqueio | Quem desbloqueia |
|---|---|
| Nuvem e VM do Mac não alcançam a Sunday | Roberto: deixar o Mac acordado com o app do Claude aberto para a sessão Remote Control, ou liberar `sundayapp.com` e `intercom.help` na rede do ambiente |
| App Android e Staff App não observáveis | Roberto: emulador com Play Store ou iPhone espelhado (pedir uma vez, com o passo exato) |
| Apple Pay e Google Pay recusados no servidor | Roberto + Pagar.me: habilitar carteiras (decisão 2) |

## Decisões pendentes (seção 10 do prompt)

1. Merge dos PRs #12 e #13 (e da pilha #6–#10) no `main`. Recomendação: depois do #10.
2. Habilitar Apple Pay e Google Pay no Pagar.me e liberar no servidor. A interface já mostra (decisão de 15/10).
3. Aceite obrigatório dos termos na conta: trocar a caixa por "Ao pagar, você concorda…" economiza um toque. É texto jurídico.
4. Gorjeta antes do pagamento (como a Sunday documenta), em teste A/B. Muda a regra da gorjeta extra.
5. Avisos no celular (#19): aplicar a migração 0026 e criar os segredos VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT no Lovable.

## Testes executados

| Data | Onde | Resultado |
|---|---|---|
| 16/10 | PR #12: `bunx vitest run` | 81 passaram |
| 16/10 | PR #12: `bun run build` (Cloudflare e node-server) | Verde |
| 16/10 | PR #12: Lighthouse mobile da mesa | Antes 73/100, CLS 0,004; depois 75/100, CLS 0 |
| 19/10 | PR #13: `bunx vitest run` | 97 passaram (5 novos) |
| 19/10 | PR #13: `bun run build` | Verde |
| 19/10 | PR #15: `vitest run` | 86 passaram (5 novos) |
| 19/10 | PR #15: build `node-server` | Verde |
| 19/10 | PR #18: `vitest run` | 90 passaram (4 novos); build verde |
| 19/10 | PR #17: `vitest run` | 100 passaram (3 novos); build verde |
| 19/10 | PR #16: Lighthouse mobile da mesa, 3 rodadas | Antes 79/72/75, depois 81/74/75; LCP 4,8 → 4,6 s |
| 20/10 | PR #19: `vitest run`, `tests/db/run.sh`, build | 90 passaram (9 novos, vetor da RFC 8291); banco verde (5 novos de RLS); build verde |
| 20/10 | PR #19: ponta a ponta com receptor local | Pix aprovado → aviso cifrado e assinado chega ao garçom e à dona; inscrição expirada apagada |
| 19/10 | PR #15: Lighthouse do painel (sessão falsa) | Desempenho 76–78, acessibilidade 100, SEO 100; boas práticas 75 só pelo WebSocket de realtime ausente no backend falso |
