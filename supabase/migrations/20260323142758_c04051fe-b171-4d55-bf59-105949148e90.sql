
-- RPC: admin_list_ihaleler_v2
CREATE OR REPLACE FUNCTION public.admin_list_ihaleler_v2()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        i.id, i.ihale_no, i.baslik, i.foto_url, i.ihale_turu, i.teklif_usulu,
        i.durum, i.baslangic_tarihi, i.bitis_tarihi, i.goruntuleme_sayisi,
        i.created_at, i.user_id,
        i.urun_kategori_id, i.urun_grup_id, i.urun_tur_id,
        i.hizmet_kategori_id, i.hizmet_tur_id,
        COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
        COALESCE(tc.cnt, 0)::int as teklif_sayisi,
        COALESCE(
          CASE WHEN i.ihale_turu = 'hizmet' THEN hk.name ELSE uk.name END,
          'Belirtilmemiş'
        ) as kategori_label
      FROM ihaleler i
      LEFT JOIN firmalar f ON f.user_id = i.user_id
      LEFT JOIN LATERAL (SELECT count(*)::int as cnt FROM ihale_teklifler t WHERE t.ihale_id = i.id) tc ON true
      LEFT JOIN firma_bilgi_secenekleri uk ON uk.id = i.urun_kategori_id
      LEFT JOIN firma_bilgi_secenekleri hk ON hk.id = i.hizmet_kategori_id
      ORDER BY i.created_at DESC
    ) t
  );
END;
$$;

-- RPC: admin_ihale_stats_v2
CREATE OR REPLACE FUNCTION public.admin_ihale_stats_v2()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'total', (SELECT count(*)::int FROM ihaleler),
    'active', (SELECT count(*)::int FROM ihaleler WHERE durum = 'devam_ediyor'),
    'completed', (SELECT count(*)::int FROM ihaleler WHERE durum = 'tamamlandi'),
    'cancelled', (SELECT count(*)::int FROM ihaleler WHERE durum = 'iptal'),
    'pendingApproval', (SELECT count(*)::int FROM ihaleler WHERE durum = 'onay_bekliyor'),
    'draft', (SELECT count(*)::int FROM ihaleler WHERE durum = 'duzenleniyor'),
    'totalTeklifler', (SELECT count(*)::int FROM ihale_teklifler),
    'urunKategoriDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT s.id, s.name, count(*)::int as count FROM ihaleler i JOIN firma_bilgi_secenekleri s ON s.id = i.urun_kategori_id WHERE i.urun_kategori_id IS NOT NULL GROUP BY s.id, s.name ORDER BY count DESC) r
    ),
    'hizmetKategoriDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT s.id, s.name, count(*)::int as count FROM ihaleler i JOIN firma_bilgi_secenekleri s ON s.id = i.hizmet_kategori_id WHERE i.hizmet_kategori_id IS NOT NULL GROUP BY s.id, s.name ORDER BY count DESC) r
    )
  );
END;
$$;

-- RPC: admin_list_firmalar_v2
CREATE OR REPLACE FUNCTION public.admin_list_firmalar_v2(
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 20,
  p_search text DEFAULT NULL,
  p_filter_turu text DEFAULT NULL,
  p_filter_tipi text DEFAULT NULL,
  p_filter_il text DEFAULT NULL,
  p_filter_ilce text DEFAULT NULL,
  p_filter_durum text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
          'durum', ka.durum, 'limits', pk.limitler)
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

-- RPC: admin_firma_stats_v2
CREATE OR REPLACE FUNCTION public.admin_firma_stats_v2()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'total', (SELECT count(*)::int FROM firmalar),
    'recent', (SELECT count(*)::int FROM firmalar WHERE created_at > now() - interval '7 days'),
    'pending', (SELECT count(*)::int FROM firmalar WHERE onay_durumu = 'onay_bekliyor'),
    'onlineCount', (SELECT count(*)::int FROM profiles WHERE last_seen > now() - interval '15 minutes'),
    'turDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT ft.id, ft.name, count(*)::int as count FROM firmalar f JOIN firma_turleri ft ON ft.id = f.firma_turu_id WHERE f.firma_turu_id IS NOT NULL GROUP BY ft.id, ft.name ORDER BY count DESC) r
    ),
    'tipDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT ftp.id, ftp.name, ftp.firma_turu_id, count(*)::int as count FROM firmalar f JOIN firma_tipleri ftp ON ftp.id = f.firma_tipi_id WHERE f.firma_tipi_id IS NOT NULL GROUP BY ftp.id, ftp.name, ftp.firma_turu_id ORDER BY count DESC) r
    ),
    'paketDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT p.id, p.ad, p.slug, count(*)::int as count FROM kullanici_abonelikler ka JOIN paketler p ON p.id = ka.paket_id WHERE ka.durum = 'aktif' GROUP BY p.id, p.ad, p.slug ORDER BY count DESC) r
    ),
    'yeniAboneler', json_build_object(
      'son24saat', (SELECT count(*)::int FROM kullanici_abonelikler WHERE durum = 'aktif' AND created_at > now() - interval '24 hours'),
      'sonBirHafta', (SELECT count(*)::int FROM kullanici_abonelikler WHERE durum = 'aktif' AND created_at > now() - interval '7 days'),
      'sonBirAy', (SELECT count(*)::int FROM kullanici_abonelikler WHERE durum = 'aktif' AND created_at > now() - interval '30 days')
    )
  );
END;
$$;

-- RPC: admin_panel_stats_v2
CREATE OR REPLACE FUNCTION public.admin_panel_stats_v2()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'firma', json_build_object(
      'total', (SELECT count(*)::int FROM firmalar),
      'pending', (SELECT count(*)::int FROM firmalar WHERE onay_durumu = 'onay_bekliyor'),
      'recent', (SELECT count(*)::int FROM firmalar WHERE created_at > now() - interval '7 days'),
      'online', (SELECT count(*)::int FROM profiles WHERE last_seen > now() - interval '15 minutes'),
      'turDagilimi', (
        SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
        FROM (SELECT ft.name, count(*)::int as count FROM firmalar f JOIN firma_turleri ft ON ft.id = f.firma_turu_id WHERE f.firma_turu_id IS NOT NULL GROUP BY ft.name ORDER BY count DESC LIMIT 10) r
      )
    ),
    'ihale', json_build_object(
      'total', (SELECT count(*)::int FROM ihaleler),
      'active', (SELECT count(*)::int FROM ihaleler WHERE durum = 'devam_ediyor'),
      'completed', (SELECT count(*)::int FROM ihaleler WHERE durum = 'tamamlandi'),
      'pending', (SELECT count(*)::int FROM ihaleler WHERE durum = 'onay_bekliyor'),
      'totalTeklifler', (SELECT count(*)::int FROM ihale_teklifler),
      'turDagilimi', (
        SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
        FROM (SELECT CASE ihale_turu WHEN 'urun_alis' THEN 'Ürün Alış' WHEN 'urun_satis' THEN 'Ürün Satış' WHEN 'hizmet' THEN 'Hizmet' ELSE ihale_turu END as name, count(*)::int as count FROM ihaleler GROUP BY ihale_turu ORDER BY count DESC) r
      )
    ),
    'urun', json_build_object(
      'total', (SELECT count(*)::int FROM urunler),
      'active', (SELECT count(*)::int FROM urunler WHERE durum = 'aktif'),
      'pending', (SELECT count(*)::int FROM urunler WHERE durum = 'onay_bekliyor')
    ),
    'destek', json_build_object(
      'total', (SELECT count(*)::int FROM destek_talepleri),
      'open', (SELECT count(*)::int FROM destek_talepleri WHERE durum = 'acik'),
      'inProgress', (SELECT count(*)::int FROM destek_talepleri WHERE durum = 'islemde')
    ),
    'sikayet', json_build_object(
      'total', (SELECT count(*)::int FROM sikayetler),
      'pending', (SELECT count(*)::int FROM sikayetler WHERE durum = 'beklemede'),
      'inProgress', (SELECT count(*)::int FROM sikayetler WHERE durum = 'inceleniyor')
    ),
    'paket', json_build_object(
      'dagilim', (
        SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
        FROM (SELECT p.ad as name, count(*)::int as count FROM kullanici_abonelikler ka JOIN paketler p ON p.id = ka.paket_id WHERE ka.durum = 'aktif' GROUP BY p.ad ORDER BY count DESC) r
      )
    )
  );
END;
$$;
