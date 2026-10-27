# Tipe Guest · Benchmark OpenTable (Fase 1)

**Estado: aguardando a captura pela REA.** Em 27/10/2026, às 19h (UTC), o Chrome de depuração do Roberto (porta 9222) não estava aberto, e o contêiner na nuvem não alcança `opentable.com` nem `apps.apple.com` (o proxy recusa a conexão). Por regra do projeto, este documento **não** descreve o OpenTable de memória: as colunas "OpenTable hoje" só serão preenchidas com o que a REA capturar das páginas públicas.

Método (REA, só passivo): `list_browser_targets` → `capture_web_screenshot` (viewport, sem rolar nem navegar) → `inspect_web_page` (DOM e acessibilidade, sem executar JavaScript). Sem login, sem engenharia reversa do app, sem extrair código, APIs, textos, imagens, ícones ou composição.

Páginas a capturar:
1. `https://www.opentable.com/` (home do consumidor)
2. `https://www.opentable.com/s?covers=2&term=italian&metroId=8` (busca, lista/mapa, filtros)
3. Um perfil de restaurante público (horários disponíveis, fotos, cardápio, avaliações)
4. `https://apps.apple.com/us/app/opentable/id296581815` (página do app: abas, capturas, rótulos de privacidade)
5. `https://www.opentable.com/restaurant-solutions/` (lado do restaurante)

Capturas serão salvas em `docs/tipe-guest/benchmark/` com data e URL.

## 1. Matriz OpenTable × Tipe Guest

Colunas fixas: funcionalidade · jornada · telas · comportamento esperado · dependências técnicas · equivalente na Tipe · prioridade (P0 demo / P1 piloto / P2 lançamento / depois) · critério de aceitação · status. A coluna **OpenTable hoje** fica "a verificar" até a captura.

| # | Funcionalidade | Jornada | OpenTable hoje | Equivalente Tipe | Dependências | Prioridade | Critério de aceitação | Status Tipe |
|---|---|---|---|---|---|---|---|---|
| 1 | Explorar restaurantes perto | Descobrir | a verificar | Aba Explorar com coleções por bairro | `guest_restaurant_profiles`, flag | P0 | lista só de perfis publicados; vazio explicado | falta |
| 2 | Busca por nome, culinária, bairro | Descobrir | a verificar | Aba Buscar | índice texto/trigram | P0 | resultados em < 1 s com 200 perfis | falta |
| 3 | Filtros (data, hora, pessoas, preço, culinária) | Escolher | a verificar | Filtros em folha inferior | domínio `availability.ts` | P0 | filtro de horário só mostra quem tem vaga real | falta |
| 4 | Mapa de resultados | Escolher | a verificar | Alternância lista/mapa | MapLibre + tiles gratuitos | P1 | sem custo; funciona sem localização | falta |
| 5 | Horários disponíveis no próprio card/perfil | Escolher | a verificar | Chips de horário no perfil e na lista | motor de disponibilidade | P0 | chips batem com o servidor | falta |
| 6 | Perfil do restaurante (fotos, cardápio, info) | Escolher | a verificar | Perfil público | Storage, cardápio `pdv_menu_items` | P0 | sem foto/dado inventado | falta |
| 7 | Reserva em poucos toques | Reservar | a verificar | Fluxo data → hora → pessoas → confirmar | holds, idempotência | P0 | duas reservas simultâneas: uma passa | falta |
| 8 | Pedidos especiais / ocasião | Reservar | a verificar | Campo de observação e ocasião | — | P1 | texto limitado, visível no painel | falta |
| 9 | Minhas reservas (alterar, cancelar) | Visitar | a verificar | Aba Reservas | política de cancelamento | P0 | dentro/fora da política testado | falta |
| 10 | Lista de espera / notificar vaga | Reservar | a verificar | Lista de espera + alertas | `guest_waitlist_entries`, push | P1 | sem duplicata; só vaga real | falta |
| 11 | Experiências (menus, eventos) | Escolher | a verificar | Experiências, sem pré-pagamento | `guest_experiences` | P2 | pagamento antecipado desligado | falta |
| 12 | Avaliações verificadas | Avaliar | a verificar | Avaliação após pagamento verificado, com consentimento | Fase 2 | P0 (coleta) / P2 (exibição) | sem consentimento nunca aparece | falta |
| 13 | Salvos e listas | Voltar | a verificar | Aba Salvos | `guest_favorites`, `guest_lists` | P1 | sincroniza entre aparelhos | falta |
| 14 | Pontos/fidelidade | Voltar | a verificar | Fora do escopo inicial | — | depois | — | fora |
| 15 | Pagar pelo app | Pagar | a verificar | Tipe Pay pelo QR, sem app | já existe | P0 (integração) | pagar sem instalar continua igual | funciona (QR) |
| 16 | Notificações (lembrete, confirmação) | Visitar | a verificar | Expo Push + e-mail | `guest_push_tokens` | P1 | consentimento de push no app | falta |
| 17 | Lado do restaurante: livro de reservas, mapa do salão, perfis de clientes | Operação | a verificar | Módulo Reservas no painel + camada C do CRM | Fase 5, CRM #29 | P0 demo / P1 piloto | reserva aparece no painel em tempo real | falta |
| 18 | Excluir conta e privacidade | Perfil | a verificar | Perfil → Privacidade → Excluir conta | `guest_profiles.deleted_at` | P2 (obrigatório para loja) | exclusão no app e na web | falta |

## 2. Diferenciais próprios da Tipe (não existem por cópia)

- Avaliação **ligada ao pagamento confirmado pelo provedor**, logo depois de pagar, com o nome do garçom.
- Ciclo fechado no mesmo produto: reservar → check-in → mesa → pagar pelo QR → avaliar, sem instalar nada para pagar.
- Gorjeta transparente (70% garçom / 30% restaurante) já operando.

## 3. Fontes e capturas

Pendente da REA. Cada linha da matriz receberá a URL e o arquivo da captura que a sustenta.

## 4. Validação da navegação (5 abas)

Pendente das capturas da página do app na App Store. Recomendação provisória em `ARQUITETURA.md` §5.
