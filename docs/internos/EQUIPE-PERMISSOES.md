# Equipe e permissões (Tipe Gestão)

Papéis: Administrador (owner), Gerente (manager, novo), Caixa, Garçom. Matriz em `src/lib/tipe/permissoes.ts` e `role_permissions` (migração 0051).

- **Banco**: gerente conta como caixa em `has_restaurant_role` (as políticas existentes valem sem reescrita); o que cita só `owner` continua só do administrador. Suspensão (`staff_members.suspended_at`) derruba papel, associação e permissões. Cross-tenant coberto em `tests/db/permissoes.sql`. 2FA mantido.
- **Servidor** (`equipe.functions.ts`): só o administrador do restaurante convida, muda papel, concede extras, suspende e remove; último administrador protegido; tudo em `staff_audit_log`.
- **Convites**: link de uso único, 7 dias, só o hash do token fica no banco, revogável, e-mail da conta precisa bater. Nada é enviado por e-mail.
- **Limite honesto**: permissões extras e a matriz são aplicadas na tela e nas funções novas de equipe. As ações antigas (editar cardápio, mesas) seguem exigindo administrador no servidor; liberar esses pontos para o gerente é a próxima etapa (PR C).
