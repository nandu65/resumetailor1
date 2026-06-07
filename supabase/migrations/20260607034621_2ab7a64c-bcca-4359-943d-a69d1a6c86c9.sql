
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'exit_intent',
  granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read leads" ON public.leads
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bonus int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.leads WHERE lower(email) = lower(NEW.email)) THEN
    bonus := -1;
    UPDATE public.leads SET granted = true WHERE lower(email) = lower(NEW.email);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, scans_used_month)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), bonus);
  RETURN NEW;
END;
$function$;
