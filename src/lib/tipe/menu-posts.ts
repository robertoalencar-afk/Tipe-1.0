import { z } from "zod";
export const MenuPost = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(70),
  caption: z.string().trim().max(180),
  itemCode: z.string().max(16),
  theme: z.enum(["photo", "paper"]),
  enabled: z.boolean(),
});
export const MenuPosts = z.array(MenuPost).max(6);
export type MenuPost = z.infer<typeof MenuPost>;
export function readMenuPosts(value: unknown): MenuPost[] {
  const parsed = MenuPosts.safeParse(value);
  return parsed.success ? parsed.data : [];
}
