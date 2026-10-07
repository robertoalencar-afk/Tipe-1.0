CREATE TABLE public.waiter_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  waiter_id uuid REFERENCES public.pdv_waiters(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 400),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX waiter_ratings_restaurant_idx ON public.waiter_ratings(restaurant_id, created_at DESC);
GRANT SELECT ON public.waiter_ratings TO authenticated;
GRANT ALL ON public.waiter_ratings TO service_role;
ALTER TABLE public.waiter_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and cashiers read ratings" ON public.waiter_ratings FOR SELECT TO authenticated
USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::app_role[]));