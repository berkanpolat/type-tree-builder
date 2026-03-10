
-- Create security definer functions to break circular RLS dependencies

-- Function: check if user owns an ihale
CREATE OR REPLACE FUNCTION public.is_ihale_owner(_user_id uuid, _ihale_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ihaleler
    WHERE id = _ihale_id AND user_id = _user_id
  )
$$;

-- Function: check if user has bid on an ihale
CREATE OR REPLACE FUNCTION public.has_bid_on_ihale(_user_id uuid, _ihale_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ihale_teklifler
    WHERE ihale_id = _ihale_id AND teklif_veren_user_id = _user_id
  )
$$;

-- Function: get ihale ids owned by user
CREATE OR REPLACE FUNCTION public.get_user_ihale_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.ihaleler WHERE user_id = _user_id
$$;

-- Function: get ihale ids user has bid on
CREATE OR REPLACE FUNCTION public.get_user_bid_ihale_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ihale_id FROM public.ihale_teklifler WHERE teklif_veren_user_id = _user_id
$$;

-- Fix ihaleler SELECT policies
DROP POLICY IF EXISTS "Users can view ihaleler they bid on" ON public.ihaleler;
CREATE POLICY "Users can view ihaleler they bid on" ON public.ihaleler
  FOR SELECT TO authenticated
  USING (public.has_bid_on_ihale(auth.uid(), id));

-- Fix ihale_teklifler SELECT policy  
DROP POLICY IF EXISTS "Users can view own teklifler" ON public.ihale_teklifler;
CREATE POLICY "Users can view own teklifler" ON public.ihale_teklifler
  FOR SELECT TO authenticated
  USING (
    teklif_veren_user_id = auth.uid()
    OR public.is_ihale_owner(auth.uid(), ihale_id)
  );

-- Fix ihale_teklifler UPDATE policy
DROP POLICY IF EXISTS "Ihale owners can update teklifler" ON public.ihale_teklifler;
CREATE POLICY "Ihale owners can update teklifler" ON public.ihale_teklifler
  FOR UPDATE TO authenticated
  USING (public.is_ihale_owner(auth.uid(), ihale_id))
  WITH CHECK (public.is_ihale_owner(auth.uid(), ihale_id));

-- Fix ihale_stok policies
DROP POLICY IF EXISTS "Ihale owners can manage stok" ON public.ihale_stok;
DROP POLICY IF EXISTS "Users can view stok for active ihaleler" ON public.ihale_stok;
CREATE POLICY "Ihale owners can manage stok" ON public.ihale_stok
  FOR ALL TO authenticated
  USING (public.is_ihale_owner(auth.uid(), ihale_id))
  WITH CHECK (public.is_ihale_owner(auth.uid(), ihale_id));
CREATE POLICY "Users can view stok for active ihaleler" ON public.ihale_stok
  FOR SELECT TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));

-- Fix ihale_filtreler policies
DROP POLICY IF EXISTS "Ihale owners can manage filtreler" ON public.ihale_filtreler;
DROP POLICY IF EXISTS "Users can view filtreler for active ihaleler" ON public.ihale_filtreler;
CREATE POLICY "Ihale owners can manage filtreler" ON public.ihale_filtreler
  FOR ALL TO authenticated
  USING (public.is_ihale_owner(auth.uid(), ihale_id))
  WITH CHECK (public.is_ihale_owner(auth.uid(), ihale_id));
CREATE POLICY "Users can view filtreler for active ihaleler" ON public.ihale_filtreler
  FOR SELECT TO authenticated
  USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));
