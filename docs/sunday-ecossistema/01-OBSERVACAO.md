# 01: observação da Sunday

Só observação passiva de páginas públicas. As capturas ficam no Mac do Roberto (`~/Public/sunday-ref/captura`) e não entram no repositório. Níveis: **Observado** (visto nesta missão), **Documentado** (texto da própria Sunday, com URL), **Inferido** (dedução, com a base).

## Lacunas do `06` que esta missão pode fechar

| Lacuna (06 / 01) | Superfície | Situação |
|---|---|---|
| Ordem dos passos do cliente (gorjeta antes ou depois, número de telas) | Cliente | Aberta: carrossel de 8 passos em `/digital-bill/` só teve o slide 1 visto |
| O que um cliente vê do pagamento dos outros | Cliente | Aberta |
| Como o garçom é avisado e o que a notificação diz | Garçom | **Parcialmente fechada**: texto das notificações observado (abaixo) |
| Layout do painel e da conciliação | Restaurante | Aberta: depende da central de ajuda (rede bloqueada na nuvem) |

## Telas observadas

| Superfície | Tela | Fonte e data | Evidência | Toques | Hierarquia | Tipografia e espaço | Componentes | Movimento | Princípio | Equivalente na Tipe |
|---|---|---|---|---|---|---|---|---|---|---|
| Cliente | Display de mesa no carrossel "The simplest way for guests to pay" (slide 1 de 8) | `sundayapp.com/digital-bill/`, 390 px, 16/10 | Observado (`digital-bill-mobile-06.png`) | não observado | Número da mesa, "PAY THE BILL", depois "View the menu, share the bill, pay in 10 seconds." e logos Apple Pay, Google Pay e bandeiras | Título grande em caixa alta sobre fundo escuro; texto de apoio pequeno | Display de mesa com QR, celular com cardápio em abas e filtros em pílula | Carrossel com setas e 8 pontos | Promessa de tempo na própria mesa; carteiras como primeiro meio | `TotemStudio`, conta da mesa (`$restaurante.$mesa.tsx`) |
| Cliente | Hero de `/digital-bill/` | `sundayapp.com/digital-bill/`, 390 px, 16/10 | Observado (`digital-bill-mobile-00.png`) | — | Rótulo "Digital Bill", título "\"Check please\" is a thing of the past.", botão preto "Get started", foto com valor "$0" sobreposto | Título ~32 px peso 400 (medido antes, `design-system.md`) | Botão pílula preto, foto com cartão de vidro | — | Valor da conta em destaque absoluto, "$0" como fim do fluxo | Total em aberto no topo da conta (PR #12) |
| Garçom | Notificações do celular | `sundayapp.com/digital-bill/`, 390 px, 16/10 | Observado (`digital-bill-mobile-07.png`) | 0 (chega sozinha) | Ícone + "Table 24 · Fully paid" e "Guests can leave"; "Table 44 · Partially paid" e "Payment with a $10 tip" | Título em negrito com emoji de estado, linha de apoio | Notificação do sistema com contador no ícone do app (18) | — | O garçom sabe sem abrir nada: mesa, estado e próxima ação | Avisos das suas mesas (PR #13) |
| Garçom | Notificações do Staff App | App Store id1630128947 | Documentado (via `sunday-analise/01`) | — | Mesa quitada, gorjeta, falha, nota ruim, pagamento suspeito | — | — | — | Avisos por evento | PR #13 cobre quitada, parcial e no local |
| Cliente | Fluxo "Scan, split, tip, pay. 10 seconds, no app." | `sundayapp.com/` | Documentado | 4 passos anunciados | — | — | — | — | Poucos passos até "pago" | PR #12 (5 toques; 3 para quem volta) |
| Cliente | Gorjeta antes do pagamento | central de ajuda (FR) | Documentado (via `sunday-analise/01`) | — | — | — | — | — | Gorjeta no mesmo fluxo | Tipe: depois, separada; decisão do Roberto |

## Não observado nesta rodada (e por quê)

- Slides 2 a 8 do carrossel do cliente, carrosséis do `/staff-app/`, central de ajuda e fichas das lojas: a nuvem e a VM do Mac recebem 403 do proxy; a sessão Remote Control no Mac parou com o Mac fora do ar antes de entregar.
- Apps Android e iOS: nenhum aparelho ou emulador (`adb devices` vazio).
