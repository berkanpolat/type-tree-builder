
CREATE OR REPLACE FUNCTION public.register_user(
  p_user_id uuid,
  p_ad text,
  p_soyad text,
  p_iletisim_email text,
  p_iletisim_numarasi text,
  p_firma_turu_id uuid,
  p_firma_tipi_id uuid,
  p_firma_unvani text,
  p_vergi_numarasi text,
  p_vergi_dairesi text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, ad, soyad, iletisim_email, iletisim_numarasi)
  VALUES (p_user_id, p_ad, p_soyad, p_iletisim_email, p_iletisim_numarasi);

  INSERT INTO public.firmalar (user_id, firma_turu_id, firma_tipi_id, firma_unvani, vergi_numarasi, vergi_dairesi)
  VALUES (p_user_id, p_firma_turu_id, p_firma_tipi_id, p_firma_unvani, p_vergi_numarasi, p_vergi_dairesi);
END;
$$;
