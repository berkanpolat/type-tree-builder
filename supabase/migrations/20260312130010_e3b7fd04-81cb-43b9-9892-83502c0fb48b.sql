
CREATE OR REPLACE FUNCTION public.check_registration_duplicate(p_email text, p_phone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{"email_exists": false, "phone_exists": false}'::jsonb;
BEGIN
  IF p_email IS NOT NULL AND p_email != '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE iletisim_email = p_email) THEN
      result := jsonb_set(result, '{email_exists}', 'true');
    END IF;
  END IF;

  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE iletisim_numarasi = p_phone) THEN
      result := jsonb_set(result, '{phone_exists}', 'true');
    END IF;
  END IF;

  RETURN result;
END;
$$;
