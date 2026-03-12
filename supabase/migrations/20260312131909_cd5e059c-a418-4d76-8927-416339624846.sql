CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(lower(btrim(p_email)), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  IF left(digits, 2) = '90' AND length(digits) = 12 THEN
    digits := substr(digits, 3);
  ELSIF left(digits, 1) = '0' AND length(digits) = 11 THEN
    digits := substr(digits, 2);
  END IF;

  RETURN NULLIF(digits, '');
END;
$$;