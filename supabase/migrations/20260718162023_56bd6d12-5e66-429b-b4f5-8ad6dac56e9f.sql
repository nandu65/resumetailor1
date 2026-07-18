
CREATE TABLE public.pricing_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant text NOT NULL,
  event text NOT NULL,
  tier text,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pricing_experiments TO anon, authenticated;
GRANT ALL ON public.pricing_experiments TO service_role;
ALTER TABLE public.pricing_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON public.pricing_experiments FOR INSERT TO anon, authenticated WITH CHECK (variant IN ('a49','b99','c149') AND event IN ('view','click','success'));
CREATE INDEX idx_pricing_experiments_variant_event ON public.pricing_experiments(variant, event, created_at);
