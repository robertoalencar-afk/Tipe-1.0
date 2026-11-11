import { describe, expect, it } from "vitest";
import { GUEST_ACTIONS, guestCan, guestRoleFrom, profileFor } from "./permissoes";

const P = {
  name: "Ana Clara Souza",
  phone: "85999990000",
  email: "ana@exemplo.com",
  visits: 4,
  notes: "Prefere varanda",
  allergies: "Camarão",
  spendCents: 48000,
};

describe("matriz de permissões do Guest", () => {
  it("administrador pode tudo", () => {
    for (const a of GUEST_ACTIONS) expect(guestCan("admin", a)).toBe(true);
  });

  it("gerente só muda disponibilidade com permissão explícita", () => {
    expect(guestCan("gerente", "alterar_disponibilidade")).toBe(false);
    expect(guestCan("gerente", "alterar_disponibilidade", ["alterar_disponibilidade"])).toBe(true);
    expect(guestCan("gerente", "gerenciar_espera")).toBe(true);
  });

  it("caixa depende de autorização e nunca configura políticas", () => {
    expect(guestCan("caixa", "criar_reserva")).toBe(false);
    expect(guestCan("caixa", "criar_reserva", ["criar_reserva"])).toBe(true);
    expect(guestCan("caixa", "configurar_politicas", ["configurar_politicas"])).toBe(false);
  });

  it("garçom não gerencia espera nem vê relatórios, mesmo com concessão", () => {
    expect(guestCan("garcom", "gerenciar_espera", ["gerenciar_espera"])).toBe(false);
    expect(guestCan("garcom", "ver_relatorios", ["ver_relatorios"])).toBe(false);
    expect(guestCan("garcom", "criar_reserva")).toBe(false);
  });

  it("sem papel, nada", () => {
    expect(guestCan(null, "ver_reservas")).toBe(false);
    expect(guestRoleFrom([])).toBeNull();
  });

  it("dono vira administrador; o papel mais alto vence", () => {
    expect(guestRoleFrom(["waiter", "owner"])).toBe("admin");
    expect(guestRoleFrom(["waiter", "cashier"])).toBe("caixa");
  });

  it("garçom vê só o mínimo do cliente", () => {
    expect(profileFor("garcom", P)).toEqual({
      name: "Ana",
      allergies: "Camarão",
      occasions: undefined,
    });
  });

  it("caixa não vê e-mail nem gasto; gerente não vê gasto", () => {
    expect(profileFor("caixa", P)).not.toHaveProperty("email");
    expect(profileFor("caixa", P)).not.toHaveProperty("spendCents");
    expect(profileFor("gerente", P)).not.toHaveProperty("spendCents");
    expect(profileFor("admin", P).spendCents).toBe(48000);
  });
});
