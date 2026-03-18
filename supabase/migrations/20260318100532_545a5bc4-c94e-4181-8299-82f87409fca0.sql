
-- Add meta column to odeme_kayitlari for storing firma_unvani etc.
ALTER TABLE public.odeme_kayitlari ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Create a function that only creates profile (no firma)
CREATE OR REPLACE FUNCTION public.register_profile_only(
  p_user_id uuid,
  p_ad text,
  p_soyad text,
  p_iletisim_email text,
  p_iletisim_numarasi text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, ad, soyad, iletisim_email, iletisim_numarasi, telefon_dogrulandi)
  VALUES (p_user_id, p_ad, p_soyad, p_iletisim_email, p_iletisim_numarasi, true);
END;
$$;
