# Padrão visual: Central e Gestão andam juntas

Regra do Roberto (17/11/2026): a Central Tipe e o Tipe Gestão têm o mesmo visual e se movem juntos. Mudou um, muda o outro.

Os dois usam o mesmo `Shell` (`src/components/tipe/painel/Shell.tsx`) e os mesmos componentes de `painel/ui` (Kpi, Painel, Tabela, Segmentado, StatusBadge, Esqueleto, Aviso). Ficam iguais por construção:

- menu lateral agrupado, busca (Ctrl+K), botão Sair, avatar e função da pessoa;
- cartão de contexto no topo do menu (Gestão: logo e nome do restaurante; Central: marca Tipe e papel);
- Lebre flutuante com sugestões;
- aparência em tema claro/escuro, espaçamentos e cores pelos tokens do tema (nunca cor fixa).

Ao criar tela nova em qualquer um dos dois: use `painel/ui`, não crie tabela, cartão ou aba próprios. O teste `padrao-paineis.test.ts` falha se um dos dois deixar de usar o `Shell` ou a Lebre.
