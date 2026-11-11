# Medição (GA4 e Meta Pixel)

Nenhum ID está inventado. Sem ID, nenhum script de terceiro carrega.

## O que a Tipe precisa fornecer
| Variável (build/Cloudflare) | Formato | Onde obter |
|---|---|---|
| `VITE_GA4_ID` | `G-XXXXXXXXXX` | Google Analytics > Admin > Fluxos de dados |
| `VITE_META_PIXEL_ID` | 8 a 20 dígitos | Meta Events Manager > Pixel |

IDs fora do formato são ignorados. Definir como variável de build do deploy (Cloudflare).

## Regras
- Scripts só carregam com consentimento (`analytics` para GA4, `marketing` para Pixel), ver `src/lib/tipe/tracking.ts`.
- Conta da mesa do cliente não carrega medição.
- `page_view` só com o caminho, sem query string (sem e-mail/token).
- Eventos: `page_view` (troca de rota), `cta_click` (`local`: demonstracao_header, demonstracao_menu_mobile, demonstracao_final), `generate_lead` / Pixel `Lead` (envio do formulário).
- Nenhum dado pessoal em parâmetros.

## Checagem após informar os IDs
1. Aceitar cookies de medição e ver `page_view` no GA4 DebugView.
2. Recusar: nada de `googletagmanager`/`fbevents` na aba Rede.
