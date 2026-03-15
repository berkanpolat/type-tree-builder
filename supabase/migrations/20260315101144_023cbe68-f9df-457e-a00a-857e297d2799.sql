
ALTER TABLE public.admin_aksiyonlar 
ADD COLUMN sonuc text DEFAULT NULL,
ADD COLUMN sonuc_neden text DEFAULT NULL,
ADD COLUMN sonuc_paket_id uuid DEFAULT NULL REFERENCES public.paketler(id);
