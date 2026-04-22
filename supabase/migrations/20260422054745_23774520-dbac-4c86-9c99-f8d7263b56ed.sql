ALTER TABLE public.optimizations
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS recruiter_score integer,
  ADD COLUMN IF NOT EXISTS previous_ats_score integer,
  ADD COLUMN IF NOT EXISTS recommendations jsonb;