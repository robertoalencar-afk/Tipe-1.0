# Matriz de funcionalidades Sunday × Tipe 2.0

Atualizada em 20/10/2026. Consolida, sem refazer, a pesquisa já existente:

- `sunday-analise/01` a `07` (pasta do projeto): ~100 páginas públicas lidas em 14/10 (site, central de ajuda pública, imprensa, parceiros, App Store) e observações visuais com a REA em 20/10.
- `docs/sunday-ecossistema/03-MATRIZ.md` (PR #14): matriz por perfil com o que os PRs #12 a #19 já entregaram.
- Captura REA desta rodada de `sundayapp.com/hybrid-ordering/` (área visível), igual à já salva em `sunday-analise/rea/`. Capturas da Sunday ficam fora do repositório (imagens de terceiros).

## Como ler

**Status da evidência**
- **Observado (REA)**: visto na tela pela REA no Chrome do Roberto (captura passiva, sem clicar nem rolar).
- **Observado (doc.)**: escrito numa página pública da Sunday ou da central de ajuda pública (fonte citada em `sunday-analise/01`).
- **Inferido**: leitura razoável de fontes públicas, não dita explicitamente.
- **Não verificável**: produto fechado (painel, app da equipe, conta do cliente real) ou página ainda não aberta na REA.

**Tipe atual**: `main` = em produção; `PR #n` = código pronto em PR rascunho; `/demo` = funciona só na demonstração desta entrega (motor fictício, ainda sem banco); `—` = não existe.

**Prioridade**: P0 obrigatório para o fluxo principal, P1 próxima onda, P2 depois. **Complexidade**: B baixa, M média, A alta.

**Decisões do Roberto já aplicadas (20/10):** a conta não terá cartão digitado; os meios da conta são Apple Pay, Google Pay, Pix e "pagar no estabelecimento" (baixa manual). A gorjeta extra continua 70% garçom / 30% Tipe. Apple Pay e Google Pay aparecem como disponíveis (decisão de 15/10), embora o servidor ainda os recuse (ver `payments-and-compliance.md`).

## 1. Pagamento e pedidos

| Produto Sunday | URL | Funcionalidade | Evidência pública | Jornada | Tipe atual | Necessidade | Prior. | Compl. | Dependências | Critério de aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Digital Bill / Pay | /digital-bill/ | Pagar pelo QR sem app e sem cadastro | "Scan, split, tip, pay. 10 seconds, no app" | Cliente lê QR → vê conta → paga | `main` (QR com token, sessão rotativa) | Manter | P0 | — | — | Conta abre em < 3 s no 4G, sem login | Observado (doc.) |
| Digital Bill | /digital-bill/ | Conta itemizada ao vivo | "Live itemized bill"; descontos do PDV aparecem | Cliente vê itens e valores | `main` (atualiza a cada 5 s) | Trocar consulta por Realtime no cliente | P2 | B | Supabase Realtime | Item lançado aparece em < 2 s | Observado (doc.) |
| Digital Bill | /digital-bill/ | "Falta pagar" no topo da divisão | Terminal: "Left to pay $100.00" | Cliente divide | `main`, `PR #12`, `/demo` | Manter no topo | P1 | B | — | Saldo visível sem rolar | Observado (REA, 07) |
| Digital Bill | /digital-bill/ | Divisão por item | "Pick the item you've ordered" | Cliente escolhe itens | `main` (com frações ½ ⅓ ¼) | Manter (diferencial: dividir 1 item) | P0 | — | — | Partes de um item somam o preço exato | Observado (doc.) |
| Digital Bill | /digital-bill/ | Divisão por assento | Itens agrupados "Guest 1/Guest 2" | Cliente paga o próprio lugar | `/demo` (lugar por item) | Lugar no pedido real (`pdv_order_items.seat`) | P1 | M | Pedido pelo app ou PDV que informe lugar | Pagar "lugar 2" cobra só os itens do lugar 2 | Observado (REA, 07) |
| Digital Bill | /digital-bill/ | Partes iguais e valor livre | Doc. | Cliente divide | `main` (+ percentual) | Manter | P0 | — | — | 3 partes de R$ 10 = 10,00 | Observado (doc.) |
| Digital Bill | /digital-bill/ | Valor e itens no botão | "Pay 4 items $50.00" | Cliente confirma | `PR #12`, `/demo` ("Pagar R$ 88,00") | Incluir quantidade de itens | P2 | B | — | Botão mostra itens e valor | Observado (REA, 07) |
| Digital Bill | /digital-bill/ | Meios: Apple Pay, Google Pay, cartões | Doc. | Cliente paga | `main`: Pix + no local; carteiras visíveis no `PR #12`, recusadas no servidor | Habilitar carteiras no PSP. **Sem cartão digitado** (decisão 20/10) | P0 | M | Pagar.me (carteiras), contrato | Pagamento com carteira aprovado em homologação | Observado (doc.) |
| Digital Bill | /digital-bill/ | Gorjeta antes do pagamento, com nome do garçom | "Add a tip for Lucas" (18/20/25%, "Regular") | Cliente escolhe gorjeta | `main`: depois do pagamento; `/demo`: antes, com nome | Teste A/B (decisão 4 pendente) | P1 | B | Decisão do Roberto | Gorjeta mostra o primeiro nome do garçom | Observado (REA, 07) |
| Digital Bill | /digital-bill/ | Comprovante por e-mail/download | Doc. | Cliente salva | `main` (e-mail); `/demo` (imprimir/PDF) | WhatsApp depois | P2 | B | — | Comprovante com itens, serviço e gorjeta | Observado (doc.) |
| Digital Bill | /digital-bill/ | Concorrência entre pagadores | Não descrito | Dois pagam ao mesmo tempo | `main` (reserva com trava de linha no banco); `/demo` (Web Locks) | Manter e testar | P0 | — | — | Segundo pagamento do mesmo saldo é recusado | Não verificável (Sunday) |
| Hybrid Ordering | /hybrid-ordering/ | Pedido pelo QR e pelo garçom na mesma conta | Doc.; vídeo de restaurante real | Cliente pede, garçom também | `PR #8` (pedido pela mesa), `PR #7` (garçom), `/demo` | Integrar #6–#9 ao `main` | P0 | M | Merge da pilha colibri | Pedido do QR e do garçom somam na mesma conta, sem duplicar | Observado (doc. + REA) |
| Hybrid Ordering | /hybrid-ordering/ | Pré-autorização contra calote | Doc. | Cliente abre conta | — | Não fazer agora (sem cartão na conta) | P2 | A | PSP, decisão | — | Observado (doc.) |
| Order & Pay | /order-and-pay/ | Pedir e pagar antes (fast casual) | Doc. | Cliente pede e paga | `PR #9` (totem) | Pedido pago antecipadamente pelo QR | P1 | M | #8, carteiras | Pedido pago entra no KDS | Inferido (página não aberta na REA) |
| Click & Collect | /click-and-collect/ | Retirada no balcão com senha | Doc. | Cliente pede para retirar | `PR #6` (balcão, painel de senhas) | Pedido remoto para retirada | P2 | M | #6 | Senha chamada no painel | Não verificável (página não aberta) |
| Digital Tab | /digital-tab/ | Comanda aberta com cartão | Doc. | Bar | — | Fora do escopo (sem cartão) | P2 | A | — | — | Observado (doc.) |
| Pre-ordering | /pre-ordering/ | Pré-pedido para grupos | — | Grupo pede antes | — | Pesquisar | P2 | M | Página na REA | — | Não verificável |
| Pre-payment | /pre-payment/ | Sinal / consumação antecipada | Doc. (link de pagamento) | Reserva paga | — | Link de pagamento Pix | P2 | M | Pagar.me | Link pago vira crédito na conta | Inferido |
| Smart Handheld | /smart-handheld/ | Terminal na mão do garçom | Doc. | Garçom cobra na mesa | — (Tipe usa o celular do garçom) | Não fazer hardware; "pagar no estabelecimento" cobre | P2 | A | Adquirente | — | Observado (doc.) |

## 2. Experiência do consumidor

| Produto Sunday | URL | Funcionalidade | Evidência pública | Jornada | Tipe atual | Necessidade | Prior. | Compl. | Dependências | Critério de aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Guest Platform | /guest-platform/ | Conta opcional depois de pagar (recibos, pontos) | Doc. (login opcional, app iOS jan/2025) | Cliente volta | — | Perfil opcional com consentimento | P2 | A | LGPD, jurídico | Pagar continua sem cadastro | Observado (doc.) |
| Guest Platform | /guest-platform/ | Descoberta de restaurantes | — | Cliente busca | — | Avaliar depois de ter base | P2 | M | Base de restaurantes | — | Não verificável |
| Smart Menu | /smart-menu/ | Cardápio digital com fotos, alérgenos, sugestão | Doc. ("AI menu") | Cliente navega | `PR #8` (cardápio); `/demo` (alérgenos, adicionais, sugestão por regra) | Alérgenos e adicionais no banco | P1 | M | #8 | Alérgeno aparece em todo item que o contém | Observado (doc.) |
| Online Reputation | /online-reputation/ | Convite ao Google após avaliação | Doc. | Cliente avalia | `main` | Manter sem filtrar notas | — | — | — | Convite não depende da nota | Observado (doc.) |
| Guest Insights | /guest-insights/ | Avaliação 1–5 com alerta de nota baixa | Doc. | Cliente avalia, gerente é avisado | `main` (avaliação), `PR #15` e `PR #17` (alertas), `/demo` | Integrar | P0 | B | PRs | Nota ≤ 2 avisa garçom e gerente | Observado (doc.) |
| Loyalty | /loyalty/ | Pontos e recompensas | Doc. | Cliente acumula | — | Fase 7 | P2 | A | LGPD, regras de cashback | — | Observado (doc.) |

## 3. Operação e equipe

| Produto Sunday | URL | Funcionalidade | Evidência pública | Jornada | Tipe atual | Necessidade | Prior. | Compl. | Dependências | Critério de aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Staff App | /staff-app/ | Mesas acompanhadas e saldo por mesa | Doc. | Garçom acompanha | `PR #7` (celular), `/demo` | Integrar | P0 | M | #7 | Garçom vê saldo real da mesa | Observado (doc.) |
| Staff App | /staff-app/ | Aviso de mesa paga / parcial / falha | Doc. | Garçom é avisado | `PR #13`, `PR #19` (push), `/demo` | Integrar | P0 | B | VAPID no Lovable | Aviso chega com o app fechado | Observado (doc.) |
| Staff App | /staff-app/ | Gorjetas e desempenho do garçom | Doc. | Garçom vê o turno | `main` (saldo, saque); `/demo` (vendas, gorjeta, nota) | Nota recebida no app do garçom | P1 | B | — | Garçom vê só os próprios dados | Observado (doc.) |
| Staff App | /staff-app/ | Estorno pelo app da equipe | Doc. | Garçom pede | `/demo` (garçom pede, gerente aprova) | Estorno real via Pagar.me | P1 | M | API de cancelamento da Pagar.me | Estorno com motivo, aprovado por quem pode | Observado (doc.) |
| End of Shift | /end-of-shift/ | Fechamento por turno e diferença com o PDV | Doc. ("Gap Assistant") | Caixa fecha | `main` (fechamento do dia) | Turnos almoço/jantar | P1 | M | — | Relatório por turno | Observado (doc.) |
| Accounting | /accounting/ | Conciliação até o depósito | Doc. | Contador confere | `main` (status Pagar.me); `/demo` (motor de conciliação por referência) | Recebíveis da Pagar.me | P1 | M | API de recebíveis | Toda transação tem par no extrato ou aparece como divergência | Observado (doc.) |
| Staff Performance | /staff-performance/ | Ranking por garçom (adoção, nota, gorjeta) | Doc. | Gerente acompanha | `main` (parcial), `/demo` | Adoção do QR por garçom | P1 | B | — | Tabela por garçom com período | Observado (doc.) |
| Tips Booster | /tips-booster/ | Gorjeta sugerida por IA, teste A/B | Doc. | Cliente vê sugestão | — | A/B simples antes de IA | P2 | M | Decisão 4 | Sem manipulação; "Não" com o mesmo peso | Observado (doc.) |
| (Help center) | — | Políticas de gorjeta: direta, caixinha, híbrida | Doc. | Gerente configura | — (70/30 direto ao garçom da mesa) | Manter 70/30 (decisão 20/10); caixinha só com parecer | P2 | M | Jurídico (Lei 13.419/2017) | — | Observado (doc.) |

## 4. Inteligência e crescimento

| Produto Sunday | URL | Funcionalidade | Evidência pública | Jornada | Tipe atual | Necessidade | Prior. | Compl. | Dependências | Critério de aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Business Analytics | /business-analytics/ | Faturamento, ticket, couverts, meios, turnos | Doc. | Gerente | `main` (relatórios), `PR #18` (filtros + CSV), `/demo` | Pessoas por mesa, tempo de mesa | P1 | M | — | Indicador vem de dado real ou é marcado como demonstração | Observado (doc.) |
| Business Analytics | /business-analytics/ | Resumo diário por IA | Doc. | Dono recebe e-mail | — (Lebre existe) | Resumo diário com teto de custo | P1 | B | Lebre, agendamento | Texto gerado só com números do banco | Observado (doc.) |
| Customer Analytics | /customer-analytics/ | Clientes recorrentes, origem do cartão | Doc. | Gerente | — | Depende de perfil opcional | P2 | A | LGPD | — | Observado (doc.) |
| Online Reputation | /online-reputation/ | Respostas a avaliações do Google com IA | Doc. | Gerente responde | — | Lebre redige, humano envia | P2 | M | API do Google Business | Nada é publicado sem clique humano | Observado (doc.) |
| Branding | /branding/ | Marca do restaurante na conta e no recibo | Doc. | Cliente vê | `main` (parcial, Totem Studio) | Logo e cor na conta | P2 | B | — | Conta mostra logo do restaurante | Observado (doc.) |
| sunday AI (site) | / | Assistente de IA fixo no site | "Ask anything about sunday" | Visitante pergunta | `main` (Lebre pública) | Avaliar deixar visível na landing | P2 | B | Thread da landing | — | Observado (REA, 07) |

## 5. Integrações e comercial

| Produto Sunday | URL | Funcionalidade | Evidência pública | Jornada | Tipe atual | Necessidade | Prior. | Compl. | Dependências | Critério de aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Partners | /partners/ | 50+ integrações de POS (Toast, NCR, Lightspeed...) | Doc. | Restaurante conecta | `main`: Lançamento TIPE + API genérica; outbox pronta | 1º adaptador brasileiro (dados de `restaurant_leads.pdv_system`) | P0 | A | Documentação e autorização do fornecedor | Conta fecha sozinha no PDV após pagar | Observado (doc.) |
| Pricing | /pricing/ | Planos publicados (US$ 199–299) | Doc. | Dono escolhe | `main` (preços ocultos, `SHOW_PLAN_PRICES=false`) | Publicar preços (decisão do Roberto) | P1 | B | Decisão | — | Observado (doc.) |
| (Imprensa/Trustpilot) | — | Taxa cobrada do cliente | Doc. (criticada) | — | Não existe | **Não adotar**; argumento de venda | — | — | — | — | Observado (doc.) |

## Páginas ainda não abertas na REA

`order-and-pay`, `click-and-collect`, `digital-tab`, `pre-ordering`, `pre-payment`, `smart-handheld`, `guest-platform`, `staff-app`, `smart-menu`, `accounting`, `end-of-shift`, `staff-performance`, `tips-booster`, `online-reputation`, `loyalty`, `branding`, `guest-insights`, `business-analytics`, `customer-analytics`, `partners`, `pricing`. O conteúdo delas já está coberto pela leitura de texto de 14/10 (fontes em `sunday-analise/01`), mas o visual (layout, animações, demonstrações) não foi visto. A REA só captura a área visível de abas já abertas; para abri-las no Chrome com depurador, o Roberto roda uma vez no Terminal do Mac:

```bash
for u in staff-app order-and-pay smart-menu end-of-shift business-analytics pricing; do curl -s -X PUT "http://127.0.0.1:9222/json/new?https://sundayapp.com/$u/" >/dev/null && echo "aberta: $u"; done
```
