
Amaç: TekRehber filtre akışını “tek gerçek kaynak URL” prensibine göre yeniden kurmak. Mevcut sorunların ana nedeni aynı filtre bilgisinin hem session state, hem local component state, hem location.state, hem de URL üzerinden aynı anda yönetilmeye çalışılması.

1. Sorunun kök nedenleri
- `TekRehber.tsx` içinde `selectedFirmaTuru`, `selectedFirmaTuruName`, `firmaFilterState`, `searchTerm`, `appliedSearchTerm` gibi kritik alanlar `useSessionState` ile tutuluyor. Bu, URL ile çakışan ikinci bir state kaynağı oluşturuyor.
- Sayfa ilk açılışta:
  - slug map yükleniyor,
  - tür/tip URL’den çözülüyor,
  - session state restore oluyor,
  - `FirmaFiltreler` kendi local state’ini `initialSelections` ile ayrıca hydrate ediyor.
  Bu yüzden birden fazla loading/fetch oluşuyor.
- `FirmaFiltreler` hem kendi `selections` state’ini tutuyor hem de parent’a `onFilterChange` ile yazıyor. Parent tekrar `initialSelections` gönderince aynı seçim ikinci kez uygulanabiliyor.
- URL senkronizasyonunda `navigate(..., { replace: true })` kullanıldığı için filtre değişimleri tarayıcı geçmişine yeni entry olarak eklenmiyor. Bu yüzden geri butonu filtre geçmişine değil önceki sayfaya dönüyor.
- `location.state` ile gelen eski “pre-applied filter” sistemi de URL tabanlı akışla çakışıyor.

2. Uygulanacak mimari değişiklik
TekRehber’de filtre state’i sadece URL’den türetilecek:
- Path:
  - `/firmalar/:turSlug?/:tipSlug?`
- Query:
  - çoklu filtreler slug query paramlarıyla
- Component state sadece geçici UI state olacak:
  - loading
  - fetched data
  - dropdown açık/kapalı
  - pagination
  - arama önerileri
- Filtre state sessionStorage’dan tamamen çıkarılacak.

3. `src/pages/TekRehber.tsx` için plan
- `useSessionState` kullanımını filtreyle ilgili alanlardan kaldıracağım:
  - `selectedFirmaTuru`
  - `selectedFirmaTuruName`
  - `firmaFilterState`
  - gerekiyorsa arama alanı için de URL/ephemeral state ayrımı netleştirilecek
- URL parse eden tek bir türetim katmanı kurulacak:
  - `turSlug`, `tipSlug`, `location.search` -> normalized filter object
  - slug -> id çözümleme burada yapılacak
- URL parse tamamlanmadan fetch çalışmayacak.
- `fetchFirmalar` sadece normalized URL filter object değiştiğinde çalışacak.
- `firmaTurleri` veya geç hydration kaynaklı ekstra dependency’ler fetch zincirinden çıkarılacak.
- `location.state` ile gelen rehber filtre prefill akışı kaldırılacak ya da URL’ye çevrilerek tek giriş noktasına indirgenecek.
- URL update tarafında:
  - kullanıcı filtre değiştirince yeni URL üretilecek
  - `navigate(newUrl, { replace: false })` kullanılacak
  - aynı URL ise navigate edilmeyecek
- İlk açılışta default tür seçilecekse bu da state set ederek değil URL’ye canonical yönlendirme ile yapılacak.

4. `src/components/anasayfa/FirmaFiltreler.tsx` için plan
- Bileşeni “controlled” hale getireceğim.
- İçerideki kalıcı filtre state mantığı azaltılacak:
  - `selections`, `moq`, `usSelected...` değerleri parent’tan gelecek
  - kullanıcı etkileşimi olduğunda yalnızca `onChange(nextFilters)` çalışacak
- `initialSelections` temelli geç hydrate mantığı kaldırılacak; bu yapı şu an çifte seçimlerin ana adaylarından biri.
- Sadece UI’ye ait state içeride kalacak:
  - açık/kapalı section’lar
  - arama inputları
  - mobile drawer açık/kapalı
- Tür değişince child filtreleri sıfırlama parent seviyesinde, URL üretiminde yapılacak; filtre component’i kendi başına reset kurgulamayacak.

5. Geri butonu davranışı
- Filtre değişimlerinde `replace` yerine history push kullanılacak.
- Böylece her filtre kombinasyonu ayrı browser history entry olacak.
- POP navigation’da sayfa doğrudan URL’yi parse edip aynı filtreleri geri yükleyecek; session restore’a ihtiyaç kalmayacak.
- `RouteStateManager` form field restore mantığının rehber filtrelerini tekrar tetiklememesi için bu sayfadaki checkbox/input restore etkisini devre dışı bırakmayı da değerlendireceğim. Çünkü URL-driven filtre sisteminde bu katman tekrar çakışma yaratabilir.

6. Beklenen sonuç
- Bir filtre seçildiğinde sadece o filtre seçilecek.
- İlk yüklemede tek bir anlamlı loading/fetch akışı olacak.
- URL her zaman aktif filtrelerin tek kaynağı olacak.
- Geri/ileri butonu filtre geçmişinde düzgün çalışacak.
- Header veya derin link ile açılan rehber sayfaları stale session filtreleri taşımayacak.

7. Etkilenecek dosyalar
- `src/pages/TekRehber.tsx`
- `src/components/anasayfa/FirmaFiltreler.tsx`
- Muhtemelen `src/components/RouteStateManager.tsx` (rehber filtresi için restore istisnası gerekirse)
- Gerekirse `src/components/landing/LandingHeroSearch.tsx` ve rehbere giden diğer navigation noktaları (URL tabanlı girişe geçirmek için)

8. Teknik not
Bu değişiklik küçük bir patch değil; mevcut state mimarisini sadeleştiren bir refactor olacak. Ama kullanıcı davranışı açısından en doğru çözüm bu, çünkü mevcut hata tekil bir bug’dan çok “birden fazla state kaynağı” probleminden doğuyor.
