# 01 · Referências (Sunday e Tipe publicada)

Estudo feito em 15/10/2026 com a REA, só no modo passivo: `list_browser_targets`, `capture_web_screenshot` e `inspect_web_page` sobre abas públicas abertas no Chrome do Roberto. Nenhum script, bundle ou tráfego de rede do Sunday foi analisado. As capturas ficaram fora do repositório.

Páginas: https://sundayapp.com/ · /digital-bill/ · /staff-app/ · /pricing/ · https://tipe.digital/

## O que torna o Sunday agradável, e como a Tipe aplica de forma original

| No Sunday | Princípio | Na Tipe v3 |
|---|---|---|
| Hero do Staff App: foto de meio corpo de um garçom real, com três notificações de vidro do app sobrepostas à foto | O produto aparece **dentro** de uma cena humana, não ao lado dela | Hero com foto editorial do garçom e notificações reais da Tipe ("Mesa 12 · conta paga", "Ana pagou a parte dela", "Atendimento 5 estrelas") |
| Digital Bill: cartão "$35,50 → $0" sobre a foto de quem paga | Uma tela só, com um número grande, conta a história inteira | Seção "Para quem está na mesa": cartão "Mesa 12 · falta pagar R$ 0,00" com a divisão Ana/Caio/Bia |
| Títulos enormes, peso médio, entrelinha curta e tracking negativo (Helvetica Neue LT, comercial) | A tipografia é a composição | Bricolage Grotesque (OFL) em peso 600, tracking −0,045em, entrelinha 0,92–0,96 |
| Muito branco, uma cor de destaque (magenta) e preto | Uma cor de marca, usada com intenção | Turquesa como destaque, azul-marinho como "preto", laranja só em detalhes (rabisco, "para pagar.") |
| Rabiscos desenhados à mão ao lado do CTA | Pequenas surpresas dão personalidade | Rabisco original em laranja que se desenha ao lado de "não." no hero; a lebre aparece em momentos-chave |
| Pricing: dois cartões grandes, preço gigante centralizado, plano popular em cor cheia | Comparação em um olhar | Número de mesas gigante em cada plano (preços seguem ocultos), plano recomendado em turquesa cheio |
| Cookies: avatar pequeno no canto inferior esquerdo, discreto | Consentimento que não grita | Cartão compacto no canto inferior esquerdo, com a lebre, "Recusar" e "Aceitar todos" com o mesmo peso |
| Navegação: poucos itens, botão de demo preto em pílula | Um CTA principal claro | Mantido o cabeçalho do redesign anterior, com CTA em pílula azul-marinho |

O comportamento no scroll do Sunday não pôde ser observado em detalhe: a captura da REA é só da viewport e não rola a página (`capture_browser_scenario` falhou em sessões anteriores e não foi usado). As técnicas de motion da v3 foram definidas pelo princípio, não por cópia.

## Tipe publicada × código

| | tipe.digital (main, publicado) | Branch `integracao/redesign-premium` (PR #5) |
|---|---|---|
| Abertura | Animação `MesaViva` em tela cheia (logo, 6 cenas, ~33 s em loop, "Role para ver / Pular") | Hero com celular animado (`PaymentJourneyDemo`), sem a `MesaViva` |
| "Vídeo" | Não há arquivo de vídeo: é a `MesaViva`, animada com GSAP | Não usado |
| Promessas sem código | A `MesaViva` mostra Apple Pay e Google Pay como opções e "em 3 s via Pix"; o plano Personalizado promete várias unidades | Carteiras como "em breve"; Personalizado ainda promete várias unidades |
