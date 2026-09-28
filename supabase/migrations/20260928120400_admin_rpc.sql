-- Admin-rolle for innlogget bruker, uten å eksponere ops-skjemaet via API-et.
-- Admin-handlinger kjøres server-side (service-rolle) ETTER rollesjekk i appen.
create or replace function public.current_admin()
returns table (display_name text, role text)
language sql stable security definer set search_path = ops, pg_temp as $$
  select au.display_name, au.role from ops.admin_users au where au.user_id = auth.uid()
$$;
revoke all on function public.current_admin() from public, anon;
grant execute on function public.current_admin() to authenticated;
