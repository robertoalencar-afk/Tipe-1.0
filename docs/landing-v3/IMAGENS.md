# Imagens da landing

## Como trocar ou adicionar uma foto
Coloque os arquivos em `src/assets/fotos/` com o nome `<cena>-<largura>.<formato>`. O componente `EditorialPhoto` monta o `srcset` sozinho.

Cenas: `garcom` (hero), `amigos`, `casal`, `salao` (para quem atende), `gestor`.
Larguras sugeridas: 640, 1080, 1600. Formatos: `avif` e `webp`, mais um `jpg` como fallback.
Exemplo: `garcom-640.avif`, `garcom-1080.avif`, `garcom-1600.avif`, `garcom-1080.webp`, `garcom-1080.jpg`.

Sem arquivo para uma cena, a página mostra a lebre da Tipe sobre um fundo da marca.

## Registro de origem e licença
| Cena | Arquivo | Origem (URL) | Autor | Licença | Data | Onde aparece |
|---|---|---|---|---|---|---|
| garcom | garcom-*.{avif,webp,jpg} | Gerada por IA (Gemini) | — | Própria (gerada com a conta da Tipe) | 15/10/2026 | Hero |
| amigos | amigos-* | Gerada por IA (Gemini) | — | Própria | 15/10/2026 | Para quem está na mesa |
| casal | casal-* | Gerada por IA (Gemini) | — | Própria | 15/10/2026 | Para quem está na mesa |
| salao | salao-* | Gerada por IA (Gemini) | — | Própria | 15/10/2026 | Para quem atende |
| gestor | gestor-* | Gerada por IA (Gemini) | — | Própria | 15/10/2026 | Para quem gerencia |

Regras: fotos próprias, de ensaio contratado, de bancos com licença comercial ou geradas por IA (decisão do Roberto, 15/10/2026). As pessoas geradas por IA ilustram cenas e não devem ser apresentadas como depoimentos ou clientes reais identificados.

## Fotos geradas por IA (15/10/2026)

As cinco cenas (garcom, amigos, casal, salao, gestor) foram criadas com o modelo de imagem do Google Gemini (gemini-3-pro-image), a pedido do Roberto, com a chave da conta dele. São pessoas fictícias, não clientes reais. Originais e roteiro de cada cena: /mnt/project-files/landing-v3/fotos-ia/ (gerar.py). Versões otimizadas em src/assets/fotos/ (avif, webp e jpg em 640 px e na largura original).

## Rodada 15/10 (tarde): telas reais e suporte de madeira

- Fotos `mesa`, `amigos`, `casal`, `salao` e `garcom` refeitas no Gemini (gemini-3-pro-image) com o cartão real da Tipe num suporte de madeira, a partir de `ref-totem-claro.png`. Sem maquininha em nenhuma cena.
- `mesa` é a nova foto principal. `garcom` (vendo no relógio que caiu a gorjeta extra) foi para a seção "Para quem atende".
- `src/assets/telas/*.webp`: capturas do próprio `/simulador` em 390×844 a 3x (Playwright), exportadas em 390 e 780 px. Usadas pelo `PhoneShot` no hero e na galeria "É isso que aparece no celular". Para refazer: abrir `/simulador`, percorrer totem → nome → seleção → pagamento (Apple Pay) → aprovado → avaliação → gorjeta, escondendo o botão de WhatsApp, e salvar cada etapa.

## Rodada V4 (21/10/2026): só ferramentas gratuitas

Decisão do Roberto (21/10): sem Gemini, fal.ai ou outra API paga sem autorização dele, e prioridade para os assets originais do projeto. Um banco de 36 fotos gratuitas do Unsplash foi baixado com licenças conferidas (/mnt/project-files/landing-v3/v4/stock/), mas o Roberto rejeitou o conjunto por não ter relação com o projeto; nenhuma delas está no site. A home continua só com as fotos originais do casting, que mostram o cartão da Tipe e o elenco brasileiro aprovado.
