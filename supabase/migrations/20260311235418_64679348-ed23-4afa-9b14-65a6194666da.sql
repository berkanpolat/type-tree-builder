ALTER TABLE public.ihaleler ALTER COLUMN durum SET DEFAULT 'duzenleniyor'::text;
UPDATE public.ihaleler SET durum = 'duzenleniyor' WHERE durum = 'taslak';