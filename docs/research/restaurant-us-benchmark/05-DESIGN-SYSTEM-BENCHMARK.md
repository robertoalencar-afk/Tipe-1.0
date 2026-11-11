# 05 — Design e UX: por que os melhores PDVs são rápidos, e o que muda no design system da Tipe

Data: 14/10/2026. Base: artigos de ajuda oficiais que descrevem telas e passos (`[TELA]`), documentação (`[DOC]`) e as notas em `notas/`. Design system da Tipe: tokens em `src/styles.css` (no `main`), tokens semânticos e `ds.tsx` no ramo `redesign-premium` (documento de design system da etapa 0).

**Limite desta etapa.** As telas foram lidas pelos artigos de ajuda, que descrevem botões, ordem e cores. Medidas exatas (alvo de toque em pixels, tamanhos de fonte) não aparecem em texto e ficam **não verificadas**. Em 20/10/2026 seis artigos foram capturados inteiros pela REA no Chrome do usuário; o que as imagens confirmam, corrigem ou acrescentam está na seção 7. Capturas ficam fora do repositório.

## 1. Os sete motivos da velocidade

### 1.1 O mapa de mesas é a tela inicial e a tela de estado
- **Toast**: bloco da mesa mostra pessoas, cronômetro, total e iniciais do garçom; a cor diz o estado do **pedido** (vermelho = item retido, amarelo = enviado, verde = tudo pronto no KDS), cinza = mesa de outro garçom, borda pontilhada = vazia [DOC/TELA, `notas/toast.md` §3].
- **Lightspeed**: um **selo no canto** da mesa diz de quem ela é (verde = minha, laranja = de outro com acesso, vermelho = sem permissão; corrigido pela captura de 20/10, §7.2) e uma faixa vermelha avisa mesa aberta há muito tempo [TELA, `notas/lightspeed.md` §3].
- **Square**: a mesa fica ocupada assim que se informa o número de pessoas, antes do primeiro item [TELA].
- **Tipe hoje**: grade de cartões com cinco estados de pagamento (`livre`, `ocupada`, `aguardando`, `encerrada`, `inativa`, em `RestaurantPanel.tsx:46-50`), sem tempo, sem pessoas, sem estado da cozinha e sem planta.

**Por que funciona:** o garçom decide o próximo passo olhando uma tela só. O estado da cozinha volta ao salão (Toast), e o tempo aberto chama atenção sem relatório.

### 1.2 Poucos toques no caminho feliz, com contagem documentada
| Fluxo | Toast | Square | Lightspeed | TouchBistro | Tipe hoje |
|---|---|---|---|---|---|
| Abrir mesa | 1–2 [TELA] | 2 [TELA] | 2 [TELA] | 2 [TELA] | 0 (implícito ao lançar), mas exige escolher mesa e garçom na tela de lançamento |
| Item com 1 modificador obrigatório | 5 [TELA] | 3–4 [INF] | ~3 [TELA] | ~5 [INF] | não existe modificador; item + observação digitada |
| Enviar à cozinha | 1 [TELA] | 1 [TELA] | 1 [TELA] | 1 [TELA] | 1 ("Lançar") |
| Dividir conta | 3 por assento [TELA] | 5–6 [TELA] | ~5 por pessoa [TELA] | 2 por assento [INF] | feito pelo cliente no QR |
| Ciclo simples completo | não verificado | não verificado | ~8 [INF] | ~12 [INF] | não comparável |

**Meta para a Tipe:** abrir mesa em 1 toque, item com modificador em no máximo 4, ciclo simples (abrir, 1 item com modificador, enviar, receber em dinheiro e fechar) em até 8 toques.

### 1.3 Modificadores que guiam em vez de perguntar
- Três níveis na Toast: obrigatório (bloqueia o envio), opcional que aparece sozinho, opcional escondido [DOC].
- Square: modificadores "conversacionais" em botões **Sem / Extra / Adicionar**, preço negativo para remoção e esgotados no fim da lista; nome curto para a cozinha ("Kitchen Facing Name") [TELA].
- Lightspeed: no pop-up, **Duplicar** (mesmo item, mesmas escolhas) e **Adicionar outro** (mesmo item, outras escolhas) [TELA].
- TouchBistro: o diálogo abre sozinho no obrigatório, o item fica vermelho se incompleto e o envio pode ser bloqueado [TELA].

### 1.4 Ações frequentes fixas, raras escondidas
Toast e Square deixam **Enviar / Pagar** sempre no rodapé e mandam o resto (anular, cortesia, transferir, isentar) para um menu "Ações" ou de três pontos [TELA]. Lightspeed mostra a contagem pendente no botão: **"Enviar · 3 itens"** [TELA]. TouchBistro usa botões compostos como **"Receber e fechar mesa"** [TELA].

### 1.5 Erro previsto, erro desfeito
- Anulação e cortesia pedem motivo (Square, Toast) [TELA]; ação sem permissão pede a senha de um gerente em vez de bloquear (Toast) [TELA].
- No KDS da Square, tocar de novo em até 3 s desfaz a conclusão; depois, "Recall" [TELA].
- Toast "Stay" segura automaticamente os itens não selecionados; "Hold" pinta a mesa de vermelho como lembrete [TELA].

### 1.6 KDS legível a distância e com noção de tempo
Cabeçalho do ticket muda de cor com a idade (Toast, Square com limiares em minutos), número da mesa grande no canto, borda por tipo de consumo (salão/viagem), cor por modificador (alergia em vermelho), som em ticket novo e em item alterado ou anulado, contagem "all day" por item, colunas e tamanho de fonte ajustáveis, modo escuro [DOC/TELA, Toast e Square]. O expediter vê o ticket ficar verde quando todas as praças terminam (Toast) [DOC].

### 1.7 Configuração por perfil, não por aparelho
Square aplica tudo por "modo" (mesa, balcão, bar) com templates e entra no aparelho por **código de uso único** enviado por SMS [DOC]; Lightspeed tem "modo de treino" que não suja relatórios [DOC]; TouchBistro tem "modo canhoto/destro" por funcionário [TELA].

## 2. Ambiente de uso (mãos ocupadas, pressa, luz variável)

| Achado | Fonte | Princípio Tipe |
|---|---|---|
| Modo escuro em mapa e KDS | Toast, Square [TELA/DOC/MKT] | tema escuro operacional, não só estético |
| Fonte grande recomendada no KDS (Large+ em 22") | Toast [DOC] | escala tipográfica própria para telas de cozinha |
| Gestos (segurar para modificar, deslizar para juntar) | TouchBistro [TELA] | só como atalho; sempre ter botão equivalente (acessibilidade) |
| Som em ticket novo e alterado | Toast, Square, TouchBistro [DOC/TELA] | som com opção de desligar e reforço visual |
| Alvo de toque | não verificado | adotar no mínimo 48 px (Android) e 56 px nas ações primárias do salão e KDS [INF, guias de plataforma] |

## 3. Princípios de design para a Tipe, mapeados ao design system

Cada princípio diz o que muda em tokens (`src/styles.css`), componentes (`src/components/ui`, `ds.tsx`) e telas. Cores, fontes, logo e mascote da Tipe ficam como estão.

| # | Princípio | Mudança no design system | Telas |
|---|---|---|---|
| P1 | **Um vocabulário de estado operacional**, com cor + texto + ícone, nunca cor sozinha | Novos tokens semânticos `--status-free`, `--status-seated`, `--status-sent`, `--status-ready`, `--status-bill`, `--status-paying`, `--status-late`, derivados de `--success`, `--warning`, `--info`, `--highlight`, `--destructive` e `--brand-primary` (sem novas cores de marca). `StatusBadge` ganha os tons `seated`, `sent`, `ready`, `bill`, `paying`, `late` | Salão, KDS, garçom, Lançamento |
| P2 | **Mesa como componente de informação densa** | Novo componente `TableTile` (número grande em Sora, pessoas, cronômetro, total em `money`, selo com iniciais do garçom, faixa de atraso) com variantes `compact` (celular/maquininha) e `detailed` (tablet/desktop) e zoom entre elas | Salão, app do garçom |
| P3 | **Ação primária fixa e contada** | Novo `ActionBar` fixo no rodapé com no máximo duas ações primárias ("Enviar · 3 itens", "Pagar") e menu `MoreActions` (Radix `DropdownMenu`) para o resto. Variante de `Button` `size="touch"` (altura mínima 56 px) | Lançamento, conta da mesa, KDS |
| P4 | **Modificador guiado** | Novo `ModifierSheet` (Radix `Sheet` em celular, `Dialog` em tablet): grupos com mínimo/máximo, obrigatório marcado, chips "Sem / Extra", preço do ajuste, "Duplicar" e "Adicionar outro"; bloqueia "Adicionar" até cumprir o obrigatório | Lançamento, garçom, cardápio digital |
| P5 | **Desfazer antes de confirmar** | Novo padrão `UndoToast` (sobre `sonner`) com 3–5 s para ações reversíveis (mudar status no KDS, remover item não enviado); `ConfirmReason` (Dialog com motivo obrigatório) para anular, cortesia, desconto, reabrir mesa | KDS, conta, caixa |
| P6 | **Permissão com escalonamento** | Novo `ManagerPinDialog` (usa `input-otp` já existente) para autorizar no próprio aparelho | Cancelamento, desconto, sangria, reabrir |
| P7 | **Tempo visível** | Novo `ElapsedTimer` com limiares por token (`--status-sent` → `--warning` → `--status-late`) e utilitário `tabular-nums` já existente em `money` | KDS, salão |
| P8 | **Tema operacional escuro** | Conjunto `.theme-ops` com fundo `--brand-secondary` (azul-marinho da marca), texto claro e estados com contraste AA; ativado por área (KDS por padrão, salão opcional) | KDS, salão noturno, bar |
| P9 | **Escala tipográfica de cozinha** | Tokens `--text-kds-table` e `--text-kds-item` (fluidos, maiores que `--text-title`) e seletor de tamanho na tela do KDS | KDS, painel de senhas |
| P10 | **Configuração por perfil de aparelho** | Componente `DeviceProfilePicker` (Salão, Balcão, Bar, Cozinha) e entrada por código curto | Onboarding, login de aparelho |
| P11 | **Densidade adaptativa** | Utilitários `density-comfortable` e `density-compact` (espaçamento e altura de linha) em vez de layouts diferentes por aparelho | Relatórios, caixa, cardápio |
| P12 | **Estado vazio honesto e acionável** | Manter `EmptyState` e `StatCard empty` do `redesign-premium`; acrescentar ação primária ("Abrir caixa", "Cadastrar primeiro item") | Todas |

## 4. Impacto por tela (resumo)

| Tela | Princípios | Esforço |
|---|---|---|
| Salão (mapa) | P1, P2, P7, P8 | M |
| Lançamento (PDV) | P3, P4, P5 | M |
| Conta da mesa | P3, P5, P6 | P |
| KDS | P1, P5, P7, P8, P9 | M |
| App do garçom (celular/maquininha) | P2, P3, P4, P11 | M |
| Caixa | P5, P6, P11 | P |
| Onboarding e login de aparelho | P10 | P |

## 5. O que não copiar

Identidade visual, layout integral e gestos patenteados (o gesto de juntar assentos do TouchBistro tem patente US 9514427, `notas/touchbistro.md`). Também não adotar: três botões de envio (Send/Stay/Hold) como padrão, porque exigem treino; recarga manual após mudar configuração (Lightspeed); dependência de hardware proprietário.

## 6. Pré-requisito

Os tokens semânticos e `ds.tsx` estão no ramo `redesign-premium`, fora do `main`. Os princípios acima pressupõem que esse ramo seja reaplicado sobre o `main` primeiro (ver `09-ROADMAP-EVOLUCAO-TIPE.md`, fase 0).

## 7. Conferência visual pela REA (20/10/2026)

Capturas de página inteira feitas com `capture_web_screenshot` da REA em abas abertas no Chrome do usuário (área visível esticada até a altura do artigo, sem executar script da página). Imagens guardadas fora do repositório. Nesta seção, `[TELA-REA]` = visto na imagem do produto dentro do artigo oficial.

| Artigo (atualização) | Resultado |
|---|---|
| Toast · Manage Tables With Toast POS (17/09/2026) | capturado, com telas |
| Toast · Customize the Appearance of KDS Tickets (30/09/2026) | capturado, com telas |
| Lightspeed K · Understanding the Tables screen | capturado, com tela |
| Square · Create and edit modifiers | capturado, com telas do painel |
| Square · Create a floor plan; Complete and recall orders with Square KDS | capturados; **não têm imagem de tela**, só texto (as afirmações `[TELA]` da Square sobre mapa e KDS continuam vindo do texto) |
| Lightspeed · Adding orders in Table Service mode | não capturado: imagem acima do limite de 10 MB da REA |
| TouchBistro · Taking Orders; Using the KDS | não capturado: a REA recusou as abas |

### 7.1 O que as imagens confirmam

- **Toast, mapa de mesas** [TELA-REA]: tela escura por padrão; abas de área em pílula ("Main dining room / Bar / Patio"); cada mesa ocupada mostra pessoas, cronômetro, total e nome do garçom; mesas coloridas em verde, vermelho e ocre; mesa de outro garçom em cinza escuro; mesa livre com **borda tracejada**; formatos redondo, quadrado e retangular. Confirma P1, P2 e P8.
- **Toast, KDS** [TELA-REA]: cabeçalho do ticket com número da mesa ou conta grande à esquerda e cronômetro à direita; selo vermelho **"NOT PAID"** no ticket; marca verde por item concluído; o fundo do ticket fica verde quando tudo foi entregue; modificador em vermelho por padrão e com fundo de destaque configurável ("Rare" em pílula vermelha); borda laranja para viagem/entrega; texto em P, M, G, GG. Confirma P7, P9 e a recomendação de mostrar "pago pelo QR" no ticket.
- **Square, modificadores** [TELA-REA]: no cadastro, cada opção tem **nome para a cozinha**, preço, "ocultar online", **pré-seleção** e **estoque** ("In stock"); regras "exigir seleção" e "permitir mais de uma"; chave "modificadores conversacionais" (Adicionar, Extra, Sem). Confirma P4.

### 7.2 O que as imagens acrescentam

- **Toast tem um painel lateral "Minhas mesas / Outras mesas"** ao lado do mapa: lista com selo colorido da mesa, resumo dos itens, cronômetro, pessoas, número de contas e total. Ele compara mesas sem abrir nenhuma e pode ser escondido. No celular (Toast Go 2) a mesma lista vira a tela principal [TELA-REA].
- **Toast tem barra de ações fixa no topo do mapa**: "Novo pedido" (sem mesa), "Todas as contas", "Buscar conta" (teclado numérico grande) e "Trocar usuário". Faixa vermelha avisa quando o restaurante está em **modo de teste** [TELA-REA].
- **Lightspeed usa tema claro** e mostra **uma informação por vez** no bloco da mesa, escolhida num seletor "Pessoas / Total / Tempo / Status"; os assentos aparecem como pontos (preto = ocupado, cinza = livre); quem é dono da mesa aparece num selo pequeno no canto (ícone verde = minha, letra laranja = de outro); há indicador vermelho de conexão ao lado de "Sair" [TELA-REA]. Isso corrige a seção 1.1: a cor de dono é um **selo**, não o bloco inteiro.

### 7.3 Ajustes no design system da Tipe

| Princípio | Ajuste |
|---|---|
| P2 `TableTile` | Variante `compact` segue o Lightspeed: número, cor de estado e **uma** métrica escolhida num seletor (Tempo · Total · Pessoas · Pagamento). Variante `detailed` segue a Toast (quatro dados). Mesa livre com borda tracejada, sem cor de preenchimento. Selo do garçom no canto, não na cor do bloco |
| Novo `TableListPane` | Lista "Minhas mesas / Outras mesas" ao lado do mapa no tablet e como tela inicial no celular, com o mesmo token de estado do `TableTile` |
| P3 `ActionBar` | No mapa, ações globais no topo ("Novo pedido", "Buscar conta", "Trocar usuário"); no lançamento, ação primária no rodapé como já previsto |
| P7 / KDS | Selo **"Pago pelo QR"** e **"Não pago"** no cabeçalho do ticket; marca por item concluído; fundo de ticket concluído em `--status-ready` |
| P4 `ModifierSheet` | Cadastro com "nome para a cozinha", pré-seleção, estoque por opção, mínimo e máximo |
| P8 tema | `.theme-ops` como padrão no KDS e no mapa do tablet, com troca para claro (Toast escuro, Lightspeed claro: os dois existem e o usuário escolhe) |
| Novo | Faixa de **modo de teste** em toda a operação quando o restaurante estiver em homologação, coerente com a regra de não simular pagamento em produção |
