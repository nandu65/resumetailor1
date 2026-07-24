
-- 1. Coupons: remove public read
DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon, authenticated;
CREATE POLICY "admin read coupons" ON public.coupons FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email'::text)) = 'nandunaidu656565@gmail.com');
GRANT SELECT ON public.coupons TO authenticated;

-- 2. Leads: explicit admin-only SELECT
CREATE POLICY "admin read leads" ON public.leads FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email'::text)) = 'nandunaidu656565@gmail.com');

-- 3. Pricing experiments: explicit admin-only SELECT
CREATE POLICY "admin read pricing experiments" ON public.pricing_experiments FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email'::text)) = 'nandunaidu656565@gmail.com');
GRANT SELECT ON public.pricing_experiments TO authenticated;

-- 4. Razorpay plans: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read plans" ON public.razorpay_plans;
REVOKE SELECT ON public.razorpay_plans FROM anon;
CREATE POLICY "Authenticated read plans" ON public.razorpay_plans FOR SELECT TO authenticated
  USING (true);
GRANT SELECT ON public.razorpay_plans TO authenticated;

-- 5. Revoke EXECUTE on SECURITY DEFINER functions from signed-in users.
-- These are only invoked by edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.consume_scan(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_referral(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_referral_code(uuid) FROM anon, authenticated, public;
