DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'robertinhoooo@gmail.com');
DELETE FROM public.staff_members WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'robertinhoooo@gmail.com');
INSERT INTO public.user_roles (user_id, role, restaurant_id)
SELECT id, 'founder', NULL FROM auth.users WHERE lower(email) = 'robertoalencar@live.com'
AND NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id WHERE lower(u.email) = 'robertoalencar@live.com' AND ur.role = 'founder');