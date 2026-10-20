# 09 — Roadmap de evolução da Tipe

Data: 14/10/2026. Base: ranking em `08-TOP-50-FUNCIONALIDADES.md`, auditoria em `01-AUDITORIA-TIPE.md`, arquitetura em `07-ARQUITETURA-E-INTEGRACOES.md`.

Regra de foco: **no máximo 3 frentes simultâneas** nos próximos 90 dias. Tudo é evolução sobre TanStack Start + Lovable Cloud + Pagar.me; migrações ficam para depois desta missão e passam pela revisão normal antes de chegar ao `main`.

## Fase 0 (semanas 1–3): consolidar o que já está escrito

Antes de qualquer frente nova, trazer para o `main` o código que existe fora dele. Sem isso, cada frente reescreve o que já foi feito.

| Entrega | Por quê |
|---|---|
| Reaplicar `redesign-premium` (tokens, `ds.tsx`, telas) sobre o `main` | todo o trabalho de tela das frentes usa esses componentes |
| Reaplicar do ramo `colibri`: garçom no celular, KDS por pedido com som, painel de senhas | itens 4 e 16 do ranking; código pronto |
| Deixar para depois do ramo `colibri`: totem e pedido do cliente pela mesa | não são PDV confiável; entram na fase 3 |

As migrações `0019`–`0021` do ramo `colibri` colidem em número com as do `main`; precisam ser renumeradas e reescritas sobre o esquema atual (`01-AUDITORIA-TIPE.md` §4).

## Plano de 90 dias: três frentes

### Frente A: PDV confiável (P0)
O que entra: idempotência do lançamento; KDS em tempo real; caixa com esperado calculado no servidor e por forma de pagamento; fechamento do dia com checklist bloqueante; **modificadores estruturados**; desconto e acréscimo com motivo; papel de gerente com aprovação por PIN.

Por quê: são as lacunas que fazem um restaurante desistir de um PDV na primeira semana (pedido duplicado, cozinha atrasada, caixa que não bate, item sem ponto). Nenhuma depende de terceiros.

### Frente B: Salão vivo (P0 + P1 de diferenciação)
O que entra: mapa com estado do pedido (enviado, pronto) e **estado do pagamento pelo QR** (pagando, pago); tempo de mesa e alerta; KDS com cor por idade, desfazer e "pago" no ticket; notificações para a equipe e chamado do cliente ("pediu a conta"); dashboard com vendas de hoje e alertas.

Por quê: é onde a Tipe une pagamento, atendimento e cozinha numa tela só, o que nenhum PDV americano analisado faz com o pagamento pelo QR. É a demonstração de venda das duas formas.

### Frente C: Brasil obrigatório (P0/P1)
O que entra: **agente local de impressão** (produção e pré-conta); **NFC-e via parceiro** (escolher entre Focus NFe e NFE.io, dados fiscais no cadastro, emissão assíncrona com fila); **descoberta comercial e técnica da integração Saipos** (forma b), em paralelo, sem código até ter acesso à API.

Por quê: sem impressão e nota o Tipe completo não é levado a sério; sem integração com um PDV brasileiro, a forma (b) não tem cliente.

### Sequência dentro dos 90 dias

| Semanas | Frente A | Frente B | Frente C |
|---|---|---|---|
| 1–3 | Fase 0 (reaplicar ramos) | Fase 0 (reaplicar ramos) | escolha do emissor fiscal; contato Saipos |
| 4–6 | idempotência, KDS Realtime, caixa no servidor | mapa com estados do pedido e do QR, tempo de mesa | agente de impressão (protótipo com 2 impressoras comuns) |
| 7–9 | modificadores (cadastro, lançamento, KDS, conta) | KDS: cor por idade, desfazer, pago; notificações | NFC-e em homologação |
| 10–13 | desconto, papel gerente, PIN, fechamento bloqueante | chamado do cliente, dashboard | NFC-e em produção piloto; adaptador Saipos se a API for liberada |

## Depois dos 90 dias

| Fase | Conteúdo | Por que depois |
|---|---|---|
| 2 (P1) | comanda individual e entidade **conta**; juntar mesas e transferir itens; planta do salão; app do garçom em maquininha smart; resumo diário imutável e exportação; relatórios completos; módulos por plano; rateio da taxa de serviço (após parecer) | a entidade conta é uma migração estrutural; melhor fazê-la com o PDV já estável |
| 3 (P2) | offline (lançar e KDS); combos; cursos; estações configuráveis; ficha técnica e baixa teórica; conciliação de repasses; iFood; TEF; CRM com consentimento; pedido do cliente pela mesa e totem (ramo `colibri`) | dependem de modificadores, idempotência e conta |
| 4 (P3) | multiunidade; compras e fornecedores; escala e ponto (parceiro); cashback em crédito; expediter | segmento de redes e ERP completo |

## O que deixar para depois, explicitamente

Contabilidade, contas a pagar, DRE, escala, ponto e folha: são produtos inteiros que os ERPs americanos vendem por US$ 350–750 por unidade/mês (`03-BENCHMARK-ERP-USA.md`). A Tipe deve ser a melhor **fonte de dados** para eles, não um concorrente.

## Decisões do dono (20/10/2026)

1. Sem cartão digitado na conta. Formas de pagamento da conta: Apple Pay, Google Pay, Pix e "pagar no estabelecimento" com baixa manual. Habilitar Apple Pay e Google Pay no Pagar.me entra como dependência da frente B.
2. A gorjeta extra 70/30 continua como está; o risco da Lei 13.419/2017 fica registrado.
3. O PR desta pesquisa fica aberto como referência, sem merge por enquanto.

Andamento: a fase 0 já foi executada em outra frente (PRs #5 a #9, em revisão em 20/10/2026).
