CREATE OR REPLACE FUNCTION admin_list_aksiyonlar_v2(p_admin_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT a.id, a.baslik, a.aciklama, a.tur, a.tarih, a.durum, a.firma_id,
             a.admin_id, a.created_at, a.sonuc, a.sonuc_neden, a.sonuc_paket_id, a.yetkili_id,
             COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
             COALESCE(au.ad, '') as admin_ad,
             CASE WHEN a.yetkili_id IS NOT NULL THEN COALESCE(fy.ad || ' ' || fy.soyad, '') ELSE NULL END as yetkili_ad
      FROM admin_aksiyonlar a
      LEFT JOIN firmalar f ON f.id = a.firma_id
      LEFT JOIN admin_users au ON au.id = a.admin_id
      LEFT JOIN firma_yetkililer fy ON fy.id = a.yetkili_id
      WHERE (p_admin_id IS NULL OR a.admin_id = p_admin_id)
      ORDER BY a.tarih DESC, a.created_at DESC
    ) t
  );
END;
$$;