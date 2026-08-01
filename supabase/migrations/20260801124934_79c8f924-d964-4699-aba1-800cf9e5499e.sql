CREATE TABLE public.custom_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 100),
  currency text NOT NULL DEFAULT 'INR',
  scans integer NOT NULL DEFAULT 0 CHECK (scans >= 0),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone,
  order_id text,
  payment_id text,
  paid_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_offers_user ON public.custom_offers(user_id, status);

GRANT SELECT ON public.custom_offers TO authenticated;
GRANT ALL ON public.custom_offers TO service_role;

ALTER TABLE public.custom_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offers"
  ON public.custom_offers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_offers_updated_at
  BEFORE UPDATE ON public.custom_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();