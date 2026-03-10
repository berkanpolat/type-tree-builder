
CREATE OR REPLACE FUNCTION public.admin_verify_password(p_username text, p_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE username = p_username
    AND password_hash = extensions.crypt(p_password, password_hash)
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_hash_password(p_password text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT extensions.crypt(p_password, extensions.gen_salt('bf'))
$$;
