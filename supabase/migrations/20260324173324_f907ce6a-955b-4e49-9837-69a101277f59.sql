
CREATE OR REPLACE FUNCTION public.admin_list_urunler_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        u.id, u.urun_no, u.baslik, u.foto_url, u.durum,
        u.fiyat, u.fiyat_tipi, u.para_birimi, u.min_siparis_miktari,
        u.created_at, u.user_id, u.goruntuleme_sayisi, u.slug,
        u.urun_kategori_id, u.urun_grup_id, u.urun_tur_id,
        u.fake_favori_sayisi,
        COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
        f.logo_url as firma_logo_url,
        COALESCE(uk.name, 'Belirtilmemiş') as kategori_label,
        (SELECT COUNT(*)::int FROM urun_favoriler uf WHERE uf.urun_id = u.id) as gercek_favori_sayisi
      FROM urunler u
      LEFT JOIN firmalar f ON f.user_id = u.user_id
      LEFT JOIN firma_bilgi_secenekleri uk ON uk.id = u.urun_kategori_id
      ORDER BY u.created_at DESC
    ) t
  );
END;
$function$;
