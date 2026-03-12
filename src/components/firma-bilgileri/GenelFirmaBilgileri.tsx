import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ClipboardList, Upload, X, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  onFirmaTuruChange?: (turuId: string) => void;
}

interface SelectOption {
  id: string;
  name: string;
}

// Category IDs from database
const KATEGORI_IDS = {
  FIRMA_OLCEGI: "a0000001-0000-0000-0000-000000000001",
  IL: "61fbe0a7-638f-4900-97a0-c2c8310e01af",
};

export default function GenelFirmaBilgileri({ userId, onFirmaTuruChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const kapakInputRef = useRef<HTMLInputElement>(null);

  // Firma fields
  const [firmaTuruId, setFirmaTuruId] = useState("");
  const [firmaTipiId, setFirmaTipiId] = useState("");
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaOlcegiId, setFirmaOlcegiId] = useState("");
  const [vergiNumarasi, setVergiNumarasi] = useState("");
  const [vergiDairesi, setVergiDairesi] = useState("");
  const [kurulusTarihi, setKurulusTarihi] = useState("");
  const [kurulusIlId, setKurulusIlId] = useState("");
  const [kurulusIlceId, setKurulusIlceId] = useState("");
  const [webSitesi, setWebSitesi] = useState("");
  const [firmaIletisimNumarasi, setFirmaIletisimNumarasi] = useState("");
  const [firmaIletisimEmail, setFirmaIletisimEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [xTwitter, setXTwitter] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [kapakUrl, setKapakUrl] = useState("");
  const [firmaHakkinda, setFirmaHakkinda] = useState("");

  // Dropdown options
  const [firmaTurleri, setFirmaTurleri] = useState<SelectOption[]>([]);
  const [allTipleri, setAllTipleri] = useState<{ id: string; name: string; firma_turu_id: string }[]>([]);
  const [filteredTipleri, setFilteredTipleri] = useState<SelectOption[]>([]);
  const [firmaOlcekleri, setFirmaOlcekleri] = useState<SelectOption[]>([]);
  const [iller, setIller] = useState<SelectOption[]>([]);
  const [ilceler, setIlceler] = useState<SelectOption[]>([]);

  // Image upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingKapak, setUploadingKapak] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [firmaRes, turleriRes, tipleriRes, olcekRes, ilRes] = await Promise.all([
        supabase.from("firmalar").select("*").eq("user_id", userId).single(),
        supabase.from("firma_turleri").select("id, name"),
        supabase.from("firma_tipleri").select("id, name, firma_turu_id"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KATEGORI_IDS.FIRMA_OLCEGI),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KATEGORI_IDS.IL).is("parent_id", null).order("name"),
      ]);

      if (turleriRes.data) setFirmaTurleri(turleriRes.data);
      if (tipleriRes.data) setAllTipleri(tipleriRes.data);
      if (olcekRes.data) setFirmaOlcekleri(olcekRes.data);
      if (ilRes.data) setIller(ilRes.data);

      if (firmaRes.data) {
        const f = firmaRes.data as any;
        setFirmaTuruId(f.firma_turu_id || "");
        setFirmaTipiId(f.firma_tipi_id || "");
        setFirmaUnvani(f.firma_unvani || "");
        setFirmaOlcegiId(f.firma_olcegi_id || "");
        setVergiNumarasi(f.vergi_numarasi || "");
        setVergiDairesi(f.vergi_dairesi || "");
        setKurulusTarihi(f.kurulus_tarihi || "");
        setKurulusIlId(f.kurulus_il_id || "");
        setKurulusIlceId(f.kurulus_ilce_id || "");
        setWebSitesi(f.web_sitesi || "");
        setFirmaIletisimNumarasi(f.firma_iletisim_numarasi || "");
        setFirmaIletisimEmail(f.firma_iletisim_email || "");
        setInstagram(f.instagram || "");
        setFacebook(f.facebook || "");
        setLinkedin(f.linkedin || "");
        setXTwitter(f.x_twitter || "");
        setTiktok(f.tiktok || "");
        setYoutube(f.youtube || "");
        setLogoUrl(f.logo_url || "");
        setKapakUrl(f.kapak_fotografi_url || "");
        setFirmaHakkinda(f.firma_hakkinda || "");

        // Load ilçeler for selected il
        if (f.kurulus_il_id) {
          const { data: ilceData } = await supabase
            .from("firma_bilgi_secenekleri")
            .select("id, name")
            .eq("kategori_id", KATEGORI_IDS.IL)
            .eq("parent_id", f.kurulus_il_id)
            .order("name");
          if (ilceData) setIlceler(ilceData);
        }
      }

      setLoading(false);
    };
    if (userId) fetchAll();
  }, [userId]);

  // Filter firma tipleri
  useEffect(() => {
    if (firmaTuruId) {
      setFilteredTipleri(allTipleri.filter(t => t.firma_turu_id === firmaTuruId));
    } else {
      setFilteredTipleri([]);
    }
  }, [firmaTuruId, allTipleri]);

  // Load ilçeler when il changes
  const handleIlChange = async (ilId: string) => {
    setKurulusIlId(ilId);
    setKurulusIlceId("");
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_IDS.IL)
      .eq("parent_id", ilId)
      .order("name");
    setIlceler(data || []);
  };

  // Image upload handler
  const handleImageUpload = async (file: File, type: "logo" | "kapak") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingKapak;
    const setUrl = type === "logo" ? setLogoUrl : setKapakUrl;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${type}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("firma-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Hata", description: "Dosya yüklenemedi.", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("firma-images").getPublicUrl(path);
    setUrl(publicUrl.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("firmalar").update({
      firma_olcegi_id: firmaOlcegiId || null,
      kurulus_tarihi: kurulusTarihi || null,
      kurulus_il_id: kurulusIlId || null,
      kurulus_ilce_id: kurulusIlceId || null,
      web_sitesi: webSitesi || null,
      firma_iletisim_numarasi: firmaIletisimNumarasi || null,
      firma_iletisim_email: firmaIletisimEmail || null,
      instagram: instagram || null,
      facebook: facebook || null,
      linkedin: linkedin || null,
      x_twitter: xTwitter || null,
      tiktok: tiktok || null,
      youtube: youtube || null,
      logo_url: logoUrl || null,
      kapak_fotografi_url: kapakUrl || null,
      firma_hakkinda: firmaHakkinda || null,
    } as any).eq("user_id", userId);

    if (error) {
      toast({ title: "Hata", description: "Bilgiler kaydedilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Firma bilgileri güncellendi." });
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">Yükleniyor...</p>;
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Genel Firma Bilgileri</h2>
        </div>

        {/* Form grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Kayıt sırasında alınan alanlar – salt okunur */}
          <div className="col-span-1 md:col-span-2 bg-muted/30 border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Bu alanlar yalnızca yönetici tarafından değiştirilebilir.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Firma Türü */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Firma Türü</Label>
                <Select value={firmaTuruId} disabled>
                  <SelectTrigger className="bg-muted/50 opacity-70">
                    <SelectValue placeholder="Firma Türü" />
                  </SelectTrigger>
                  <SelectContent>
                    {firmaTurleri.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Firma Tipi */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Firma Tipi</Label>
                <Select value={firmaTipiId} disabled>
                  <SelectTrigger className="bg-muted/50 opacity-70">
                    <SelectValue placeholder="Firma Tipi" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTipleri.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Firma Ünvanı */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Firma Ünvanı</Label>
                <Input value={firmaUnvani} disabled className="bg-muted/50 opacity-70" />
              </div>

              {/* Vergi Numarası */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Vergi Numarası</Label>
                <Input value={vergiNumarasi} disabled className="bg-muted/50 opacity-70" />
              </div>

              {/* Vergi Dairesi */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm font-medium text-foreground">Vergi Dairesi</Label>
                <Input value={vergiDairesi} disabled className="bg-muted/50 opacity-70" />
              </div>
            </div>
          </div>

          {/* Düzenlenebilir alanlar */}

          {/* Firma Ölçeği */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Firma Ölçeği</Label>
            <Select value={firmaOlcegiId} onValueChange={setFirmaOlcegiId}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Firma Ölçeği Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {firmaOlcekleri.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kuruluş Tarihi */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Kuruluş Tarihi</Label>
            <Input
              value={kurulusTarihi}
              onChange={e => {
                let raw = e.target.value.replace(/[^\d/]/g, "");
                // Auto-insert slash after 2 digits
                if (raw.length === 2 && !raw.includes("/") && kurulusTarihi.length < raw.length) {
                  raw = raw + "/";
                }
                // Remove double slashes
                raw = raw.replace(/\/+/g, "/");
                // Limit to MM/YYYY format (7 chars)
                if (raw.length > 7) raw = raw.slice(0, 7);

                const parts = raw.split("/");
                // Validate month (01-12)
                if (parts[0] && parts[0].length === 2) {
                  const month = parseInt(parts[0], 10);
                  if (month < 1 || month > 12) return;
                }
                // Validate year
                if (parts[1] && parts[1].length === 4) {
                  const year = parseInt(parts[1], 10);
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth() + 1;
                  if (year < 1900 || year > currentYear) return;
                  // If current year, month can't exceed current month
                  if (year === currentYear && parts[0] && parts[0].length === 2) {
                    const month = parseInt(parts[0], 10);
                    if (month > currentMonth) return;
                  }
                }

                setKurulusTarihi(raw);
              }}
              placeholder="AA/YYYY"
              className="bg-muted/50"
              maxLength={7}
            />
          </div>

          {/* Kuruluş Bölgesi İl / İlçe */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Kuruluş Bölgesi</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={kurulusIlId} onValueChange={handleIlChange}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="İl Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {iller.map(il => (
                    <SelectItem key={il.id} value={il.id}>{il.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={kurulusIlceId} onValueChange={setKurulusIlceId} disabled={!kurulusIlId}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="İlçe Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {ilceler.map(ilce => (
                    <SelectItem key={ilce.id} value={ilce.id}>{ilce.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Web Sitesi */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Web Sitesi</Label>
            <Input value={webSitesi} onChange={e => setWebSitesi(e.target.value)} placeholder="www.example.com" className="bg-muted/50" />
          </div>

          {/* İletişim Numarası */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">İletişim Numarası</Label>
            <Input value={firmaIletisimNumarasi} onChange={e => setFirmaIletisimNumarasi(e.target.value)} className="bg-muted/50" />
          </div>

          {/* İletişim Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">İletişim Email</Label>
            <Input value={firmaIletisimEmail} onChange={e => setFirmaIletisimEmail(e.target.value)} className="bg-muted/50" />
          </div>
        </div>

        {/* Sosyal Medya */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Sosyal Medya</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instagram</Label>
              <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@kullaniciadi" className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Facebook</Label>
              <Input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="facebook.com/sayfa" className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">LinkedIn</Label>
              <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/company/firma" className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">X (Twitter)</Label>
              <Input value={xTwitter} onChange={e => setXTwitter(e.target.value)} placeholder="@kullaniciadi" className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">TikTok</Label>
              <Input value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="@kullaniciadi" className="bg-muted/50" />
            </div>
          </div>
        </div>

        {/* Logo & Kapak Fotoğrafı */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Görseller</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Logo</Label>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "logo"); }} />
              {logoUrl ? (
                <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden group">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  <button onClick={() => setLogoUrl("")} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px]">{uploadingLogo ? "Yükleniyor" : "Logo Yükle"}</span>
                </button>
              )}
            </div>

            {/* Kapak Fotoğrafı */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Kapak Fotoğrafı</Label>
              <input ref={kapakInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "kapak"); }} />
              {kapakUrl ? (
                <div className="relative w-full h-24 rounded-lg border border-border overflow-hidden group">
                  <img src={kapakUrl} alt="Kapak" className="w-full h-full object-cover" />
                  <button onClick={() => setKapakUrl("")} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => kapakInputRef.current?.click()}
                  disabled={uploadingKapak}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px]">{uploadingKapak ? "Yükleniyor" : "Kapak Fotoğrafı Yükle"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Firma Hakkında */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Firma Hakkında</Label>
          <Textarea
            value={firmaHakkinda}
            onChange={e => setFirmaHakkinda(e.target.value)}
            placeholder="Firmanız hakkında kısa bir açıklama yazınız..."
            className="bg-muted/50 min-h-[100px]"
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
