
-- 1. Failed login attempts tracking (called from client on auth failure, anon allowed insert)
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  ip TEXT,
  user_agent TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_created ON public.login_attempts (created_at DESC);
CREATE INDEX idx_login_attempts_email ON public.login_attempts (lower(email));
GRANT INSERT ON public.login_attempts TO anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log an attempt" ON public.login_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Only admin can read attempts" ON public.login_attempts FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email')) = 'nandunaidu656565@gmail.com');

-- 2. Presence heartbeat (used for live "online now")
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT
);
CREATE INDEX idx_user_presence_last_seen ON public.user_presence (last_seen DESC);
GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users update their own presence" ON public.user_presence FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin reads all presence" ON public.user_presence FOR SELECT TO authenticated
  USING (lower((auth.jwt() ->> 'email')) = 'nandunaidu656565@gmail.com');

-- 3. Add flagged/moderation columns to optimizations
ALTER TABLE public.optimizations
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by TEXT;
CREATE INDEX IF NOT EXISTS idx_optimizations_flagged ON public.optimizations (flagged) WHERE flagged = true;
