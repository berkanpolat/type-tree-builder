
CREATE OR REPLACE FUNCTION public.get_firma_sort_scores(p_firma_ids uuid[])
 RETURNS TABLE(firma_id uuid, is_pro boolean, profile_score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  JOIN firmalar f ON f.id = input_id
  ORDER BY profile_score DESC, is_pro DESC, f.belge_onayli DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_sorted_firmalar(p_firma_turu_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_firma_tipi_ids uuid[] DEFAULT NULL::uuid[], p_firma_olcegi_ids uuid[] DEFAULT NULL::uuid[], p_il_ids uuid[] DEFAULT NULL::uuid[], p_moq integer DEFAULT NULL::integer, p_firma_ids uuid[] DEFAULT NULL::uuid[], p_page integer DEFAULT 1, p_per_page integer DEFAULT 20)
 RETURNS TABLE(firma_id uuid, is_pro boolean, profile_score integer, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT f.id, f.user_id, f.belge_onayli,
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
  ORDER BY filtered.profile_score DESC, filtered.is_pro DESC, filtered.belge_onayli DESC, filtered.id
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
$function$;
