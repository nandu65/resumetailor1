
REVOKE ALL ON FUNCTION public.ensure_referral_code(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_referral(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral(UUID, TEXT) TO authenticated;
