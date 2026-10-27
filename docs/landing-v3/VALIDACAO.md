# Validação da landing v3 (15/10/2026)

## Como foi medido
- Build de produção com `NITRO_PRESET=node-server` (o preset padrão é Cloudflare e não roda localmente), servido atrás de um proxy local com compressão Brotli e cache longo nos assets, para simular a hospedagem.
- Lighthouse 12, perfil mobile padrão (4G lento simulado, CPU 4×) e perfil desktop.
- **Antes** = branch `integracao/redesign-premium` (PR #5), medida do mesmo jeito. A versão publicada em tipe.digital não pôde ser medida daqui (o servidor na nuvem não acessa o domínio).

## Resultados
| | Antes (mobile) | Depois (mobile) | Antes (desktop) | Depois (desktop) | Meta |
|---|---|---|---|---|---|
| Performance | 56–58 | 65–71 | 97 | 97 | ≥ 90 |
| LCP | 8,1–8,2 s | 4,8–5,2 s | 1,1 s | 1,1 s | ≤ 2,5 s |
| FCP | 5,7–5,9 s | 3,8–4,0 s | 0,9 s | 0,9 s | — |
| TBT (aproxima o INP) | 170–230 ms | 190–230 ms | 30 ms | 20 ms | INP ≤ 200 ms |
| CLS | 0 | 0 | 0,001 | 0 | ≤ 0,1 |
| Acessibilidade | 97 | 100 | 97 | 97 | ≥ 95 |

A melhora no mobile vem principalmente das fontes auto-hospedadas (antes o primeiro texto esperava o Google Fonts).

**Meta não atingida no mobile (Performance ≥ 90, LCP ≤ 2,5 s).** O que pesa é do app inteiro, não da landing: o HTML do SSR tem ~146 KB, e a página carrega chunks compartilhados (cliente Supabase, roteador, `chunk-D32…` de 131 KB, KaTeX, `LebreAssistant` de 98 KB depois do carregamento). Próximos passos sugeridos, fora do escopo desta branch: tirar KaTeX e o assistente da rota `/`, revisar o que entra no chunk principal e reduzir o estado serializado no HTML.

Com fotos reais, a imagem do hero vira o LCP: ela já está preparada com `fetchpriority="high"`, AVIF/WebP e `srcset`.

## Telas verificadas
Capturas em 1920, 1440, 1024, 390 e 360 px, rolando a página inteira, mais gravações da rolagem em desktop e mobile (`/mnt/project-files/landing-v3/`). Conferido: hero, filme da mesa (5 cenas acompanham a rolagem), seções, planos, dúvidas, formulário, rodapé, banner de cookies (aceitar, recusar, personalizar), menu mobile, e as páginas `/simulador` e `/entrar` com a nova fonte de títulos.

## Ajustes feitos depois de ver a página
- Título do hero quebrava em 4 linhas em 1440 px: escala reduzida para caber em 2.
- Celular do filme da mesa cortava no topo em telas baixas: largura passou a depender da altura da tela.
- Notificações do filme ficavam atrás do celular: subiram de camada e foram afastadas.
- Calculadora tinha contraste insuficiente (turquesa sobre branco, 1,9:1): trocado pelo turquesa escuro da marca.

## Limitações
- Sem fotos reais ainda; as cenas mostram a lebre.
- INP real só aparece com usuários (Search Console / CrUX); em laboratório usamos TBT.
- Não houve teste com leitor de tela; navegação por teclado e foco foram verificados por inspeção dos componentes (links e botões nativos, `details/summary`, diálogo Radix).
