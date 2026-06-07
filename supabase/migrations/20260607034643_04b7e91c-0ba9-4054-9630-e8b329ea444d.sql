
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can read leads" ON public.leads;

CREATE POLICY "Public can insert valid leads" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 255
    AND source IN ('exit_intent','landing','footer')
    AND granted = false
  );
