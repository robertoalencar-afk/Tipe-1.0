# 11 — Resumo executivo

Data: 14–15/10/2026 · Branch `research/us-benchmark-pdv-erp` · Base `main` `e6813a2`.

"Melhor" segue os critérios das seções 8 e 11.2 do prompt (velocidade operacional, clareza, adequação à Tipe e ao Brasil), não preferência pessoal. Confiança: **alta** = várias fontes `[TELA]/[DOC]`; **média** = documentação + inferência; **baixa** = marketing ou terceiros.

**1. Os cinco PDVs americanos mais úteis.** **Toast**, para o mapa com estado da cozinha e o KDS; **Lightspeed K-Series**, para a API de pagamento em conta aberta (modelo da forma b) e o offline documentado; **Square**, para modificadores, onboarding e desfazer no KDS; **SpotOn**, para gorjetas, equipe e fechamento do dia; **TouchBistro**, para a ergonomia de toque e o lançamento por pessoa. Confiança alta. [02 §1](02-BENCHMARK-PDV-USA.md)

**2. Os três ERPs/backoffices mais úteis.** **Restaurant365** (formato do resumo diário e da integração com PDV), **MarginEdge** (P&L diário automático para o dono pequeno) e **7shifts** (rateio de gorjetas). A MarketMan fica como referência de estoque. Confiança média. [03](03-BENCHMARK-ERP-USA.md)

**3. Melhor experiência de PDV.** Lightspeed Register: item com modificador em cerca de 3 toques, "Enviar · n itens" e divisão dentro da tela de pagamento. Confiança média: os passos vêm da ajuda oficial, a soma de toques é inferida. [02 §4](02-BENCHMARK-PDV-USA.md)

**4. Melhor dashboard.** Nenhum PDV se destaca; relatórios são reclamação recorrente em Toast, Square e TouchBistro. A melhor referência é a MarginEdge (números de ontem chegando sozinhos de manhã). Confiança média. [04 §8](04-MATRIZ-FUNCIONALIDADES-TIPE.md)

**5. Melhor atendimento por mesa.** Toast: a cor da mesa mostra o estado do pedido, com retorno do KDS, e o bloco mostra pessoas, tempo, total e garçom. Confiança alta. [05 §1.1](05-DESIGN-SYSTEM-BENCHMARK.md)

**6. Melhor KDS.** Toast em recursos (cor por idade, expediter, pago/não pago); Square em operação (desfazer de 3 s, timers configuráveis). Confiança alta. [04 §4](04-MATRIZ-FUNCIONALIDADES-TIPE.md)

**7. Melhor gestão financeira.** No PDV, o End Day da SpotOn, que não deixa fechar o dia com conta aberta. No backoffice, o resumo diário da Restaurant365. Confiança média. [02 §6](02-BENCHMARK-PDV-USA.md)

**8. Melhor estoque.** MarketMan para operação (pedido, recebimento, contagem); Restaurant365 para custo real × teórico. A evidência de tela é fraca: a ajuda da MarketMan não carregou. Confiança baixa a média. [03](03-BENCHMARK-ERP-USA.md)

**9. Melhor gestão de garçons e gorjetas.** SpotOn Teamwork com DayCheck (gorjeta aprovada pelo gerente e liberada no fim do turno) e o tip pooling do 7shifts. No Brasil, a regra é a Lei 13.419/2017. Confiança média. [notas/spoton.md](notas/spoton.md)

**10. Melhor design geral.** Toast, pela densidade legível do mapa e do KDS. Ressalva: a avaliação vem de descrições em artigos de ajuda, não de capturas; a conferência visual pela REA ficou pendente. Confiança média. [05](05-DESIGN-SYSTEM-BENCHMARK.md)

**11. O que a Tipe já tem.** Funcional: lançamento com busca e mais vendidos, cardápio com CSV, cancelamento com motivo, transferência de mesa, KDS por item, caixa com sangria e reforço, taxa de serviço, divisão de conta pelo QR (melhor que a Toast), relatórios com CSV, fechamento do dia, gorjetas e saque, backoffice com 2FA, plano por mesa aplicado no banco. Parcial: mapa (só grade), caixa (o esperado é calculado no navegador), papéis (4 fixos), integração externa (só API genérica). Em ramo: garçom no celular, KDS por pedido, senhas. Confiança alta. [01](01-AUDITORIA-TIPE.md)

**12. O que falta de importante.** Modificadores, comanda individual, impressão, NFC-e, idempotência do lançamento, KDS em tempo real, estado da cozinha no salão, desconto com permissão, papel de gerente, offline e integração com um PDV brasileiro. Confiança alta. [01 §6](01-AUDITORIA-TIPE.md)

**13. As dez melhorias mais rápidas** (esforço P, sem dependência externa):
1. lançamento idempotente;
2. KDS em tempo real;
3. esperado do caixa calculado no servidor;
4. fechamento do dia bloqueante;
5. estados do pagamento pelo QR no mapa;
6. cor por estado do pedido e tempo de mesa;
7. cor por idade e alerta de atraso no KDS;
8. desfazer e recall no KDS;
9. notificações para a equipe;
10. chamado do cliente.

Confiança alta. [08](08-TOP-50-FUNCIONALIDADES.md)

**14. As dez de maior potencial comercial** (maior nota em receita e diferenciação):
1. integração Saipos;
2. integração Colibri;
3. estados do QR no salão;
4. garçom no celular;
5. NFC-e;
6. comanda individual;
7. modificadores;
8. app em maquininha smart;
9. resumo diário pela Lebre;
10. módulos por plano.

O cartão na conta também pontua alto, mas depende de revogar uma regra do produto. Confiança média. [08](08-TOP-50-FUNCIONALIDADES.md)

**15. O que desenvolver primeiro (90 dias, três frentes).** Começa por uma fase 0 que reaplica os ramos `redesign-premium` e `colibri`. Depois, três frentes: **A. PDV confiável** (idempotência, KDS ao vivo, caixa no servidor, modificadores, desconto e PIN de gerente); **B. Salão vivo** (mapa com estado do pedido e do QR, KDS operacional, notificações, chamado do cliente, dashboard); **C. Brasil obrigatório** (agente de impressão, NFC-e por parceiro, descoberta da integração Saipos). Confiança média. [09](09-ROADMAP-EVOLUCAO-TIPE.md)

**16. O que deixar para depois.** Contabilidade, contas a pagar, DRE, escala, ponto, folha, compras e multiunidade. Offline, iFood e TEF ficam para a fase 3. A Tipe deve ser fonte de dados para ERPs, não concorrente deles. Confiança alta. [03 §4](03-BENCHMARK-ERP-USA.md)

**17. Arquitetura que melhor aproveita o código atual.** Manter TanStack Start, Lovable Cloud e Pagar.me; não há limitação técnica que justifique trocar peça. O que muda:
- criar a entidade **conta**, com máquina de estados no mesmo padrão de `payment-state.ts`;
- tornar o lançamento idempotente;
- publicar o KDS no Realtime;
- calcular o caixa no servidor;
- adicionar papéis e permissões;
- usar fila (outbox) também para NFC-e e impressão;
- PWA com fila local para o offline.

Cada mudança está marcada se exige migração. Confiança alta. [07](07-ARQUITETURA-E-INTEGRACOES.md)

**18. Como a Tipe vira alternativa atraente no Brasil.** **(a) Tipe completo:** fazer o básico brasileiro (NFC-e, impressão, comanda, maquininha) com a velocidade e o design dos americanos. O diferencial que ninguém tem é o pagamento pelo QR integrado ao salão e à cozinha. Somam-se preço por mesa sem fidelidade longa e suporte no horário de serviço, que são as maiores dores dos concorrentes. **(b) Só fechamento de conta:** repetir o modelo Goomer/sunday sobre PDVs brasileiros, começando pela Saipos (API pública) e pelo Colibri (parceria). O contrato a pedir é o da Lightspeed: ler a conta da mesa, postar o pagamento como meio alternativo e receber webhook. Confiança média: nenhum PDV brasileiro documenta essa API publicamente. [04b](04b-REALIDADE-BRASIL.md)

**19. Melhorias de design prioritárias.** Um vocabulário único de estado operacional (cor, texto e ícone), `TableTile` denso, `ActionBar` com "Enviar · n itens", `ModifierSheet` guiado, desfazer em 3 s, PIN de gerente, tema escuro operacional e escala tipográfica de cozinha. Tudo sem mudar as cores, fontes, logo e mascote da Tipe. Confiança média. [05 §3](05-DESIGN-SYSTEM-BENCHMARK.md)

**20. Plano técnico concreto.** O backlog tem épicos e histórias com critérios verificáveis e os arquivos afetados: 0 (consolidar ramos), A (PDV confiável), B (salão vivo), C (Brasil obrigatório) e D (P1 comercial). As migrações estão listadas em ordem em `07` §4. Confiança alta. [10](10-IMPLEMENTATION-BACKLOG.md)

## Conflitos com decisões vigentes (apontados, não contornados)

- **Gorjeta extra 70/30:** mantida. A Lei 13.419/2017 diz que gorjeta não é receita do empregador; recomenda-se parecer jurídico e mostrar os 30% como taxa da plataforma em linha separada. [04b §3](04b-REALIDADE-BRASIL.md)
- **Cartão na conta pelo QR:** o `AGENTS.md` proíbe oferecer digitação de cartão na conta. A recomendação fica fora do plano até o dono decidir.
- **Sem pagamento simulado em produção** e **founder sem acesso operacional:** respeitados em todas as recomendações.
