
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_inr numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_usage_created_at ON public.ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_feature ON public.ai_usage_logs (feature);
CREATE INDEX idx_ai_usage_plan ON public.ai_usage_logs (plan);
GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages all AI usage"
  ON public.ai_usage_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
