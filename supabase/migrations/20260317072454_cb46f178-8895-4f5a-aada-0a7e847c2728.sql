
-- Efficient count function for firma stats (replaces fetching all rows)
CREATE OR REPLACE FUNCTION public.get_firma_user_counts(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, ihale_count bigint, teklif_count bigint, urun_count bigint, sikayet_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_list AS (SELECT unnest(p_user_ids) AS uid),
  ic AS (SELECT i.user_id AS uid, count(*) AS cnt FROM ihaleler i WHERE i.user_id = ANY(p_user_ids) GROUP BY i.user_id),
  tc AS (SELECT t.teklif_veren_user_id AS uid, count(*) AS cnt FROM ihale_teklifler t WHERE t.teklif_veren_user_id = ANY(p_user_ids) GROUP BY t.teklif_veren_user_id),
  uc AS (SELECT u.user_id AS uid, count(*) AS cnt FROM urunler u WHERE u.user_id = ANY(p_user_ids) GROUP BY u.user_id),
  sc AS (SELECT s.bildiren_user_id AS uid, count(*) AS cnt FROM sikayetler s WHERE s.bildiren_user_id = ANY(p_user_ids) GROUP BY s.bildiren_user_id)
  SELECT 
    ul.uid AS user_id,
    COALESCE(ic.cnt, 0) AS ihale_count,
    COALESCE(tc.cnt, 0) AS teklif_count,
    COALESCE(uc.cnt, 0) AS urun_count,
    COALESCE(sc.cnt, 0) AS sikayet_count
  FROM user_list ul
  LEFT JOIN ic ON ic.uid = ul.uid
  LEFT JOIN tc ON tc.uid = ul.uid
  LEFT JOIN uc ON uc.uid = ul.uid
  LEFT JOIN sc ON sc.uid = ul.uid;
$$;
