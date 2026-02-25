
-- Profiles table for user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  iletisim_email TEXT NOT NULL,
  iletisim_numarasi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Firmalar table for company info
CREATE TABLE public.firmalar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firma_turu_id UUID NOT NULL REFERENCES public.firma_turleri(id),
  firma_tipi_id UUID NOT NULL REFERENCES public.firma_tipleri(id),
  firma_unvani TEXT NOT NULL,
  vergi_numarasi TEXT NOT NULL,
  vergi_dairesi TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.firmalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own firma" ON public.firmalar FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own firma" ON public.firmalar FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own firma" ON public.firmalar FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_firmalar_updated_at BEFORE UPDATE ON public.firmalar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
