REVOKE ALL ON public.security_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.security_events FROM authenticated;
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;