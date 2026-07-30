DROP POLICY IF EXISTS "Public can read active shares" ON public.resume_score_shares;
REVOKE SELECT ON public.resume_score_shares FROM anon;

CREATE OR REPLACE FUNCTION public.get_shared_score(_token text)
RETURNS TABLE (
  ats_score integer,
  recruiter_score integer,
  job_match_score integer,
  score_label text,
  title text,
  company text,
  role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.ats_score, s.recruiter_score, s.job_match_score, s.score_label,
         s.title, s.company, s.role, s.created_at
  FROM public.resume_score_shares s
  WHERE s.share_token = _token
    AND s.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_score(text) TO anon, authenticated;