
CREATE TABLE public.visitor_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer text,
  kanal text NOT NULL DEFAULT 'dogrudan',
  landing_page text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes visitor_sources insert edebilir"
  ON public.visitor_sources FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Herkes kendi visitor source okuyabilir"
  ON public.visitor_sources FOR SELECT
  TO public
  USING (true);

CREATE INDEX idx_visitor_sources_kanal ON public.visitor_sources(kanal);
CREATE INDEX idx_visitor_sources_created_at ON public.visitor_sources(created_at);
CREATE INDEX idx_visitor_sources_utm_source ON public.visitor_sources(utm_source);
