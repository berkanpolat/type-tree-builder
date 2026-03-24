
ALTER TABLE public.ihale_teklifler 
ADD COLUMN is_fake boolean NOT NULL DEFAULT false,
ADD COLUMN fake_firma_adi text;
