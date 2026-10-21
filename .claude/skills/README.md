# Skills do Claude Code para o Tipe

Estas skills ficam no repositório para que qualquer sessão do Claude Code (no Mac ou na nuvem) que abrir o Tipe as encontre. São cópias sem alteração dos repositórios públicos abaixo, cada uma com a licença original na própria pasta.

Regra da casa: quando uma skill conflitar com as decisões do Tipe (logo, cores e tipografia oficiais, ferramentas gratuitas, Apple Pay e Google Pay visíveis, textos em português claro), as decisões do Tipe vencem.

| Skill | Frente do Tipe | Origem (commit) | Licença |
| --- | --- | --- | --- |
| design-taste-frontend (v2) | Landing e telas | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) `6010f91` | MIT |
| frontend-design | Landing e telas | [anthropics/skills](https://github.com/anthropics/skills) `dbd4588` | ver LICENSE.txt |
| webapp-testing | Testes de tela (Playwright) | [anthropics/skills](https://github.com/anthropics/skills) `dbd4588` | ver LICENSE.txt |
| ui-ux-pro-max | Landing e telas | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) `623a9a9` | MIT |
| design-system | Tokens da marca | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) `623a9a9` | MIT |
| graphify | Mapa do código | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) `847a93f` | MIT |
| performance-optimization | Desempenho | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| security-and-hardening | Pagamentos, Lebre IA | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| deprecation-and-migration | Saída da Lovable | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| ci-cd-and-automation | Deploy no Cloudflare | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| context-engineering | Lebre IA | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| shipping-and-launch | Lançamentos | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | MIT |
| grill-me | Afinar ideias | [mattpocock/skills](https://github.com/mattpocock/skills) `5beb35b` | MIT |
| to-spec | Especificar regras | [mattpocock/skills](https://github.com/mattpocock/skills) `5beb35b` | MIT |
| domain-modeling | Regras de negócio | [mattpocock/skills](https://github.com/mattpocock/skills) `5beb35b` | MIT |

Observações:

- graphify instala o pacote Python `graphifyy` na primeira execução e grava `graphify-out/` na raiz. Não configure chave do Gemini para ele sem autorização.
- design-taste-frontend v2 e ui-ux-pro-max trazem scripts (Node e Python) que rodam localmente; o buscador de imagens da v2 usa só acervos gratuitos (Openverse, Wikimedia, museus, NASA).
- O pacote superpowers não está aqui porque já vem instalado nas sessões da nuvem.
