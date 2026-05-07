
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan text,
  ADD COLUMN IF NOT EXISTS payment_failed boolean NOT NULL DEFAULT false;
