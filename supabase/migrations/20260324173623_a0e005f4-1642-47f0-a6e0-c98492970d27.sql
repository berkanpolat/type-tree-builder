
CREATE OR REPLACE FUNCTION public.count_urun_favoriler(p_urun_ids uuid[])
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT urun_id, COUNT(*)::int as cnt
      FROM urun_favoriler
      WHERE urun_id = ANY(p_urun_ids)
      GROUP BY urun_id
    ) t
  );
END;
$$;
