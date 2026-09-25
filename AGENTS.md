<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve a identificação do cliente localmente por restaurante e mesa, para que novas leituras do mesmo QR retomem a conta sem perguntar o nome novamente.
- A atividade da mesa mostra somente pagamentos da conta; gorjetas extras ficam fora desse histórico por não integrarem a conta do restaurante.
- Pagamentos digitais concluídos são registrados como aprovados; somente pagamentos no estabelecimento aguardam confirmação manual.
