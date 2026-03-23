
-- 1. admin_list_admin_users_v2: Used by 5+ pages
CREATE OR REPLACE FUNCTION public.admin_list_admin_users_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(u) ORDER BY u.ad, u.soyad), '[]'::json)
    FROM (
      SELECT id, username, ad, soyad, pozisyon, departman, email, telefon, is_primary, permissions, created_at
      FROM admin_users
      ORDER BY ad, soyad
    ) u
  );
END;
$$;

-- 2. admin_list_aksiyonlar_v2: AdminAksiyonlar page
CREATE OR REPLACE FUNCTION public.admin_list_aksiyonlar_v2(p_admin_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT a.id, a.baslik, a.aciklama, a.tur, a.tarih, a.durum, a.firma_id,
             a.admin_id, a.created_at, a.sonuc, a.sonuc_neden, a.sonuc_paket_id, a.yetkili_id,
             COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
             COALESCE(au.ad, '') as admin_ad
      FROM admin_aksiyonlar a
      LEFT JOIN firmalar f ON f.id = a.firma_id
      LEFT JOIN admin_users au ON au.id = a.admin_id
      WHERE (p_admin_id IS NULL OR a.admin_id = p_admin_id)
      ORDER BY a.tarih DESC, a.created_at DESC
    ) t
  );
END;
$$;

-- 3. admin_list_activity_log_v2: AdminIslemler page
CREATE OR REPLACE FUNCTION public.admin_list_activity_log_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT id, action, admin_id, admin_ad, admin_soyad, admin_username, admin_pozisyon,
             target_type, target_id, target_label, details, ip_address, created_at
      FROM admin_activity_log
      ORDER BY created_at DESC
      LIMIT 500
    ) t
  );
END;
$$;

-- 4. admin_list_hedefler_v2: AdminHedefler page
CREATE OR REPLACE FUNCTION public.admin_list_hedefler_v2(p_admin_id uuid DEFAULT NULL, p_durum text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT h.id, h.atayan_admin_id, h.hedef_admin_id, h.hedef_turu, h.baslik, h.aciklama,
             h.hedef_miktar, h.baslangic_tarihi, h.bitis_tarihi, h.durum, h.gerceklesen_miktar,
             h.birim_basi_prim, h.hedef_detay, h.created_at,
             COALESCE(au.ad, '') as hedef_admin_ad,
             COALESCE(au.soyad, '') as hedef_admin_soyad,
             COALESCE(au.departman, '') as hedef_admin_departman
      FROM admin_hedefler h
      LEFT JOIN admin_users au ON au.id = h.hedef_admin_id
      WHERE (p_admin_id IS NULL OR h.hedef_admin_id = p_admin_id)
        AND (p_durum IS NULL OR p_durum = 'all' OR h.durum = p_durum)
      ORDER BY h.created_at DESC
    ) t
  );
END;
$$;

-- 5. admin_list_ziyaret_planlari_v2: AdminZiyaretPlanlari page
CREATE OR REPLACE FUNCTION public.admin_list_ziyaret_planlari_v2(
  p_admin_id uuid DEFAULT NULL,
  p_baslangic text DEFAULT NULL,
  p_bitis text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT zp.id, zp.admin_id, zp.firma_id, zp.planlanan_tarih, zp.notlar,
             zp.durum, zp.created_at, zp.sira, zp.iptal_sebebi,
             COALESCE(f.firma_unvani, 'Bilinmiyor') as firma_unvani,
             f.logo_url as firma_logo
      FROM admin_ziyaret_planlari zp
      LEFT JOIN firmalar f ON f.id = zp.firma_id
      WHERE (p_admin_id IS NULL OR zp.admin_id = p_admin_id)
        AND (p_baslangic IS NULL OR zp.planlanan_tarih >= p_baslangic::date)
        AND (p_bitis IS NULL OR zp.planlanan_tarih <= p_bitis::date)
      ORDER BY zp.planlanan_tarih, zp.sira
    ) t
  );
END;
$$;

-- 6. admin_list_kisitlamalar_all_v2: AdminKisitlamalar page (3 tables)
CREATE OR REPLACE FUNCTION public.admin_list_kisitlamalar_all_v2()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'kisitlamalar', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT k.*, COALESCE(f.firma_unvani, '') as firma_unvani, COALESCE(p.ad, '') as kullanici_ad, COALESCE(p.soyad, '') as kullanici_soyad
        FROM firma_kisitlamalar k
        LEFT JOIN firmalar f ON f.user_id = k.user_id
        LEFT JOIN profiles p ON p.user_id = k.user_id
        ORDER BY k.created_at DESC
      ) t
    ),
    'uzaklastirmalar', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT u.*, COALESCE(f.firma_unvani, '') as firma_unvani, COALESCE(p.ad, '') as kullanici_ad, COALESCE(p.soyad, '') as kullanici_soyad
        FROM firma_uzaklastirmalar u
        LEFT JOIN firmalar f ON f.user_id = u.user_id
        LEFT JOIN profiles p ON p.user_id = u.user_id
        ORDER BY u.created_at DESC
      ) t
    ),
    'yasaklar', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT y.*, COALESCE(f2.firma_unvani, y.firma_unvani, '') as firma_unvani_display, COALESCE(p.ad, '') as kullanici_ad, COALESCE(p.soyad, '') as kullanici_soyad
        FROM firma_yasaklar y
        LEFT JOIN firmalar f2 ON f2.user_id = y.user_id
        LEFT JOIN profiles p ON p.user_id = y.user_id
        ORDER BY y.created_at DESC
      ) t
    )
  );
END;
$$;
