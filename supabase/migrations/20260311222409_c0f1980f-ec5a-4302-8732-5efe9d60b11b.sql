
-- Create ihale_fotograflar table for multiple photos per ihale
CREATE TABLE public.ihale_fotograflar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ihale_id uuid NOT NULL REFERENCES public.ihaleler(id) ON DELETE CASCADE,
  foto_url text NOT NULL,
  sira integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ihale_fotograflar ENABLE ROW LEVEL SECURITY;

-- Ihale owners can manage their photos
CREATE POLICY "Ihale owners can manage fotograflar"
ON public.ihale_fotograflar
FOR ALL
TO authenticated
USING (is_ihale_owner(auth.uid(), ihale_id))
WITH CHECK (is_ihale_owner(auth.uid(), ihale_id));

-- Anyone can view photos of active ihaleler
CREATE POLICY "Users can view fotograflar for active ihaleler"
ON public.ihale_fotograflar
FOR SELECT
TO authenticated
USING (ihale_id IN (SELECT id FROM public.ihaleler WHERE durum = 'devam_ediyor'));

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ihale_fotograflar;
