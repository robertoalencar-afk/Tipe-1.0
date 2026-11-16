# Simuladores acompanham a plataforma

Regra do fundador (10/11/2026): toda vez que o sistema real mudar, os simuladores públicos mudam junto.

Simuladores: `/simulador` (`src/components/tipe/SimulatorExperience.tsx`, Tipe Pay), `SimuladorOrder.tsx` (Tipe Order), `calculadora/SimulacaoMesas.tsx` e `/demo`.

Checklist ao mudar o fluxo de conta, pagamento, gorjeta, taxa de serviço, nomes de produto ou status de integração:
1. Fluxo: dividir, pagar, depois gorjeta extra como segundo pagamento (3/5/8% e "Outro valor"), avaliação por último.
2. Métodos: Pix, Apple Pay, Google Pay (Em piloto) e pagar no estabelecimento. Sem cartão digitado.
3. Gorjeta 70% garçom / 30% Tipe (`src/lib/tipe/rules.ts`).
4. Nomes oficiais: Tipe Pay, Order, Cozinha, Equipe, Gestão, Reserva (em breve), Lebre.
5. Dados do simulador são fictícios e isolados; nunca tocam dados reais.

## Gorjeta e fim do fluxo (11/11)
- Gorjeta extra: sempre 3%, 5% e 8% do valor pago (5% "Sugerida"). Percentual abaixo de R$ 2,00 não é oferecido; sobra "Outro valor".
- Depois de pagar a gorjeta vem a tela "Gorjeta recebida / a equipe agradece" e só então a avaliação.
- Ao fim (mesa encerrada / voltar à mesa) aparece "Avaliar no Google" quando o restaurante cadastrou o link em Gestão.

## Acesso por função (16/11)

- Cozinha e bar usam telas com link criado pelo dono ou gerente (`/{slug}/estacao?t=`), sem conta de garçom. O garçom não começa o preparo.
- O administrador abre a mesa para um garçom específico (Gestão, ao abrir a mesa). Só esse garçom lança pedidos e libera o celular da mesa; a designação some ao fechar a conta.
- O garçom tem o modo "Maquininha" (uma mesa por linha, botões grandes) para PDV manual.
- Simuladores revisados: texto do fluxo de Mesas em `src/lib/tipe/order/modalidades.ts` (usado pelo seletor e pelo simulador da landing).
