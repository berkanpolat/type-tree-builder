
-- Create ihaleler table
CREATE TABLE public.ihaleler (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ihale_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  baslik text NOT NULL,
  foto_url text,
  teklif_usulu text NOT NULL DEFAULT 'kapali_teklif',
  durum text NOT NULL DEFAULT 'taslak',
  baslangic_tarihi timestamp with time zone,
  bitis_tarihi timestamp with time zone,
  goruntuleme_sayisi integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ihale_teklifler table for bids
CREATE TABLE public.ihale_teklifler (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ihale_id uuid NOT NULL REFERENCES public.ihaleler(id) ON DELETE CASCADE,
  teklif_veren_user_id uuid NOT NULL,
  tutar numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ihaleler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ihale_teklifler ENABLE ROW LEVEL SECURITY;

-- RLS for ihaleler: owner can CRUD
CREATE POLICY "Users can view own ihaleler" ON public.ihaleler FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ihaleler" ON public.ihaleler FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ihaleler" ON public.ihaleler FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ihaleler" ON public.ihaleler FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for teklifler: bid owner can insert/view, ihale owner can view
CREATE POLICY "Users can view own teklifler" ON public.ihale_teklifler FOR SELECT TO authenticated USING (teklif_veren_user_id = auth.uid() OR ihale_id IN (SELECT id FROM public.ihaleler WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own teklifler" ON public.ihale_teklifler FOR INSERT TO authenticated WITH CHECK (teklif_veren_user_id = auth.uid());

-- Function to generate 6-char alphanumeric ihale_no
CREATE OR REPLACE FUNCTION public.generate_ihale_no()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_no text;
  done bool;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_no := upper(substr(md5(random()::text), 1, 6));
    done := NOT EXISTS (SELECT 1 FROM public.ihaleler WHERE ihale_no = new_no);
  END LOOP;
  NEW.ihale_no := new_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ihale_no
  BEFORE INSERT ON public.ihaleler
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ihale_no();
