REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_restaurant_role(UUID, UUID, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_slug(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_restaurant_role(UUID, UUID, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_slug(UUID, TEXT) TO authenticated;