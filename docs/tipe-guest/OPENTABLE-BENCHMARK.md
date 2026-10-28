# Tipe Guest · Benchmark OpenTable (Fase 1)

**Estado: parcial.** Em 28/10/2026 (UTC) a REA, em modo só passivo, listou as cinco abas abertas no Chrome do Roberto e capturou **apenas a home** (`opentable.com`). As capturas das outras quatro abas (perfil do Carbone, busca, restaurant-solutions, App Store) não responderam em 60 s, e em seguida o servidor REA desconectou da sessão. Por regra do projeto, nada aqui vem de memória: o que não foi capturado está marcado como "não observado nas páginas capturadas" e fica pendente.

Método (REA, só passivo): `list_browser_targets` → `capture_web_screenshot` (viewport, sem rolar nem navegar) → `inspect_web_page` (DOM e acessibilidade, sem executar JavaScript). Sem clique, sem login, sem engenharia reversa do app, sem extrair código, APIs, textos longos, imagens, ícones ou composição. Só rótulos curtos de interface são citados, como observação.

Os PNGs **não** foram versionados no repositório (são imagem de terceiro); a prova é o `evidence_id` da REA e o sha256 do PNG, registrados na seção 3. O texto de acessibilidade não veio: a política da REA recusou `include_accessibility_text` ("not_approved"), então o `inspect_web_page` trouxe só a estrutura (papéis e contagens), sem nomes.

## 1. Matriz OpenTable × Tipe Guest

Colunas fixas: funcionalidade · jornada · telas · comportamento esperado · dependências técnicas · equivalente na Tipe · prioridade (P0 demo / P1 piloto / P2 lançamento / depois) · critério de aceitação · status. A coluna **OpenTable hoje** registra só o que as capturas mostraram; **Fonte** aponta a aba e o `evidence_id` (prefixos de 12 caracteres; completos na seção 3). Legenda: **H** = home, captura `ev_989f901de677` e inspeção `ev_4152484095239`; **L** = só o título da aba em `list_browser_targets` `ev_c8351ef89c22`.

| # | Funcionalidade | Jornada | OpenTable hoje | Fonte | Equivalente Tipe | Dependências | Prioridade | Critério de aceitação | Status Tipe |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Explorar restaurantes perto | Descobrir | A home detecta a cidade aproximada sem pedir permissão ("It looks like you're in …") e oferece "Get current location". O conteúdo abaixo do viewport não foi capturado. | H | Aba Explorar com coleções por bairro | `guest_restaurant_profiles`, flag | P0 | lista só de perfis publicados; vazio explicado | falta |
| 2 | Busca por nome, culinária, bairro | Descobrir | Campo único "Location, Restaurant, or Cuisine" + botão "Let's go". Alternância "Search" / "AI Search" acima do campo. | H | Aba Buscar | índice texto/trigram | P0 | resultados em < 1 s com 200 perfis | falta |
| 3 | Filtros (data, hora, pessoas, preço, culinária) | Escolher | Na home, data, hora e pessoas vêm antes da busca, já preenchidos (padrão: 2 pessoas). Filtros de preço e culinária: não observado nas páginas capturadas. | H | Filtros em folha inferior | domínio `availability.ts` | P0 | filtro de horário só mostra quem tem vaga real | falta |
| 4 | Mapa de resultados | Escolher | não observado nas páginas capturadas (a aba de busca `/s?covers=2` aparece só com a URL como título, sinal de que não carregou). | L | Alternância lista/mapa | MapLibre + tiles gratuitos | P1 | sem custo; funciona sem localização | falta |
| 5 | Horários disponíveis no próprio card/perfil | Escolher | não observado nas páginas capturadas | — | Chips de horário no perfil e na lista | motor de disponibilidade | P0 | chips batem com o servidor | falta |
| 6 | Perfil do restaurante (fotos, cardápio, info) | Escolher | não observado nas páginas capturadas (a aba do perfil do Carbone tem título de página carregada, mas a captura não respondeu). | L | Perfil público | Storage, cardápio `pdv_menu_items` | P0 | sem foto/dado inventado | falta |
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
| 17 | Lado do restaurante: livro de reservas, mapa do salão, perfis de clientes | Operação | Link "For Businesses" no topo da home. A página `/restaurant-solutions/` está aberta (título sobre software de reservas e operação), mas não foi capturada. | H, L | Módulo Reservas no painel + camada C do CRM | Fase 5, CRM #29 | P0 demo / P1 piloto | reserva aparece no painel em tempo real | falta |
| 18 | Excluir conta e privacidade | Perfil | não observado nas páginas capturadas | — | Perfil → Privacidade → Excluir conta | `guest_profiles.deleted_at` | P2 (obrigatório para loja) | exclusão no app e na web | falta |
| 19 | Busca assistida por IA (pedido em linguagem natural) | Descobrir | Alternância "AI Search", atalhos com pedidos em frase e "Describe your ideal spot", rotulado "Powered by AI". | H | Não previsto; avaliar depois da busca comum | custo de modelo, moderação | depois | só com custo mostrado e autorização; nunca inventa disponibilidade | fora |

## 2. Diferenciais próprios da Tipe (não existem por cópia)

- Avaliação **ligada ao pagamento confirmado pelo provedor**, logo depois de pagar, com o nome do garçom.
- Ciclo fechado no mesmo produto: reservar → check-in → mesa → pagar pelo QR → avaliar, sem instalar nada para pagar.
- Gorjeta transparente (70% garçom / 30% restaurante) já operando.

## 3. Fontes e capturas

Endpoint CDP `http://127.0.0.1:9222`, Chrome/156.0.8078.48. Listagem das abas: `ev_c8351ef89c223c6c18009f9fe3f9419b87bbd41cc0ab110373bf20924a9c3471`.

| URL | Título da aba | Data/hora (UTC) | evidence_id | sha256 do PNG | O que a página mostrou | Limitações |
|---|---|---|---|---|---|---|
| `https://www.opentable.com/` | Restaurants and Restaurant Bookings \| OpenTable | captura 2026-10-28 00:03:29; inspeção 00:10:29 | captura `ev_989f901de677b0f31395aaef0b2290b5b762f1f083d41ed4097a953ac5267c9a`; inspeção `ev_4152484095239ae13d0dbf5eb1c9cb038e8b594b54ee64c76274ac86798965f0` | `a6dfeb2b7225bc9425970c008ff9d575ab8188ec0a697c21ad5a07a79fe82d36` (2880×1338, 242.960 bytes) | Cabeçalho com seletor de local, "Join rewards", "Sign in" e busca; faixa superior com "Mobile", "For Businesses", "FAQs", idioma. Busca com data, hora, pessoas, campo único e "Let's go"; alternância "Search"/"AI Search"; cidade inferida pelo IP (Cayenne) com "Get current location"; bloco de sugestões por IA; início de um FAQ. | Só o viewport (sem rolar). Cidade inferida não é a do Roberto, então listas locais não representam Fortaleza/NY. Acessibilidade sem texto (política "not_approved"); estrutura: 3.098 nós, 494 links, 116 títulos, 62 botões, 6 abas (`tab`), 3 combobox. |
| `https://www.opentable.com/r/carbone-new-york` | Carbone - Updated 2026, Italian Restaurant in New York, NY | tentativas a partir de 00:03 (sem captura) | — | — | Não capturada. O título indica página carregada. | `capture_web_screenshot` e `inspect_web_page` sem resposta em 60 s; depois a REA desconectou. |
| `https://www.opentable.com/s?covers=2` | opentable.com/s?covers=2 | tentativas a partir de 00:03 (sem captura) | — | — | Não capturada. O título igual à URL sugere que a página não carregou. | Sem resposta em 60 s; falta também uma busca com cidade. |
| `https://www.opentable.com/restaurant-solutions/` | Restaurant Reservation Software & Operations Systems \| OpenTable | tentativas a partir de 00:03 (sem captura) | — | — | Não capturada. | Sem resposta em 60 s. |
| `https://apps.apple.com/us/app/opentable/id296581815` | OpenTable App - App Store | tentativas às 00:03 e após 00:10 (sem captura) | — | — | Não capturada. | Sem resposta em 60 s (duas tentativas); depois a REA desconectou. |

Hipótese provável para os tempos esgotados: o Chrome não renderiza abas em segundo plano, e a captura só respondeu na aba ativa (a home). Para a próxima rodada, cada aba precisa estar em primeiro plano (ou numa janela própria) no momento da captura.

## 4. Validação da navegação (5 abas)

**Pendente.** A página da App Store não foi capturada, então não há base observada para validar Explorar, Buscar, Reservas, Salvos e Perfil contra o app do OpenTable. A home web não mostra barra de abas de app. Mantém-se a recomendação provisória de `ARQUITETURA.md` §5 (manter as 5 abas; Buscar com lista/mapa e filtros; Reservas reunindo futuras, histórico, lista de espera e alertas).

O que a home acrescenta: a busca começa por **data, hora e pessoas** antes do termo, e o local é inferido sem pedir permissão. Isso reforça que a aba Buscar do Guest deve abrir com esses três campos preenchidos por padrão e funcionar sem localização (critério já previsto na linha 4).
