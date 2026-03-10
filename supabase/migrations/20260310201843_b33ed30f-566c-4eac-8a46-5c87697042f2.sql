
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS onay_durumu text NOT NULL DEFAULT 'onay_bekliyor';

-- Update existing firms to approved
UPDATE public.firmalar SET onay_durumu = 'onaylandi' WHERE onay_durumu = 'onay_bekliyor';
