import { describe, expect, it, vi } from "vitest";
import { requireRestaurantRoles } from "../security.server";

function client(allowed: boolean | null, found = true, queryError = false) {
  const restaurant = { id: "restaurant-a", slug: "empresa-a", cnpj: "11222333000181" };
  const rpc = vi.fn().mockResolvedValue({ data: allowed, error: null });
  const eq = vi
    .fn()
    .mockReturnValue({
      maybeSingle: async () => ({
        data: found ? restaurant : null,
        error: queryError ? new Error("erro") : null,
      }),
    });
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
  return { api: { from, rpc }, rpc, eq, restaurant };
}

describe("autorização fiscal de restaurante", () => {
  it("usa o cliente da sessão e o papel exato no restaurante resolvido pelo slug", async () => {
    const mock = client(true);
    expect(
      await requireRestaurantRoles(mock.api as never, "user-a", "empresa-a", ["owner"]),
    ).toEqual(mock.restaurant);
    expect(mock.eq).toHaveBeenCalledWith("slug", "empresa-a");
    expect(mock.rpc).toHaveBeenCalledWith("has_restaurant_role", {
      _user_id: "user-a",
      _restaurant_id: "restaurant-a",
      _roles: ["owner"],
    });
  });
  it.each([false, null])(
    "não aceita founder ou membro sem o papel exigido (%s)",
    async (allowed) => {
      const mock = client(allowed);
      await expect(
        requireRestaurantRoles(mock.api as never, "founder-global", "empresa-a", ["owner"]),
      ).rejects.toThrow("Sua função");
    },
  );
  it("não tenta consultar papel para restaurante invisível ou com erro", async () => {
    for (const mock of [client(true, false), client(true, true, true)]) {
      await expect(
        requireRestaurantRoles(mock.api as never, "user-a", "empresa-a", ["owner"]),
      ).rejects.toThrow("sem acesso");
      expect(mock.rpc).not.toHaveBeenCalled();
    }
  });
});
