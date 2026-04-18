ALTER TABLE public.optimizations
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS rewrite_level TEXT NOT NULL DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS company_brief JSONB,
  ADD COLUMN IF NOT EXISTS skill_gaps JSONB,
  ADD COLUMN IF NOT EXISTS keyword_density JSONB;

DROP POLICY IF EXISTS "Users update own optimizations" ON public.optimizations;
CREATE POLICY "Users update own optimizations"
  ON public.optimizations
  FOR UPDATE
  USING (auth.uid() = user_id);