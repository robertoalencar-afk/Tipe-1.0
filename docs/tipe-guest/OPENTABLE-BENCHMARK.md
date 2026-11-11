# Tipe Guest · Benchmark OpenTable (Fase 1)

**Estado: parcial, segunda rodada feita.** Em 28/10/2026 (UTC), às 00:03, a REA capturou só a home: as abas em segundo plano não respondiam. Às 10:20, com as páginas reabertas pelo Roberto, a REA capturou o perfil do Carbone, a página `/restaurant-solutions/`, a página do app na App Store e uma listagem de Nova York, que voltou 404. A busca `/s?covers=2` continuou sem responder. Por regra do projeto, nada aqui vem de memória: o que não foi capturado está marcado como "não observado nas páginas capturadas" e fica pendente.

Método (REA, só passivo): `list_browser_targets` → `capture_web_screenshot` (viewport, sem rolar nem navegar) → `inspect_web_page` (DOM e acessibilidade, sem executar JavaScript). Sem clique, sem login, sem engenharia reversa do app, sem extrair código, APIs, textos longos, imagens, ícones ou composição. Só rótulos curtos de interface são citados, como observação.

Os PNGs **não** foram versionados no repositório (são imagem de terceiro); a prova é o `evidence_id` da REA e o sha256 do PNG, registrados na seção 3. O texto de acessibilidade não veio: a política da REA recusou `include_accessibility_text` ("not_approved"), então o `inspect_web_page` trouxe só a estrutura (papéis e contagens), sem nomes.

## 1. Matriz OpenTable × Tipe Guest

Colunas fixas: funcionalidade · jornada · telas · comportamento esperado · dependências técnicas · equivalente na Tipe · prioridade (P0 demo / P1 piloto / P2 lançamento / depois) · critério de aceitação · status. A coluna **OpenTable hoje** registra só o que as capturas mostraram; **Fonte** aponta a aba e o `evidence_id` (prefixos de 12 caracteres; completos na seção 3). Legenda: **H** = home, captura `ev_989f901de677` e inspeção `ev_4152484095239`; **P** = perfil do Carbone `ev_fa0780ebccd3`; **S** = `/restaurant-solutions/` `ev_5b5c3145d2f6`; **A** = App Store `ev_a79efd180f9e`; **L** = só o título da aba em `list_browser_targets` `ev_c8351ef89c22`.

| # | Funcionalidade | Jornada | OpenTable hoje | Fonte | Equivalente Tipe | Dependências | Prioridade | Critério de aceitação | Status Tipe |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Explorar restaurantes perto | Descobrir | A home detecta a cidade aproximada sem pedir permissão ("It looks like you're in …") e oferece "Get current location". O conteúdo abaixo do viewport não foi capturado. | H | Aba Explorar com coleções por bairro | `guest_restaurant_profiles`, flag | P0 | lista só de perfis publicados; vazio explicado | falta |
| 2 | Busca por nome, culinária, bairro | Descobrir | Campo único "Location, Restaurant, or Cuisine" + botão "Let's go". Alternância "Search" / "AI Search" acima do campo. | H | Aba Buscar | índice texto/trigram | P0 | resultados em < 1 s com 200 perfis | falta |
| 3 | Filtros (data, hora, pessoas, preço, culinária) | Escolher | Na home, data, hora e pessoas vêm antes da busca, já preenchidos (padrão: 2 pessoas). Filtros de preço e culinária: não observado nas páginas capturadas. | H | Filtros em folha inferior | domínio `availability.ts` | P0 | filtro de horário só mostra quem tem vaga real | falta |
| 4 | Mapa de resultados | Escolher | não observado nas páginas capturadas (a aba de busca `/s?covers=2` aparece só com a URL como título, sinal de que não carregou). | L | Alternância lista/mapa | MapLibre + tiles gratuitos | P1 | sem custo; funciona sem localização | falta |
| 5 | Horários disponíveis no próprio card/perfil | Escolher | não observado nas páginas capturadas | — | Chips de horário no perfil e na lista | motor de disponibilidade | P0 | chips batem com o servidor | falta |
| 6 | Perfil do restaurante (fotos, cardápio, info) | Escolher | Perfil com nome, faixa de preço ("$30 and under"), culinária e abas "Overview", "Menu" e "Details"; bloco "About this restaurant" com "Read more". O Carbone aparece como "Permanently Closed", e no lugar da reserva fica um botão "Find similar restaurants". | P | Perfil público | Storage, cardápio `pdv_menu_items` | P0 | sem foto/dado inventado | falta |
| 7 | Reserva em poucos toques | Reservar | A busca da home começa por data → hora → pessoas, mesma ordem do fluxo proposto. O fluxo de confirmação: não observado nas páginas capturadas. | H | Fluxo data → hora → pessoas → confirmar | holds, idempotência | P0 | duas reservas simultâneas: uma passa | falta |
| 8 | Pedidos especiais / ocasião | Reservar | não observado nas páginas capturadas | — | Campo de observação e ocasião | — | P1 | texto limitado, visível no painel | falta |
| 9 | Minhas reservas (alterar, cancelar) | Visitar | não observado nas páginas capturadas | — | Aba Reservas | política de cancelamento | P0 | dentro/fora da política testado | falta |
| 10 | Lista de espera / notificar vaga | Reservar | não observado nas páginas capturadas | — | Lista de espera + alertas | `guest_waitlist_entries`, push | P1 | sem duplicata; só vaga real | falta |
| 11 | Experiências (menus, eventos) | Escolher | não observado nas páginas capturadas | — | Experiências, sem pré-pagamento | `guest_experiences` | P2 | pagamento antecipado desligado | falta |
| 12 | Avaliações verificadas | Avaliar | não observado nas páginas capturadas | — | Avaliação após pagamento verificado, com consentimento | Fase 2 | P0 (coleta) / P2 (exibição) | sem consentimento nunca aparece | falta |
| 13 | Salvos e listas | Voltar | não observado nas páginas capturadas | — | Aba Salvos | `guest_favorites`, `guest_lists` | P1 | sincroniza entre aparelhos | falta |
| 14 | Pontos/fidelidade | Voltar | Link "Join rewards" no cabeçalho da home (programa existe; regras não observadas). | H | Fora do escopo inicial | — | depois | — | fora |
| 15 | Pagar pelo app | Pagar | não observado nas páginas capturadas | — | Tipe Pay pelo QR, sem app | já existe | P0 (integração) | pagar sem instalar continua igual | funciona (QR) |
| 16 | Notificações (lembrete, confirmação) | Visitar | não observado nas páginas capturadas | — | Expo Push + e-mail | `guest_push_tokens` | P1 | consentimento de push no app | falta |
| 17 | Lado do restaurante: livro de reservas, mapa do salão, perfis de clientes | Operação | Link "For Businesses" no topo da home. `/restaurant-solutions/` vende "One connected platform" com IA e automação, menus "Solutions & benefits", "Who we serve", "Integrations", "Pricing and plans", CTAs "Book a demo" e "Get started" e um assistente de IA no chat ("Olivia"). As telas do produto ficam abaixo do viewport e não foram vistas. | H, S | Módulo Reservas no painel + camada C do CRM | Fase 5, CRM #29 | P0 demo / P1 piloto | reserva aparece no painel em tempo real | falta |
| 18 | Excluir conta e privacidade | Perfil | não observado nas páginas capturadas | — | Perfil → Privacidade → Excluir conta | `guest_profiles.deleted_at` | P2 (obrigatório para loja) | exclusão no app e na web | falta |
| 19 | Busca assistida por IA (pedido em linguagem natural) | Descobrir | Alternância "AI Search", atalhos com pedidos em frase e "Describe your ideal spot", rotulado "Powered by AI". No app, uma das imagens da loja anuncia "AI-powered picks" e um "Concierge" que recebe pedidos em frase. | H, A | Não previsto; avaliar depois da busca comum | custo de modelo, moderação | depois | só com custo mostrado e autorização; nunca inventa disponibilidade | fora |

## 2. Diferenciais próprios da Tipe (não existem por cópia)

- Avaliação **ligada ao pagamento confirmado pelo provedor**, logo depois de pagar, com o nome do garçom.
- Ciclo fechado no mesmo produto: reservar → check-in → mesa → pagar pelo QR → avaliar, sem instalar nada para pagar.
- Gorjeta transparente (70% garçom / 30% restaurante) já operando.

## 3. Fontes e capturas

Endpoint CDP `http://127.0.0.1:9222`, Chrome/156.0.8078.48. Listagem das abas: `ev_c8351ef89c223c6c18009f9fe3f9419b87bbd41cc0ab110373bf20924a9c3471`.

| URL | Título da aba | Data/hora (UTC) | evidence_id | sha256 do PNG | O que a página mostrou | Limitações |
|---|---|---|---|---|---|---|
| `https://www.opentable.com/` | Restaurants and Restaurant Bookings \| OpenTable | captura 2026-10-28 00:03:29; inspeção 00:10:29 | captura `ev_989f901de677b0f31395aaef0b2290b5b762f1f083d41ed4097a953ac5267c9a`; inspeção `ev_4152484095239ae13d0dbf5eb1c9cb038e8b594b54ee64c76274ac86798965f0` | `a6dfeb2b7225bc9425970c008ff9d575ab8188ec0a697c21ad5a07a79fe82d36` (2880×1338, 242.960 bytes) | Cabeçalho com seletor de local, "Join rewards", "Sign in" e busca; faixa superior com "Mobile", "For Businesses", "FAQs", idioma. Busca com data, hora, pessoas, campo único e "Let's go"; alternância "Search"/"AI Search"; cidade inferida pelo IP (Cayenne) com "Get current location"; bloco de sugestões por IA; início de um FAQ. | Só o viewport (sem rolar). Cidade inferida não é a do Roberto, então listas locais não representam Fortaleza/NY. Acessibilidade sem texto (política "not_approved"); estrutura: 3.098 nós, 494 links, 116 títulos, 62 botões, 6 abas (`tab`), 3 combobox. |
| `https://www.opentable.com/r/carbone-new-york` | Carbone - Updated 2026, Italian Restaurant in New York, NY | 2026-10-28 10:20:42 | `ev_fa0780ebccd3be4b91f71c23c321e1e05c4ffda83d2b9d8b2a8e471fece250bf` | `69468847ff93714fc18c582fdbf7b92a8f3d3adcaeb0a9a7d7221690f51d004a` (2880×1338, 151.386 bytes) | Cabeçalho com "New York City > Manhattan"; nome, "$30 and under", "Italian"; abas Overview/Menu/Details; "About this restaurant"; cartão "Permanently Closed" com "Find similar restaurants". | O restaurante está fechado, então o widget de reserva não aparece. Só o viewport. |
| `https://www.opentable.com/s?covers=2` | opentable.com/s?covers=2 | tentativas às 00:03 e às 10:21 (sem captura) | — | — | Não capturada. A página não carregou. | Sem resposta em 60 s nas duas rodadas. |
| `https://www.opentable.com/new-york-restaurant-listings` | OpenTable | 2026-10-28 10:20:56 | `ev_cff24b35bd201276345f573cad6da7fca5c648b930d0ea43edaf348697cbf147` | `4e93ee49c48a7a599510d15c20f07b24e3de36d5ec2e3b321efd9edfd35e2956` | Página de erro 404 ("Well, this is embarrassing."). | URL escolhida por nós e inexistente. A busca com resultados e mapa continua sem observação. |
| `https://www.opentable.com/restaurant-solutions/` | Restaurant Reservation Software & Operations Systems \| OpenTable | 2026-10-28 10:21:03 | `ev_5b5c3145d2f648df9ca77c17da2a0a8ccf9d38c867bd56cf3a118df11aac7a80` | `ac80e753b796b360afa4c192ba69488e2159ea9d17a2dc6336b5abe53036c81e` (1.778.928 bytes) | Hero "More guests. More time. One connected platform.", menus de soluções, público, integrações e preços, "Book a demo", "Get started", chat de IA "Olivia". | Só o viewport; nenhuma tela do produto. |
| `https://apps.apple.com/us/app/opentable/id296581815` | OpenTable App - App Store | 2026-10-28 10:21:09 | `ev_a79efd180f9edde8d92f2312b1ed35e719a5b42e324ab0b979bdbb7eb288e392` | `7dee20557cda3d6c439ceee5f6563e12f2cec05fa5752c9e9029ac63831fee54` (617.328 bytes) | "Find Restaurant Reservations", grátis, 5,7 mi de avaliações (4,9), "Editors' Choice", 16+, #32 em Food & Drink. Das quatro imagens visíveis, três estavam pretas (não carregadas) e uma anuncia "AI-powered picks" com o "Concierge". | A barra de abas do app não aparece nas imagens visíveis. |

Hipótese provável para os tempos esgotados: o Chrome não renderiza abas em segundo plano, e a captura só respondeu na aba ativa (a home). Para a próxima rodada, cada aba precisa estar em primeiro plano (ou numa janela própria) no momento da captura.

## 4. Validação da navegação (5 abas)

**Ainda sem base observada.** A segunda rodada capturou a página da loja, mas nenhuma das imagens visíveis mostra a barra de abas do app (três estavam pretas e a quarta mostra o Concierge). Mantém-se a recomendação de `ARQUITETURA.md` §5: Explorar, Buscar, Reservas, Salvos e Perfil.

O que as capturas acrescentam:
- A busca começa por **data, hora e pessoas** antes do termo, e o local é inferido sem pedir permissão (home). A aba Buscar do Guest deve abrir com esses três campos preenchidos e funcionar sem localização.
- O perfil se organiza em três abas, **Visão geral, Cardápio e Detalhes**. Quando o restaurante fecha, a reserva dá lugar a "ver parecidos". Vale para o perfil do Guest: um restaurante sem reservas ativas mostra alternativas em vez de um botão desabilitado.
- O OpenTable investe em **IA na descoberta** (AI Search, Concierge). No Guest isso fica como "depois" (linha 19), só com custo mostrado e autorizado.
