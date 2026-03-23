CREATE OR REPLACE FUNCTION admin_list_firmalar_v2(
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 25,
  p_search text DEFAULT NULL,
  p_filter_turu text DEFAULT NULL,
  p_filter_tipi text DEFAULT NULL,
  p_filter_il text DEFAULT NULL,
  p_filter_ilce text DEFAULT NULL,
  p_filter_durum text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_offset int := (p_page - 1) * p_per_page;
BEGIN
  WITH filtered_firmalar AS (
    SELECT f.id, f.firma_unvani, f.logo_url, f.created_at, f.updated_at,
           f.onay_durumu, f.user_id, f.firma_turu_id, f.firma_tipi_id,
           f.kurulus_il_id, f.kurulus_ilce_id, f.belge_onayli
    FROM firmalar f
    WHERE (p_search IS NULL OR p_search = '' OR f.firma_unvani ILIKE '%' || p_search || '%')
      AND (p_filter_turu IS NULL OR p_filter_turu = 'all' OR f.firma_turu_id::text = p_filter_turu)
      AND (p_filter_tipi IS NULL OR p_filter_tipi = 'all' OR f.firma_tipi_id::text = p_filter_tipi)
      AND (p_filter_il IS NULL OR p_filter_il = 'all' OR f.kurulus_il_id::text = p_filter_il)
      AND (p_filter_ilce IS NULL OR p_filter_ilce = 'all' OR f.kurulus_ilce_id::text = p_filter_ilce)
      AND (p_filter_durum IS NULL OR p_filter_durum = 'all' OR f.onay_durumu = p_filter_durum)
  ),
  total_count AS (SELECT count(*)::int as cnt FROM filtered_firmalar),
  paginated AS (
    SELECT ff.* FROM filtered_firmalar ff
    ORDER BY ff.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ),
  enriched AS (
    SELECT
      pg.id, pg.firma_unvani, pg.logo_url, pg.created_at, pg.updated_at,
      pg.onay_durumu, pg.user_id, pg.firma_turu_id, pg.firma_tipi_id,
      pg.kurulus_il_id, pg.kurulus_ilce_id, pg.belge_onayli,
      ft.name as firma_turu_name, ftp.name as firma_tipi_name,
      il.name as il_name, ilce.name as ilce_name,
      COALESCE(ic.cnt, 0)::int as ihale_sayisi,
      COALESCE(tc.cnt, 0)::int as teklif_sayisi,
      COALESCE(uc.cnt, 0)::int as urun_sayisi,
      COALESCE(sc.cnt, 0)::int as sikayet_sayisi,
      (CASE WHEN pg.logo_url IS NOT NULL AND pg.logo_url != '' THEN 10 ELSE 0 END +
       CASE WHEN pg.kurulus_il_id IS NOT NULL THEN 10 ELSE 0 END +
       CASE WHEN pg.firma_turu_id IS NOT NULL THEN 10 ELSE 0 END +
       CASE WHEN pg.firma_tipi_id IS NOT NULL THEN 10 ELSE 0 END) as profil_doluluk,
      json_build_object('ad', COALESCE(pr.ad, ''), 'soyad', COALESCE(pr.soyad, ''),
        'iletisim_email', COALESCE(pr.iletisim_email, ''), 'iletisim_numarasi', pr.iletisim_numarasi,
        'last_seen', pr.last_seen) as profile,
      CASE WHEN ka.paket_id IS NOT NULL THEN
        json_build_object('paket_id', ka.paket_id, 'paket_ad', COALESCE(pk.ad, ''),
          'paket_slug', COALESCE(pk.slug, ''), 'periyot', ka.periyot,
          'donem_baslangic', ka.donem_baslangic, 'donem_bitis', ka.donem_bitis,
          'durum', ka.durum)
      ELSE NULL END as abonelik,
      CASE WHEN ap.admin_id IS NOT NULL THEN
        json_build_object('admin_id', ap.admin_id, 'admin_ad', COALESCE(au.ad, ''),
          'admin_soyad', COALESCE(au.soyad, ''), 'atanmis', true)
      ELSE NULL END as portfolyo
    FROM paginated pg
    LEFT JOIN firma_turleri ft ON ft.id = pg.firma_turu_id
    LEFT JOIN firma_tipleri ftp ON ftp.id = pg.firma_tipi_id
    LEFT JOIN firma_bilgi_secenekleri il ON il.id = pg.kurulus_il_id
    LEFT JOIN firma_bilgi_secenekleri ilce ON ilce.id = pg.kurulus_ilce_id
    LEFT JOIN profiles pr ON pr.user_id = pg.user_id
    LEFT JOIN LATERAL (SELECT count(*)::int as cnt FROM ihaleler WHERE user_id = pg.user_id) ic ON true
    LEFT JOIN LATERAL (SELECT count(*)::int as cnt FROM ihale_teklifler WHERE teklif_veren_user_id = pg.user_id) tc ON true
    LEFT JOIN LATERAL (SELECT count(*)::int as cnt FROM urunler WHERE user_id = pg.user_id) uc ON true
    LEFT JOIN LATERAL (SELECT count(*)::int as cnt FROM sikayetler WHERE bildiren_user_id = pg.user_id) sc ON true
    LEFT JOIN LATERAL (
      SELECT ka2.paket_id, ka2.periyot, ka2.donem_baslangic, ka2.donem_bitis, ka2.durum
      FROM kullanici_abonelikler ka2 WHERE ka2.user_id = pg.user_id AND ka2.durum = 'aktif'
      ORDER BY ka2.created_at DESC LIMIT 1
    ) ka ON true
    LEFT JOIN paketler pk ON pk.id = ka.paket_id
    LEFT JOIN admin_portfolyo ap ON ap.firma_id = pg.id
    LEFT JOIN admin_users au ON au.id = ap.admin_id
  )
  SELECT json_build_object(
    'firmalar', (SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json) FROM enriched e),
    'total', (SELECT cnt FROM total_count)
  ) INTO result;
  RETURN result;
END;
$$;