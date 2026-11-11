# Simuladores acompanham a plataforma

Regra do fundador (10/11/2026): toda vez que o sistema real mudar, os simuladores públicos mudam junto.

Simuladores: `/simulador` (`src/components/tipe/SimulatorExperience.tsx`, Tipe Pay), `SimuladorOrder.tsx` (Tipe Order), `calculadora/SimulacaoMesas.tsx` e `/demo`.

Checklist ao mudar o fluxo de conta, pagamento, gorjeta, taxa de serviço, nomes de produto ou status de integração:
1. Fluxo: dividir, pagar, depois gorjeta extra como segundo pagamento (3/5/8% e "Outro valor"), avaliação por último.
2. Métodos: Pix, Apple Pay, Google Pay (Em piloto) e pagar no estabelecimento. Sem cartão digitado.
3. Gorjeta 70% garçom / 30% Tipe (`src/lib/tipe/rules.ts`).
4. Nomes oficiais: Tipe Pay, Order, Cozinha, Equipe, Gestão, Reserva (em breve), Lebre.
5. Dados do simulador são fictícios e isolados; nunca tocam dados reais.
