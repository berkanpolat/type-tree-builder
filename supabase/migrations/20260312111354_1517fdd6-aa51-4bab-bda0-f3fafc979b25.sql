
CREATE OR REPLACE FUNCTION public.get_firma_sort_scores(p_firma_ids uuid[])
RETURNS TABLE(firma_id uuid, is_pro boolean, profile_score int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    f.id as firma_id,
    EXISTS (
      SELECT 1 FROM kullanici_abonelikler ka
      JOIN paketler p ON ka.paket_id = p.id
      WHERE ka.user_id = f.user_id
      AND p.slug != 'ucretsiz'
      AND ka.durum = 'aktif'
    ) as is_pro,
    (
      CASE WHEN f.firma_olcegi_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN f.kurulus_tarihi IS NOT NULL AND f.kurulus_tarihi != '' THEN 1 ELSE 0 END +
      CASE WHEN f.kurulus_il_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN f.kurulus_ilce_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN f.web_sitesi IS NOT NULL AND f.web_sitesi != '' THEN 1 ELSE 0 END +
      CASE WHEN f.firma_iletisim_numarasi IS NOT NULL AND f.firma_iletisim_numarasi != '' THEN 1 ELSE 0 END +
      CASE WHEN f.firma_iletisim_email IS NOT NULL AND f.firma_iletisim_email != '' THEN 1 ELSE 0 END +
      CASE WHEN f.logo_url IS NOT NULL AND f.logo_url != '' THEN 1 ELSE 0 END +
      CASE WHEN f.kapak_fotografi_url IS NOT NULL AND f.kapak_fotografi_url != '' THEN 1 ELSE 0 END +
      CASE WHEN f.firma_hakkinda IS NOT NULL AND f.firma_hakkinda != '' THEN 1 ELSE 0 END
    )::int as profile_score
  FROM unnest(p_firma_ids) AS input_id
  JOIN firmalar f ON f.id = input_id;
$$;
