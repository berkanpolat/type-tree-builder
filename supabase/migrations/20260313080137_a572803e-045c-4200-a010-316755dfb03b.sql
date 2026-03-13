
-- Performance indexes for frequently queried columns

-- firmalar: user_id, firma_turu_id, firma_tipi_id, onay_durumu, slug
CREATE INDEX IF NOT EXISTS idx_firmalar_user_id ON public.firmalar(user_id);
CREATE INDEX IF NOT EXISTS idx_firmalar_firma_turu_id ON public.firmalar(firma_turu_id);
CREATE INDEX IF NOT EXISTS idx_firmalar_firma_tipi_id ON public.firmalar(firma_tipi_id);
CREATE INDEX IF NOT EXISTS idx_firmalar_onay_durumu ON public.firmalar(onay_durumu);
CREATE INDEX IF NOT EXISTS idx_firmalar_slug ON public.firmalar(slug);
CREATE INDEX IF NOT EXISTS idx_firmalar_firma_olcegi_id ON public.firmalar(firma_olcegi_id);
CREATE INDEX IF NOT EXISTS idx_firmalar_kurulus_il_id ON public.firmalar(kurulus_il_id);

-- ihaleler: user_id, durum, slug, bitis_tarihi
CREATE INDEX IF NOT EXISTS idx_ihaleler_user_id ON public.ihaleler(user_id);
CREATE INDEX IF NOT EXISTS idx_ihaleler_durum ON public.ihaleler(durum);
CREATE INDEX IF NOT EXISTS idx_ihaleler_slug ON public.ihaleler(slug);
CREATE INDEX IF NOT EXISTS idx_ihaleler_bitis_tarihi ON public.ihaleler(bitis_tarihi);
CREATE INDEX IF NOT EXISTS idx_ihaleler_created_at ON public.ihaleler(created_at DESC);

-- ihale_teklifler: ihale_id, teklif_veren_user_id, created_at
CREATE INDEX IF NOT EXISTS idx_ihale_teklifler_ihale_id ON public.ihale_teklifler(ihale_id);
CREATE INDEX IF NOT EXISTS idx_ihale_teklifler_user_id ON public.ihale_teklifler(teklif_veren_user_id);
CREATE INDEX IF NOT EXISTS idx_ihale_teklifler_created_at ON public.ihale_teklifler(created_at);

-- urunler (if exists): user_id, durum, slug
CREATE INDEX IF NOT EXISTS idx_urunler_user_id ON public.urunler(user_id);
CREATE INDEX IF NOT EXISTS idx_urunler_durum ON public.urunler(durum);
CREATE INDEX IF NOT EXISTS idx_urunler_slug ON public.urunler(slug);

-- messages: conversation_id, sender_id, created_at
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- conversations: user1_id, user2_id, last_message_at
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- notifications: user_id, is_read, created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- profil_goruntulemeler: user_id, created_at
CREATE INDEX IF NOT EXISTS idx_profil_goruntulemeler_user_id ON public.profil_goruntulemeler(user_id);
CREATE INDEX IF NOT EXISTS idx_profil_goruntulemeler_created_at ON public.profil_goruntulemeler(created_at);

-- kullanici_abonelikler: user_id, durum
CREATE INDEX IF NOT EXISTS idx_kullanici_abonelikler_user_id ON public.kullanici_abonelikler(user_id);
CREATE INDEX IF NOT EXISTS idx_kullanici_abonelikler_durum ON public.kullanici_abonelikler(durum);

-- firma_bilgi_secenekleri: kategori_id, parent_id
CREATE INDEX IF NOT EXISTS idx_firma_bilgi_secenekleri_kategori_id ON public.firma_bilgi_secenekleri(kategori_id);
CREATE INDEX IF NOT EXISTS idx_firma_bilgi_secenekleri_parent_id ON public.firma_bilgi_secenekleri(parent_id);

-- firma_urun_hizmet_secimler: firma_id, kategori_id
CREATE INDEX IF NOT EXISTS idx_firma_urun_hizmet_secimler_firma_id ON public.firma_urun_hizmet_secimler(firma_id);

-- firma_tesisler, firma_makineler, firma_sertifikalar, firma_teknolojiler
CREATE INDEX IF NOT EXISTS idx_firma_tesisler_firma_id ON public.firma_tesisler(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_makineler_firma_id ON public.firma_makineler(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_sertifikalar_firma_id ON public.firma_sertifikalar(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_teknolojiler_firma_id ON public.firma_teknolojiler(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_uretim_satis_firma_id ON public.firma_uretim_satis(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_referanslar_firma_id ON public.firma_referanslar(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_galeri_firma_id ON public.firma_galeri(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_belgeler_firma_id ON public.firma_belgeler(firma_id);
CREATE INDEX IF NOT EXISTS idx_firma_favoriler_user_id ON public.firma_favoriler(user_id);
CREATE INDEX IF NOT EXISTS idx_firma_favoriler_firma_id ON public.firma_favoriler(firma_id);

-- destek_talepleri: user_id
CREATE INDEX IF NOT EXISTS idx_destek_talepleri_user_id ON public.destek_talepleri(user_id);
CREATE INDEX IF NOT EXISTS idx_destek_mesajlar_destek_id ON public.destek_mesajlar(destek_id);

-- sikayetler: bildiren_user_id
CREATE INDEX IF NOT EXISTS idx_sikayetler_bildiren_user_id ON public.sikayetler(bildiren_user_id);

-- firma_kisitlamalar: user_id, aktif
CREATE INDEX IF NOT EXISTS idx_firma_kisitlamalar_user_id ON public.firma_kisitlamalar(user_id) WHERE aktif = true;

-- profiles: user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- banners: sayfa, aktif
CREATE INDEX IF NOT EXISTS idx_banners_sayfa_aktif ON public.banners(sayfa, aktif) WHERE aktif = true;

-- ihale related sub-tables
CREATE INDEX IF NOT EXISTS idx_ihale_fotograflar_ihale_id ON public.ihale_fotograflar(ihale_id);
CREATE INDEX IF NOT EXISTS idx_ihale_ek_dosyalar_ihale_id ON public.ihale_ek_dosyalar(ihale_id);
CREATE INDEX IF NOT EXISTS idx_ihale_filtreler_ihale_id ON public.ihale_filtreler(ihale_id);
CREATE INDEX IF NOT EXISTS idx_ihale_stok_ihale_id ON public.ihale_stok(ihale_id);
