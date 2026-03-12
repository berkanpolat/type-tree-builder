-- Normalize helpers for robust duplicate checks (format-independent)
CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(btrim(p_email)), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  -- TR formats: +90XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX -> XXXXXXXXXX
  IF left(digits, 2) = '90' AND length(digits) = 12 THEN
    digits := substr(digits, 3);
  ELSIF left(digits, 1) = '0' AND length(digits) = 11 THEN
    digits := substr(digits, 2);
  END IF;

  RETURN NULLIF(digits, '');
END;
$$;

-- Keep only one RPC signature to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.check_registration_duplicate(text, text);
DROP FUNCTION IF EXISTS public.check_registration_duplicate(text, text, uuid);

CREATE FUNCTION public.check_registration_duplicate(
  p_email text,
  p_phone text DEFAULT NULL,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{"email_exists": false, "phone_exists": false}'::jsonb;
  v_email text := public.normalize_email(p_email);
  v_phone text := public.normalize_phone(p_phone);
BEGIN
  IF v_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE public.normalize_email(p.iletisim_email) = v_email
        AND (p_exclude_user_id IS NULL OR p.user_id <> p_exclude_user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE public.normalize_email(u.email) = v_email
        AND (p_exclude_user_id IS NULL OR u.id <> p_exclude_user_id)
    ) THEN
      result := jsonb_set(result, '{email_exists}', 'true'::jsonb);
    END IF;
  END IF;

  IF v_phone IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE public.normalize_phone(p.iletisim_numarasi) = v_phone
        AND (p_exclude_user_id IS NULL OR p.user_id <> p_exclude_user_id)
    ) THEN
      result := jsonb_set(result, '{phone_exists}', 'true'::jsonb);
    END IF;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_duplicate(text, text, uuid)
TO anon, authenticated, service_role;

-- Hard-stop duplicate email/phone for every INSERT/UPDATE path on profiles
DROP TRIGGER IF EXISTS trg_profiles_unique_contact ON public.profiles;
DROP FUNCTION IF EXISTS public.validate_profile_unique_contact();

CREATE FUNCTION public.validate_profile_unique_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := public.normalize_email(NEW.iletisim_email);
  v_phone text := public.normalize_phone(NEW.iletisim_numarasi);
  v_current_id uuid := coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF v_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id <> v_current_id
        AND public.normalize_email(p.iletisim_email) = v_email
    ) THEN
      RAISE EXCEPTION 'Bu e-posta adresi ile zaten bir üyelik bulunmaktadır.'
        USING ERRCODE = '23505';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id <> NEW.user_id
        AND public.normalize_email(u.email) = v_email
    ) THEN
      RAISE EXCEPTION 'Bu e-posta adresi ile zaten bir üyelik bulunmaktadır.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF v_phone IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id <> v_current_id
        AND public.normalize_phone(p.iletisim_numarasi) = v_phone
    ) THEN
      RAISE EXCEPTION 'Bu telefon numarası ile zaten bir üyelik bulunmaktadır.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_unique_contact
BEFORE INSERT OR UPDATE OF iletisim_email, iletisim_numarasi
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_unique_contact();