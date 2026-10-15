# Imagens da landing

## Como trocar ou adicionar uma foto
Coloque os arquivos em `src/assets/fotos/` com o nome `<cena>-<largura>.<formato>`. O componente `EditorialPhoto` monta o `srcset` sozinho.

Cenas: `garcom` (hero), `amigos`, `casal`, `salao` (para quem atende), `gestor`.
Larguras sugeridas: 640, 1080, 1600. Formatos: `avif` e `webp`, mais um `jpg` como fallback.
Exemplo: `garcom-640.avif`, `garcom-1080.avif`, `garcom-1600.avif`, `garcom-1080.webp`, `garcom-1080.jpg`.

Sem arquivo para uma cena, a página mostra a lebre da Tipe sobre um fundo da marca.

## Registro de origem e licença
| Cena | Arquivo | Origem (URL) | Autor | Licença | Data | Onde aparece |
|---|---|---|---|---|---|---|
| — | — | Nenhuma foto adicionada ainda | — | — | — | — |

Regras: só fotos próprias, de ensaio contratado ou de bancos com licença comercial (Unsplash, Pexels). Nada de pessoas geradas por IA apresentadas como clientes, garçons ou donos reais.

## Fotos geradas por IA (15/10/2026)

As cinco cenas (garcom, amigos, casal, salao, gestor) foram criadas com o modelo de imagem do Google Gemini (gemini-3-pro-image), a pedido do Roberto, com a chave da conta dele. São pessoas fictícias, não clientes reais. Originais e roteiro de cada cena: /mnt/project-files/landing-v3/fotos-ia/ (gerar.py). Versões otimizadas em src/assets/fotos/ (avif, webp e jpg em 640 px e na largura original).
