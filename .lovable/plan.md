

## İki Aşamalı Firma Türü ve Tipi Dropdown Alanları

### Veritabanı Oluşturma (Supabase)

**1. Migration: `firma_turleri` tablosu**
- `id` (uuid, primary key)
- `name` (text, not null) — Firma türü adı
- `created_at` (timestamp)
- Herkes okuyabilsin diye SELECT RLS politikası

**2. Migration: `firma_tipleri` tablosu**
- `id` (uuid, primary key)
- `firma_turu_id` (uuid, foreign key → firma_turleri.id)
- `name` (text, not null) — Firma tipi adı
- `created_at` (timestamp)
- Herkes okuyabilsin diye SELECT RLS politikası

**3. Seed Data: CSV'deki verileri ekleme**
- 5 firma türü INSERT edilecek
- 34 firma tipi, doğru `firma_turu_id` ile INSERT edilecek

### UI Bileşeni

**Ana Sayfa (Index.tsx) üzerinde iki dropdown:**

1. **Firma Türü Dropdown** — `firma_turleri` tablosundan veri çeker, 5 seçenek listelenir
2. **Firma Tipi Dropdown** — Başlangıçta devre dışı (disabled). Firma türü seçildiğinde, seçilen türe ait tipler `firma_tipleri` tablosundan filtrelenerek listelenir

### Davranış
- Firma türü seçilmeden firma tipi seçilemez
- Firma türü değiştirildiğinde, firma tipi sıfırlanır ve yeni türe ait tipler yüklenir
- Supabase'den veri çekilirken loading durumu gösterilir
- Dropdown'lar opak arka plana ve yüksek z-index'e sahip olacak

