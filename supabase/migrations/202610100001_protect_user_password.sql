-- Authentication keeps credentials server-side. Browser clients may read only
-- the non-sensitive user directory fields required by the existing UI.
-- User creation, updates and deletes are performed by authenticated Next.js
-- server routes using SUPABASE_SERVICE_ROLE_KEY.

revoke all privileges on table public.users from anon, authenticated;

grant select (
  id,
  name,
  login,
  role,
  retreat_id,
  created_at
) on table public.users to anon, authenticated;
