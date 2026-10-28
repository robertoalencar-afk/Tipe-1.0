# Tipe Guest na landing (Fase 8) e página Restaurante Fundador

Branch `guest/landing`, base `correcao-visual-v6` (PR #30, landing V6.1/V7). Sem migração.

## O que mudou

| Onde | O quê |
|---|---|
| `/produtos/guest` | Página própria (`src/components/tipe/site/guest/PaginaGuest.tsx`), ligada por `ProdutoPagina` quando o slug é `guest` (mesmo padrão que a branch `order/landing` usa para o Order). Status continua **Em breve**. |
| `src/components/tipe/site/produtos.ts` | Entrada `guest`: nova narrativa ("Sua próxima experiência começa aqui."), resumo, foto do topo (`bistro`, já no repositório), FAQ. Isso atualiza sozinho o menu Produtos, o trilho de cards da home e o rodapé. |
| `CardProduto.tsx` | Card do Guest passa a mostrar a tela **real** de avaliação com o aviso "Disponível hoje: avaliação depois de pagar. Descobrir e reservar, em breve." (antes: card ilustrativo). |
| `/restaurante-fundador` | Página comercial nova (`src/routes/restaurante-fundador.tsx`). Nunca `/fundador` (área da equipe). Link a partir da página do Guest e no rodapé (Empresa). Também no `sitemap.xml`. |
| `produtos.$produto.tsx` | Title e description próprios para o Guest. |
| Leads | `submitInterestLead` (novo, aditivo) em `src/lib/tipe/leads.functions.ts` + schema puro em `src/lib/tipe/interest-lead.ts`. O `submitLead` e o formulário do `/teste-gratis` não mudaram. |

## Estrutura da página do Guest

1. **Topo**: foto gastronômica (bistrô, vinho, vela) + celular com telas REAIS de hoje (pagamento realizado → avaliação), com legenda dizendo isso. H1 único. CTAs "Quero ser avisado" (âncora `#avisar`) e "Sou restaurante" (`/restaurante-fundador`). Três selos-âncora: Disponível hoje / Planejado no Guest / Demonstração.
2. **Disponível hoje** (`#hoje`): 4 telas reais de `src/assets/telas-reais/` (nome lembrado, pago, gorjeta, avaliação). Aviso: a avaliação hoje vai só para o restaurante; publicar na descoberta é futuro e só com consentimento.
3. **Planejado no Guest** (`#planejado`): Descobrir, Reservar, Avaliações na descoberta, com fotos (sem telas) e selo "Planejado". Salvos, histórico e relacionamento citados como planejados.
4. **Demonstração** (`#demonstracao`): bloco tracejado dizendo que a demonstração ainda está em construção e que as telas entram ali quando existirem, rotuladas "Demonstração · dados fictícios".
5. **Junto com o Tipe Pay**: jornada Descobrir → Escolher → Reservar → Visitar → Pagar → Avaliar → Voltar, cada passo com o selo correto. Texto deixa claro que o Tipe Pay não depende do Guest (Apple Pay, Google Pay, Pix ou no estabelecimento, sem instalar nada).
6. **Benefícios** para cliente e restaurante, item a item com selo hoje/planejado.
7. **Quando chega**: "Na próxima fase da Tipe." Sem data. Card do Restaurante Fundador ao lado.
8. **Quero ser avisado** (`#avisar`): formulário com consentimento LGPD.
9. Dúvidas (4, todas do Guest) e trilho de produtos (rodapé "Focinho vivo" vem do `SitePage`).

### Carrossel de telas do Guest

**Não entra agora.** Nenhuma das telas pedidas (Home, Busca, Mapa, Perfil, Disponibilidade, Reserva, Confirmação, Avaliações, Salvos, Histórico) existe ainda. Quando a demonstração do Guest (Fase 6) existir, capture as telas dela com a mesma técnica de `src/assets/telas-reais/` (390 e 780 px, webp) e coloque o carrossel no lugar do bloco `Demonstracao` em `PaginaGuest.tsx`, com o rótulo "Demonstração · dados fictícios".

## Formulários e leads

- Função `submitInterestLead` (server function), origem `tipe-guest` ou `restaurante-fundador`, grava em `restaurant_leads` (a tabela de `/admin/leads`), com o mesmo limite por IP do `submitLead` (5 por 10 min, chave `interest:`).
- Campos: Guest pede nome, e-mail e cidade (opcional). Fundador pede nome, e-mail, restaurante, WhatsApp e cidade (opcional).
- Consentimento: caixa **desmarcada**, obrigatória, com a finalidade escrita (`FINALIDADE` em `interest-lead.ts`) e link para a Política de Privacidade. Segunda caixa, opcional e desmarcada, para "outras novidades" (`marketing_opt_in`).
- O que é gravado: `origin_page` = origem; `privacy_accepted_at` = agora; `notes` = interesse + finalidade aceita com versão do texto (`VERSAO_CONSENTIMENTO`) + escolha de novidades.
- Sucesso só aparece quando o servidor responde `ok`; erro de rede/servidor mostra mensagem e mantém os dados. Campo-isca contra robôs.
- Fundador dispara o e-mail interno `lead-notification` (o mesmo do teste grátis), com "Restaurante Fundador · <nome>". O aviso do Guest não envia e-mail agora.

### Pendências de dados (sem migração nesta fase)

- `restaurant_name` é NOT NULL: o aviso do Guest grava o rótulo fixo `Aviso Tipe Guest (cliente final)`. Recomendado, em fase futura: coluna `lead_kind` (restaurante/cliente) ou tabela própria para avisos de cliente final, e filtro por origem em `/admin/leads` e no CRM.
- O envio do e-mail "o Tipe Guest chegou" para quem se cadastrou não existe ainda: a lista fica em `/admin/leads` filtrável por `origin_page = tipe-guest`.
- Textos de consentimento precisam de revisão jurídica.

## Regras respeitadas

Marca só "Tipe"/"Tipe Guest" (nunca "Tipe 2.0"); "a Tipe" no feminino; sem links de loja; sem reserva real; sem data; sem números inventados; sem "vagas limitadas"/contagem; nenhum preço, desconto ou benefício do Fundador ("em definição"); Apple Pay e Google Pay citados como métodos que funcionam.

## Relação com `order/landing` (#33)

Não foi mesclada. Para reduzir conflito, `ListaDuvidas` e `Relacionados` foram exportados de `ProdutoPagina.tsx` com o mesmo texto que a `order/landing` usa. Conflitos esperados no merge, pequenos: a linha de desvio por slug em `ProdutoPagina` (lá é `order`, aqui `guest`), o mapa `SEO` em `produtos.$produto.tsx` (as duas branches criam um; basta juntar as chaves) e o enum de `originPage` não é tocado aqui. O estado de lançamento configurável (`useLancamento`, migração 0028) não é usado: o Guest segue com `status: "em-breve"` no catálogo.
