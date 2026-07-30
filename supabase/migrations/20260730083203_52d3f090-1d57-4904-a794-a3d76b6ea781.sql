-- 1. Role infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. Seed the existing admin account
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(email) = 'nandunaidu656565@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Replace hardcoded-email admin policies with role checks
DROP POLICY IF EXISTS "Only admin email can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin read coupons" ON public.coupons;
CREATE POLICY "Admins read coupons"
ON public.coupons FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin read leads" ON public.leads;
CREATE POLICY "Admins read leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admin can read attempts" ON public.login_attempts;
CREATE POLICY "Admins read login attempts"
ON public.login_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin read pricing experiments" ON public.pricing_experiments;
CREATE POLICY "Admins read pricing experiments"
ON public.pricing_experiments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin reads all presence" ON public.user_presence;
CREATE POLICY "Admins read all presence"
ON public.user_presence FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Feature flags: signed-in users only
DROP POLICY IF EXISTS "public read flags" ON public.feature_flags;
CREATE POLICY "Authenticated read flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

REVOKE SELECT ON public.feature_flags FROM anon;