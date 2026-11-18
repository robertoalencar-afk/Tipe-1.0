import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuSource } from "./menu-intelligence";
const m = vi.hoisted(() => ({
  ai: vi.fn(),
  rpc: vi.fn(),
  updates: [] as Array<{ table: string; value: unknown }>,
  claimed: true,
  allowed: true,
  auto: true,
  dishes: [] as Array<Record<string, unknown>>,
}));
vi.mock("./ai.server", () => ({ askAI: m.ai }));
const rid = "11111111-1111-4111-8111-111111111111";
const dish = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Suco",
  description: "Caju",
  code: "SUC",
  menu_config: {},
  available: true,
};
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => m.rpc(...args),
    from: (table: string) => {
      let update = false;
      const builder = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        update: (value: unknown) => {
          update = true;
          m.updates.push({ table, value });
          return builder;
        },
        single: () => builder,
        then: (resolve: (result: unknown) => unknown) =>
          resolve({
            data: update
              ? []
              : table === "restaurants"
                ? { slug: "bistro-teste" }
                : table === "menu_assistant"
                  ? {
                      enabled: true,
                      auto_translate: m.auto,
                      languages: ["pt", "en"],
                      reviewed_at: null,
                    }
                  : table === "pdv_menu_items"
                    ? m.dishes
                    : [],
            error: null,
          }),
      };
      return builder;
    },
  },
}));
import { runMenuAssistant } from "./menu-assistant.server";
beforeEach(() => {
  vi.clearAllMocks();
  m.updates.length = 0;
  m.claimed = true;
  m.allowed = true;
  m.auto = true;
  m.dishes = [dish];
  m.rpc.mockImplementation(async (name: string) => ({
    data:
      name === "claim_menu_assistant"
        ? m.claimed
        : name === "lebre_consume"
          ? { allowed: m.allowed }
          : true,
    error: null,
  }));
});
describe("Lebre acompanha o cardápio", () => {
  it("repairs missing descriptions even when translated names are already current", async () => {
    m.dishes = [
      {
        ...dish,
        menu_config: {
          translationSource: menuSource(dish),
          translations: { en: { name: "Juice", description: "" } },
        },
      },
    ];
    m.ai
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              id: dish.id,
              translations: {
                en: { name: "Juice", description: "Cashew" },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce('{"suggestions":[]}');
    await runMenuAssistant(rid);
    expect(
      m.rpc.mock.calls.find(([name]) => name === "publish_menu_translation")?.[1].p_config
        .translations.en.description,
    ).toBe("Cashew");
  });
  it("translates the whole menu in batches of six in one review", async () => {
    m.dishes = Array.from({ length: 9 }, (_, n) => ({
      ...dish,
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`,
    }));
    const reply = (from: number, to: number) =>
      JSON.stringify({
        items: m.dishes.slice(from, to).map((i) => ({
          id: i["id"],
          translations: { en: { name: "Juice", description: "Cashew" } },
        })),
      });
    m.ai
      .mockResolvedValueOnce(reply(0, 6))
      .mockResolvedValueOnce(reply(6, 9))
      .mockResolvedValueOnce('{"suggestions":[]}');
    await runMenuAssistant(rid);
    expect(m.rpc.mock.calls.filter(([name]) => name === "publish_menu_translation")).toHaveLength(
      9,
    );
    expect(JSON.parse(m.ai.mock.calls[0]![0].question).items).toHaveLength(6);
    expect(JSON.parse(m.ai.mock.calls[1]![0].question).items).toHaveLength(3);
    expect(m.rpc.mock.calls.filter(([name]) => name === "lebre_consume")).toHaveLength(3);
  });
  it("publishes the good items even when one translation in the batch is broken", async () => {
    m.dishes = Array.from({ length: 3 }, (_, n) => ({
      ...dish,
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`,
    }));
    m.ai
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              id: m.dishes[0]!["id"],
              translations: { en: { name: "Juice", description: "Cashew" } },
            },
            { id: m.dishes[1]!["id"], translations: { en: { name: "Juice" } } },
            { id: "broken" },
          ],
        }),
      )
      .mockResolvedValueOnce('{"suggestions":[]}');
    await runMenuAssistant(rid);
    const calls = m.rpc.mock.calls.filter(([name]) => name === "publish_menu_translation");
    expect(calls).toHaveLength(1);
    expect(calls[0]![1].p_item).toBe(m.dishes[0]!["id"]);
    expect(m.updates.at(-1)?.value).toMatchObject({ last_error: expect.stringContaining("tradu") });
  });
  it("does not call AI when another worker owns the lease or the restaurant is disabled", async () => {
    m.claimed = false;
    await runMenuAssistant(rid);
    expect(m.ai).not.toHaveBeenCalled();
  });
  it("fails closed before every model call when restaurant quota is unavailable", async () => {
    m.allowed = false;
    await runMenuAssistant(rid);
    expect(m.ai).not.toHaveBeenCalled();
    expect(m.rpc).toHaveBeenCalledWith("lebre_consume", {
      p_scope: "panel:bistro-teste",
      p_kind: "panel",
    });
    expect(m.updates.at(-1)?.value).toMatchObject({
      processing_until: "-infinity",
      last_error: expect.any(String),
    });
  });
  it("publishes only requested languages through the atomic opt-in/source guard", async () => {
    m.ai
      .mockResolvedValueOnce(
        JSON.stringify({
          items: [
            {
              id: dish.id,
              translations: {
                en: { name: "Juice", description: "Cashew" },
                es: { name: "Zumo", description: "Anacardo" },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce('{"suggestions":[]}');
    await runMenuAssistant(rid);
    const call = m.rpc.mock.calls.find(([name]) => name === "publish_menu_translation")!;
    expect(call[1]).toMatchObject({
      p_restaurant: rid,
      p_item: dish.id,
      p_source: ["Suco", "Caju"],
      p_previous: {},
      p_languages: ["pt", "en"],
      p_config: {
        translationSource: menuSource(dish),
        translations: { en: { name: "Juice", description: "Cashew" } },
      },
    });
    expect(call[1].p_config.translations.es).toBeUndefined();
    expect(m.ai).toHaveBeenCalledTimes(2);
  });
  it("rejects hallucinated product IDs and caches proposals without applying them", async () => {
    m.auto = false;
    m.ai.mockResolvedValueOnce(
      JSON.stringify({
        suggestions: [
          {
            itemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            kind: "featured",
            reason: "Produto inventado",
          },
          { itemId: dish.id, otherId: dish.id, kind: "pair", reason: "Combina consigo mesmo" },
          { itemId: dish.id, kind: "featured", reason: "Uma opção para destacar" },
        ],
      }),
    );
    await runMenuAssistant(rid);
    const saved = m.updates.find((u) => "suggestions" in (u.value as Record<string, unknown>))!
      .value as { suggestions: unknown[] };
    expect(saved.suggestions).toHaveLength(1);
    expect(m.updates.every((u) => u.table === "menu_assistant")).toBe(true);
    expect(m.rpc.mock.calls.some(([name]) => name === "publish_menu_translation")).toBe(false);
  });
});
