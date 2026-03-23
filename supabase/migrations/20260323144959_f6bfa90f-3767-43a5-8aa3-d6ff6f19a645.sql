CREATE OR REPLACE FUNCTION admin_list_urunler_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        u.id, u.urun_no, u.baslik, u.foto_url, u.durum,
        u.fiyat, u.fiyat_tipi, u.para_birimi, u.min_siparis_miktari,
        u.created_at, u.user_id, u.goruntuleme_sayisi, u.slug,
        u.urun_kategori_id, u.urun_grup_id, u.urun_tur_id,
        COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
        f.logo_url as firma_logo_url,
        COALESCE(uk.name, 'Belirtilmemiş') as kategori_label
      FROM urunler u
      LEFT JOIN firmalar f ON f.user_id = u.user_id
      LEFT JOIN firma_bilgi_secenekleri uk ON uk.id = u.urun_kategori_id
      ORDER BY u.created_at DESC
    ) t
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_urun_stats_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total', (SELECT count(*)::int FROM urunler),
    'aktif', (SELECT count(*)::int FROM urunler WHERE durum = 'aktif'),
    'pasif', (SELECT count(*)::int FROM urunler WHERE durum = 'pasif'),
    'onayBekleyen', (SELECT count(*)::int FROM urunler WHERE durum = 'onay_bekliyor'),
    'reddedilen', (SELECT count(*)::int FROM urunler WHERE durum = 'reddedildi'),
    'taslak', (SELECT count(*)::int FROM urunler WHERE durum = 'taslak'),
    'totalUsers', (SELECT count(DISTINCT user_id)::int FROM firmalar),
    'usersWithProducts', (SELECT count(DISTINCT user_id)::int FROM urunler),
    'kategoriDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT s.id, s.name, count(*)::int as count FROM urunler u JOIN firma_bilgi_secenekleri s ON s.id = u.urun_kategori_id WHERE u.urun_kategori_id IS NOT NULL GROUP BY s.id, s.name ORDER BY count DESC) r
    ),
    'urunTurDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT s.id, s.name, s.parent_id as grup_id, count(*)::int as count FROM urunler u JOIN firma_bilgi_secenekleri s ON s.id = u.urun_tur_id WHERE u.urun_tur_id IS NOT NULL GROUP BY s.id, s.name, s.parent_id ORDER BY count DESC) r
    ),
    'firmaTuruDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT ft.id, ft.name, count(DISTINCT u.user_id)::int as count FROM urunler u JOIN firmalar f ON f.user_id = u.user_id JOIN firma_turleri ft ON ft.id = f.firma_turu_id WHERE f.firma_turu_id IS NOT NULL GROUP BY ft.id, ft.name ORDER BY count DESC) r
    ),
    'firmaTipiDagilimi', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (SELECT ftp.id, ftp.name, count(DISTINCT u.user_id)::int as count FROM urunler u JOIN firmalar f ON f.user_id = u.user_id JOIN firma_tipleri ftp ON ftp.id = f.firma_tipi_id WHERE f.firma_tipi_id IS NOT NULL GROUP BY ftp.id, ftp.name ORDER BY count DESC) r
    )
  );
END;
$$;