CREATE TABLE public.sms_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefon text NOT NULL,
  kod text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false
);

-- Allow public insert/select (edge function uses service role, but keep RLS enabled)
ALTER TABLE public.sms_otp_codes ENABLE ROW LEVEL SECURITY;

-- Cleanup: auto-delete expired codes via index for efficient queries
CREATE INDEX idx_sms_otp_telefon_expires ON public.sms_otp_codes (telefon, expires_at DESC);