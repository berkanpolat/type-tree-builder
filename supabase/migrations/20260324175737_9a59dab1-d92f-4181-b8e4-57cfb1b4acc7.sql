
CREATE OR REPLACE FUNCTION public.get_sorted_firmalar(p_firma_turu_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_firma_tipi_ids uuid[] DEFAULT NULL::uuid[], p_firma_olcegi_ids uuid[] DEFAULT NULL::uuid[], p_il_ids uuid[] DEFAULT NULL::uuid[], p_moq integer DEFAULT NULL::integer, p_firma_ids uuid[] DEFAULT NULL::uuid[], p_page integer DEFAULT 1, p_per_page integer DEFAULT 20)
 RETURNS TABLE(firma_id uuid, is_pro boolean, profile_score integer, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT f.id, f.user_id, f.belge_onayli, f.firma_turu_id,
      EXISTS (
        SELECT 1 FROM kullanici_abonelikler ka
        JOIN paketler p ON ka.paket_id = p.id
        WHERE ka.user_id = f.user_id
        AND p.slug != 'ucretsiz'
        AND ka.durum = 'aktif'
      ) as is_pro,
      -- 10 genel bilgi alanı (her biri 2 puan)
      (
        CASE WHEN f.firma_olcegi_id IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN f.kurulus_tarihi IS NOT NULL AND f.kurulus_tarihi != '' THEN 2 ELSE 0 END +
        CASE WHEN f.kurulus_il_id IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN f.kurulus_ilce_id IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN f.web_sitesi IS NOT NULL AND f.web_sitesi != '' THEN 2 ELSE 0 END +
        CASE WHEN f.firma_iletisim_numarasi IS NOT NULL AND f.firma_iletisim_numarasi != '' THEN 2 ELSE 0 END +
        CASE WHEN f.firma_iletisim_email IS NOT NULL AND f.firma_iletisim_email != '' THEN 2 ELSE 0 END +
        CASE WHEN f.logo_url IS NOT NULL AND f.logo_url != '' THEN 2 ELSE 0 END +
        CASE WHEN f.kapak_fotografi_url IS NOT NULL AND f.kapak_fotografi_url != '' THEN 2 ELSE 0 END +
        CASE WHEN f.firma_hakkinda IS NOT NULL AND f.firma_hakkinda != '' THEN 2 ELSE 0 END
      ) as genel_score,
      -- Ağırlıklı sekme puanları
      (CASE WHEN EXISTS (SELECT 1 FROM firma_urun_hizmet_secimler x WHERE x.firma_id = f.id) THEN 6 ELSE 0 END) as tab_urun_hizmet,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_uretim_satis x WHERE x.firma_id = f.id) THEN 7 ELSE 0 END) as tab_uretim_satis,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_tesisler x WHERE x.firma_id = f.id) THEN 1 ELSE 0 END) as tab_tesisler,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_referanslar x WHERE x.firma_id = f.id) THEN 2 ELSE 0 END) as tab_referanslar,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_sertifikalar x WHERE x.firma_id = f.id) THEN 2 ELSE 0 END) as tab_sertifikalar,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_galeri x WHERE x.firma_id = f.id) THEN 3 ELSE 0 END) as tab_galeri,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_belgeler x WHERE x.firma_id = f.id) THEN 1 ELSE 0 END) as tab_belgeler,
      (CASE WHEN EXISTS (SELECT 1 FROM firma_makineler x WHERE x.firma_id = f.id) THEN 1 ELSE 0 END) as tab_makineler
    FROM firmalar f
    WHERE (p_firma_turu_id IS NULL OR f.firma_turu_id = p_firma_turu_id)
      AND (p_search IS NULL OR p_search = '' OR f.firma_unvani ILIKE '%' || p_search || '%')
      AND (p_firma_tipi_ids IS NULL OR f.firma_tipi_id = ANY(p_firma_tipi_ids))
      AND (p_firma_olcegi_ids IS NULL OR f.firma_olcegi_id = ANY(p_firma_olcegi_ids))
      AND (p_il_ids IS NULL OR f.kurulus_il_id = ANY(p_il_ids))
      AND (p_moq IS NULL OR f.moq >= p_moq)
      AND (p_firma_ids IS NULL OR f.id = ANY(p_firma_ids))
  ),
  scored AS (
    SELECT
      filtered.*,
      filtered.genel_score + filtered.tab_urun_hizmet + filtered.tab_uretim_satis + filtered.tab_tesisler + filtered.tab_referanslar + filtered.tab_sertifikalar + filtered.tab_galeri + filtered.tab_belgeler +
      CASE 
        WHEN EXISTS (SELECT 1 FROM firma_turleri ft WHERE ft.id = filtered.firma_turu_id AND ft.name IN ('Hazır Giyim Üreticisi', 'Fason Atölye'))
        THEN filtered.tab_makineler
        ELSE 0
      END as full_score,
      CASE
        WHEN EXISTS (SELECT 1 FROM firma_turleri ft WHERE ft.id = filtered.firma_turu_id AND ft.name IN ('Hazır Giyim Üreticisi', 'Fason Atölye'))
        THEN 43  -- 20 genel + 6+7+3+2+2+1+1+1 = 43
        ELSE 42  -- 20 genel + 6+7+3+2+2+1+1 = 42
      END as max_score
    FROM filtered
  ),
  counted AS (
    SELECT count(*) as cnt FROM scored
  )
  SELECT 
    scored.id as firma_id,
    scored.is_pro,
    ((scored.full_score * 100) / scored.max_score)::int as profile_score,
    counted.cnt as total_count
  FROM scored, counted
  ORDER BY scored.full_score DESC, scored.is_pro DESC, scored.belge_onayli DESC, scored.id
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
$function$;
