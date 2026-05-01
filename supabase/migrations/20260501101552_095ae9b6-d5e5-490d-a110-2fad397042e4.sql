-- 1) Extend profiles with subscription fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS razorpay_customer_id text,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS scans_used_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- Make sure plan only accepts known values via a trigger (not a CHECK to keep it flexible)
CREATE OR REPLACE FUNCTION public.validate_profile_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan NOT IN ('free','basic','pro') THEN
    RAISE EXCEPTION 'Invalid plan: %', NEW.plan;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_plan ON public.profiles;
CREATE TRIGGER trg_validate_profile_plan
BEFORE INSERT OR UPDATE OF plan ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_plan();

-- 2) Razorpay plans cache
CREATE TABLE IF NOT EXISTS public.razorpay_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,           -- 'basic' | 'pro'
  razorpay_plan_id text NOT NULL,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  interval text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plans" ON public.razorpay_plans;
CREATE POLICY "Anyone can read plans"
  ON public.razorpay_plans
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy: only service role (backend) can mutate.
