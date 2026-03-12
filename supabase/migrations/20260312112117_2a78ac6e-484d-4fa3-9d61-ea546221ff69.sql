
-- Create a function that returns paginated firms sorted by pro status and profile score
CREATE OR REPLACE FUNCTION public.get_sorted_firmalar(
  p_firma_turu_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_firma_tipi_ids uuid[] DEFAULT NULL,
  p_firma_olcegi_ids uuid[] DEFAULT NULL,
  p_il_ids uuid[] DEFAULT NULL,
  p_moq int DEFAULT NULL,
  p_firma_ids uuid[] DEFAULT NULL,
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 20
)
RETURNS TABLE(
  firma_id uuid,
  is_pro boolean,
  profile_score integer,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT f.id, f.user_id,
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
    FROM firmalar f
    WHERE (p_firma_turu_id IS NULL OR f.firma_turu_id = p_firma_turu_id)
      AND (p_search IS NULL OR p_search = '' OR f.firma_unvani ILIKE '%' || p_search || '%')
      AND (p_firma_tipi_ids IS NULL OR f.firma_tipi_id = ANY(p_firma_tipi_ids))
      AND (p_firma_olcegi_ids IS NULL OR f.firma_olcegi_id = ANY(p_firma_olcegi_ids))
      AND (p_il_ids IS NULL OR f.kurulus_il_id = ANY(p_il_ids))
      AND (p_moq IS NULL OR f.moq >= p_moq)
      AND (p_firma_ids IS NULL OR f.id = ANY(p_firma_ids))
  ),
  counted AS (
    SELECT count(*) as cnt FROM filtered
  )
  SELECT 
    filtered.id as firma_id,
    filtered.is_pro,
    filtered.profile_score,
    counted.cnt as total_count
  FROM filtered, counted
  ORDER BY filtered.is_pro DESC, filtered.profile_score DESC, filtered.id
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
$$;
