# Plano de integrações (PDV, ERP, pagamento)

## O que já existe

- **Contrato de adaptador** `src/lib/tipe/pdv/contract.ts` (testado em `contract.test.ts`) e **registro** `registry.server.ts`.
- Adaptadores ativos: `lancamento-tipe` (PDV próprio, pelo painel) e `api-tipe` (webhook genérico, o PDV chama a Tipe). `demo.server.ts` só para testes; `_modelo.server.ts` é o molde para um fornecedor novo.
- Entrada única de itens: `pdv_ingest_event` com id de evento externo idempotente.
- **Outbox** de baixa (`outbox.server.ts`) com retentativa, pronta mas sem adaptador externo que a consuma.
- A interface nunca mostra o nome de PDV de terceiros (regra do AGENTS.md).

## Capacidades por adaptador (interface `AdaptadorPdv` em `pdv/types.ts`)

| Capacidade | Método hoje | Observação |
|---|---|---|
| Conectar, testar e desconectar credenciais | `conectar`, `testarConexao`, `desconectar` | Credenciais cifradas por restaurante |
| Listar mesas | `listarMesas` | Mapeia número da mesa ↔ id externo |
| Consultar comanda e itens | `buscarConta`, `sincronizar` | Devolvem eventos canônicos idempotentes (`EventoRecebido`) |
| Receber webhook do PDV | `validarWebhook`, `receberEvento` | Assinatura conferida antes de aceitar |
| Baixa de pagamento | `informarPagamento` (via outbox) | Meio de pagamento "Tipe" no PDV; `capacidades().devolvePagamento` diz se o PDV aceita |
| Fechar conta | `fecharConta` (opcional) | Quando o PDV permite |
| **Faltam no contrato** | — | Enviar pedido do QR/garçom ao PDV, estorno no PDV, sincronizar cardápio. Entram como métodos opcionais quando o primeiro fornecedor real exigir |
| Erros e retentativas | outbox com backoff | Falha repetida aparece no painel do restaurante |

## Escolha do primeiro adaptador brasileiro

Critério: o PDV mais citado pelos restaurantes em `restaurant_leads.pdv_system` (formulário da landing) **e** com API documentada e parceria possível. O benchmark dos EUA (PR #4) sugeriu Saipos como candidato; não há documentação nem autorização verificadas ainda. **Nenhum PDV deve ser anunciado como integrado** antes de: documentação oficial, contrato ou autorização do fornecedor, adaptador com testes de contrato e uma homologação num restaurante real.

Sem API disponível: o restaurante usa o **Lançamento TIPE** (a Tipe é o PDV da mesa) ou o garçom lança no PDV e a Tipe recebe pela API genérica. Nada de automação de tela ou acesso não autorizado.

## Pagamento

| Meio | Provedor | Situação |
|---|---|---|
| Pix dinâmico | Pagar.me v5, na conta do próprio restaurante | Em produção |
| Apple Pay / Google Pay | Pagar.me (a confirmar se aceita token de carteira no checkout transparente) | Visível na interface, recusado no servidor |
| Pagar no estabelecimento | — (baixa manual por `resolve_table_payment`) | Em produção |
| Cartão digitado | — | **Fora do escopo** (decisão de 20/10) |
| Link de pagamento (pré-pagamento) | Pagar.me | Fase posterior |

## Fiscal

Emissão de NFC-e/NF-e não é feita pela Tipe hoje. O comprovante da Tipe diz "sem valor fiscal". A nota fiscal deve vir do PDV/ERP do restaurante; uma integração fiscal própria (ex.: emissor terceirizado) só depois de análise por tipo de documento e município.
