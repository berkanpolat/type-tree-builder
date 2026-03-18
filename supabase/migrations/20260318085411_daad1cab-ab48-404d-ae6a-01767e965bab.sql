
-- Make firma_turu_id and firma_tipi_id nullable
ALTER TABLE public.firmalar ALTER COLUMN firma_turu_id DROP NOT NULL;
ALTER TABLE public.firmalar ALTER COLUMN firma_tipi_id DROP NOT NULL;

-- Create simplified registration function for landing page
CREATE OR REPLACE FUNCTION public.register_user_simple(
  p_user_id uuid,
  p_ad text,
  p_soyad text,
  p_iletisim_email text,
  p_iletisim_numarasi text,
  p_firma_unvani text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, ad, soyad, iletisim_email, iletisim_numarasi, telefon_dogrulandi)
  VALUES (p_user_id, p_ad, p_soyad, p_iletisim_email, p_iletisim_numarasi, true);

  INSERT INTO public.firmalar (user_id, firma_unvani)
  VALUES (p_user_id, p_firma_unvani);
END;
$$;
