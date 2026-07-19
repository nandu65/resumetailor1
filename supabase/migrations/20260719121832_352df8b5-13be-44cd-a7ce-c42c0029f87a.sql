
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
  IF auth.uid() IS NULL OR auth.uid() <> _new_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  SELECT user_id INTO ref_user FROM public.profiles WHERE referral_code = upper(_code) LIMIT 1;
  IF ref_user IS NULL OR ref_user = _new_user THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT referred_user_id INTO already FROM public.referrals WHERE referred_user_id = _new_user LIMIT 1;
  IF already IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  INSERT INTO public.referrals (referrer_user_id, referred_user_id, code, reward_granted, reward_scans)
    VALUES (ref_user, _new_user, upper(_code), true, 3);
  UPDATE public.profiles SET referred_by = ref_user WHERE user_id = _new_user;
  UPDATE public.profiles SET bonus_scans = COALESCE(bonus_scans,0) + 3 WHERE user_id = ref_user;
  UPDATE public.profiles SET bonus_scans = COALESCE(bonus_scans,0) + 3 WHERE user_id = _new_user;
  RETURN jsonb_build_object('ok', true, 'referrer', ref_user);
END;
$$;
