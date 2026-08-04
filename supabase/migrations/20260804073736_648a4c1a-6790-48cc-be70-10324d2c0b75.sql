CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  recipient_email text,
  recipient_name text,
  message_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  cta_label text,
  cta_url text,
  notification_id uuid,
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin messages"
ON public.admin_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_messages_created_at ON public.admin_messages (created_at DESC);
CREATE INDEX idx_admin_messages_recipient ON public.admin_messages (recipient_user_id);