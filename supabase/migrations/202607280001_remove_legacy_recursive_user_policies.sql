BEGIN;

-- Older dashboard-created policies queried public.users from inside a users
-- policy, which makes every authenticated profile read fail with PostgreSQL's
-- "infinite recursion detected in policy" error. Keep one canonical policy
-- backed by the SECURITY DEFINER helper instead.
DROP POLICY IF EXISTS "Users see workspace peers" ON public.users;
DROP POLICY IF EXISTS "Users see themselves" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Users view workspace peers" ON public.users;

CREATE POLICY "Users view workspace peers"
ON public.users FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());

COMMIT;