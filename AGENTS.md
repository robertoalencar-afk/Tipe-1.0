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
- A identificação inicial solicita nome e sobrenome; os mascotes oficiais aparecem contextualizados nas telas de espera e agradecimento.
- Na conta, não oferecer cartão direto; destacar pagamento no estabelecimento com dinheiro ou maquininha. Mascotes aparecem apenas em momentos contextuais.
- O fluxo do cliente é sempre itens escolhidos → meio de pagamento → pagamento; pedidos não identificam a pessoa, mas pagamentos exibem cliente, itens, valor e horário.
- Ao reabrir o QR da mesma mesa, recuperar a identificação antes de renderizar a etapa; quando não houver itens disponíveis nem pagamentos pendentes, mostrar a mesa encerrada.

- Staff access: roles in public.user_roles (founder/owner/cashier/waiter, per restaurant); payment confirmation only via resolve_table_payment RPC — prevents privilege escalation.
- Table reopen archives payments to archived_payments instead of deleting — keeps full history.
- Restaurant area lives at /$restaurante (client-only, login required); customer table at /$restaurante/$mesa (code like mesa12, optional ?t= QR token). Why: each restaurant has its own address and table tokens.
- Bill items come only from the simulated PDV (pdv_* tables, pdv_launch_order RPC upserting table_bill_items); no hardcoded mock bills. Why: manual simulation now, real Saipos/TOTVS sync later.
- Public simulator `/simulador` uses browser-local demo state and fixed Mesa 12 data; it must never read or mutate restaurant PDV data. Why: the sales demo must remain repeatable and isolated from restaurant operations.
