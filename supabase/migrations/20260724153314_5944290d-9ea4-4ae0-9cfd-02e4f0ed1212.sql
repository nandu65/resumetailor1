
-- =====================================================================
-- resume_score_shares: public share cards
-- =====================================================================
CREATE TABLE public.resume_score_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  optimization_id UUID REFERENCES public.optimizations(id) ON DELETE SET NULL,
  share_token TEXT NOT NULL UNIQUE,
  ats_score INTEGER,
  recruiter_score INTEGER,
  job_match_score INTEGER,
  score_label TEXT,
  score_breakdown JSONB,
  title TEXT,
  company TEXT,
  role TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_score_shares TO authenticated;
GRANT SELECT ON public.resume_score_shares TO anon;
GRANT ALL ON public.resume_score_shares TO service_role;

ALTER TABLE public.resume_score_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shares"
  ON public.resume_score_shares FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read: only active + non-expired rows. Row contains only safe score fields.
CREATE POLICY "Public can read active shares"
  ON public.resume_score_shares FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE INDEX idx_shares_user ON public.resume_score_shares(user_id);
CREATE INDEX idx_shares_token ON public.resume_score_shares(share_token);
CREATE INDEX idx_shares_optimization ON public.resume_score_shares(optimization_id);

CREATE TRIGGER trg_shares_updated
  BEFORE UPDATE ON public.resume_score_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View-count increment RPC (bypasses RLS to bump counter for public views)
CREATE OR REPLACE FUNCTION public.increment_share_view(_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resume_score_shares
     SET view_count = view_count + 1
   WHERE share_token = _token
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_view(TEXT) TO anon, authenticated;

-- =====================================================================
-- job_applications: personal application tracker
-- =====================================================================
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  work_type TEXT,             -- 'remote' | 'hybrid' | 'onsite'
  application_date DATE,
  status TEXT NOT NULL DEFAULT 'wishlist', -- wishlist|applied|assessment|interview|offer|rejected|withdrawn
  salary_range TEXT,
  recruiter_name TEXT,
  recruiter_email TEXT,
  notes TEXT,
  optimization_id UUID REFERENCES public.optimizations(id) ON DELETE SET NULL,
  ats_score INTEGER,
  recruiter_score INTEGER,
  assessment_date DATE,
  interview_date DATE,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_apps_user ON public.job_applications(user_id);
CREATE INDEX idx_apps_status ON public.job_applications(status);
CREATE INDEX idx_apps_date ON public.job_applications(application_date);
CREATE INDEX idx_apps_optimization ON public.job_applications(optimization_id);

CREATE TRIGGER trg_applications_updated
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- application_events: timeline
-- =====================================================================
CREATE TABLE public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,   -- 'status_change' | 'note' | 'custom'
  event_title TEXT NOT NULL,
  notes TEXT,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own application events"
  ON public.application_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_events_app ON public.application_events(application_id);
CREATE INDEX idx_events_user ON public.application_events(user_id);
CREATE INDEX idx_events_date ON public.application_events(event_date DESC);

-- Auto-log status changes as timeline events
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_events(application_id, user_id, event_type, event_title)
      VALUES (NEW.id, NEW.user_id, 'status_change', 'Created as ' || NEW.status);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_events(application_id, user_id, event_type, event_title)
      VALUES (NEW.id, NEW.user_id, 'status_change', 'Status changed to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_status_log
  AFTER INSERT OR UPDATE OF status ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();
