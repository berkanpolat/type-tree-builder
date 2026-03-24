
CREATE OR REPLACE FUNCTION public.admin_list_ihaleler_v2()
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
      LEFT JOIN LATERAL (
        SELECT (
          (SELECT count(DISTINCT teklif_veren_user_id) FROM ihale_teklifler WHERE ihale_id = i.id AND is_fake = false) +
          (SELECT count(*) FROM ihale_teklifler WHERE ihale_id = i.id AND is_fake = true)
        )::int as cnt
      ) tc ON true
      LEFT JOIN firma_bilgi_secenekleri uk ON uk.id = i.urun_kategori_id
      LEFT JOIN firma_bilgi_secenekleri hk ON hk.id = i.hizmet_kategori_id
      ORDER BY i.created_at DESC
    ) t
  );
END;
$function$;
