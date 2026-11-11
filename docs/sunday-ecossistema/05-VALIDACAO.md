# 05: validação

Ambiente: Playwright na nuvem contra `vite dev` com backend Supabase falso em memória (restaurante de demonstração `teste-tipe`, "Maré Alta", dados fictícios). O backend falso e os scripts ficam fora do repositório.

## PR #12: conta do cliente

| Medida | Antes | Depois |
|---|---|---|
| Toques até pagar a conta inteira com Pix (primeira visita) | 8 | 5 |
| Toques para quem volta à mesa | 6 | 3 |
| Lighthouse mobile (Perf / A11y / CLS) | 73 / 100 / 0,004 | 75 / 100 / 0 |
| Larguras capturadas | 390, 1440 | 1440, 1024, 390, 360 |

Performance abaixo da meta de 90 nos dois casos: o LCP de 4,7 s vem do pacote JavaScript compartilhado (408 KiB sem uso estimados). Vídeo do fluxo (11 s) assistido quadro a quadro: carregamento com esqueleto, nome, conta, pagamento e confirmação sem saltos. Capturas em `validacao/cliente/` na branch do PR.

## PR #13: avisos do garçom

Sessão fictícia de garçom, salão com 4 mesas. Pagamento de metade da Mesa 7 e quitação da Mesa 12 feitos no backend: os avisos "Mesa 7 · Pagou R$ 92,50" e "Mesa 12 · Paga por completo" apareceram na leitura seguinte, sem toque. Capturas em 1440, 390 e 360 px em `validacao/garcom/` na branch do PR. 97 testes, build verde.
