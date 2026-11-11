import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPendingOrderReviews } from "@/lib/tipe/order-review.functions";

export function usePedidosConferencia(slug: string) {
  const fetch = useServerFn(getPendingOrderReviews);
  return useQuery({
    queryKey: ["order-reviews", slug],
    queryFn: () => fetch({ data: { slug } }),
    enabled: !!slug,
    refetchInterval: 10000,
  });
}
