
-- Sikayetler (complaints) table
CREATE TABLE public.sikayetler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sikayet_no text NOT NULL DEFAULT '',
  bildiren_user_id uuid NOT NULL,
  tur text NOT NULL, -- 'mesaj', 'ihale', 'urun', 'profil'
  referans_id text NOT NULL, -- ID of the reported item
  sebep text NOT NULL,
  aciklama text,
  ek_dosya_url text,
  ek_dosya_adi text,
  durum text NOT NULL DEFAULT 'beklemede', -- 'beklemede', 'islem_yapildi', 'kapatildi'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-generate sikayet_no
CREATE OR REPLACE FUNCTION public.generate_sikayet_no()
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
    new_no := 'SK-' || upper(substr(md5(random()::text), 1, 6));
    done := NOT EXISTS (SELECT 1 FROM public.sikayetler WHERE sikayet_no = new_no);
  END LOOP;
  NEW.sikayet_no := new_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_sikayet_no
  BEFORE INSERT ON public.sikayetler
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_sikayet_no();

-- RLS
ALTER TABLE public.sikayetler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sikayetler"
  ON public.sikayetler FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bildiren_user_id);

CREATE POLICY "Users can view own sikayetler"
  ON public.sikayetler FOR SELECT
  TO authenticated
  USING (auth.uid() = bildiren_user_id);

-- Storage bucket for complaint files
INSERT INTO storage.buckets (id, name, public) VALUES ('sikayet-files', 'sikayet-files', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload sikayet files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sikayet-files');

CREATE POLICY "Anyone can view sikayet files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sikayet-files');

-- Enable message and conversation deletion
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
