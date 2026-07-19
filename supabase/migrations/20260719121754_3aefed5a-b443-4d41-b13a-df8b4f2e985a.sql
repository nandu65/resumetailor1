
-- ============ PAYMENTS LOG ============
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  order_id TEXT UNIQUE,
  payment_id TEXT,
  subscription_id TEXT,
  invoice_id TEXT,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  method TEXT,
  email TEXT,
  contact TEXT,
  tier TEXT,
  variant TEXT,
  coupon_code TEXT,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  notes JSONB DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_desc TEXT,
  retried_at TIMESTAMPTZ,
  refunded_paise BIGINT NOT NULL DEFAULT 0,
  refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ COUPONS ============
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','pro','basic')),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (active = true);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  user_id UUID,
  order_id TEXT,
  payment_id TEXT,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_couponred_user ON public.coupon_redemptions(user_id);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ BROADCASTS ============
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  segment JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  severity TEXT NOT NULL DEFAULT 'info',
  created_by TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read active broadcasts" ON public.broadcasts FOR SELECT TO authenticated
  USING (status = 'sent' AND (ends_at IS NULL OR ends_at > now()));

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_br_user ON public.broadcast_recipients(user_id);
GRANT SELECT, UPDATE ON public.broadcast_recipients TO authenticated;
GRANT ALL ON public.broadcast_recipients TO service_role;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own recipients" ON public.broadcast_recipients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own recipients" ON public.broadcast_recipients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ FEATURE FLAGS ============
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  plans TEXT[] NOT NULL DEFAULT ARRAY['free','basic','pro'],
  rollout_percent INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read flags" ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);

-- seed some defaults
INSERT INTO public.feature_flags (key, description, enabled, plans, rollout_percent)
VALUES
  ('resume_builder', 'AI Resume Builder tool', true, ARRAY['free','basic','pro'], 100),
  ('cover_letter', 'Cover letter generator', true, ARRAY['basic','pro'], 100),
  ('company_brief', 'Company research brief', true, ARRAY['pro'], 100),
  ('skill_gap', 'Skill gap analysis', true, ARRAY['basic','pro'], 100),
  ('diff_view', 'Before/after diff view', true, ARRAY['basic','pro'], 100)
ON CONFLICT (key) DO NOTHING;

-- ============ REFERRALS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  reward_scans INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON public.referrals(referrer_user_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- ============ LEADS EXTEND ============
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ============ updated_at trigger reuse ============
DROP TRIGGER IF EXISTS trg_payments_updated ON public.payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_coupons_updated ON public.coupons;
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_flags_updated ON public.feature_flags;
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REFERRAL CODE GENERATOR ============
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing TEXT;
  candidate TEXT;
BEGIN
  SELECT referral_code INTO existing FROM public.profiles WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  LOOP
    candidate := upper(substring(md5(random()::text || _user_id::text || clock_timestamp()::text) from 1 for 8));
    BEGIN
      UPDATE public.profiles SET referral_code = candidate WHERE user_id = _user_id;
      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- ============ APPLY REFERRAL (called from client after signup) ============
CREATE OR REPLACE FUNCTION public.apply_referral(_new_user UUID, _code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_user UUID;
  already UUID;
BEGIN
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  SELECT user_id INTO ref_user FROM public.profiles WHERE referral_code = upper(_code) LIMIT 1;
  IF ref_user IS NULL OR ref_user = _new_user THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT referred_user_id INTO already FROM public.referrals WHERE referred_user_id = _new_user LIMIT 1;
  IF already IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  INSERT INTO public.referrals (referrer_user_id, referred_user_id, code, reward_granted, reward_scans)
    VALUES (ref_user, _new_user, upper(_code), true, 3);
  UPDATE public.profiles SET referred_by = ref_user WHERE user_id = _new_user;
  -- give both sides bonus scans
  UPDATE public.profiles SET bonus_scans = COALESCE(bonus_scans,0) + 3 WHERE user_id = ref_user;
  UPDATE public.profiles SET bonus_scans = COALESCE(bonus_scans,0) + 3 WHERE user_id = _new_user;
  RETURN jsonb_build_object('ok', true, 'referrer', ref_user);
END;
$$;
