
DROP POLICY IF EXISTS "Anyone can log an attempt" ON public.login_attempts;
CREATE POLICY "Anyone can log an attempt" ON public.login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (email IS NULL OR length(email) <= 320)
    AND (error IS NULL OR length(error) <= 500)
  );
