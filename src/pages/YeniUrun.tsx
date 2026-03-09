import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, FileText, Settings, Package, Plus, Trash2 } from "lucide-react";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

const STEPS = ["Kategori", "Ürün Bilgileri", "Teknik Detaylar", "Varyasyon"];
const STEP_ICONS = [Pencil, FileText, Settings, Package];

// Map ana kategori names to their technical spec fields
const TEKNIK_ALANLAR: Record<string, { label: string; type: "dropdown" | "text" | "number" | "date"; kategoriName?: string }[]> = {
  "Hazır Giyim": [
    { label: "Kumaş Kompozisyonu", type: "text" },
    { label: "Kumaş Grubu", type: "dropdown", kategoriName: "Kumaş Grubu" },
    { label: "Kumaş Türü", type: "dropdown", kategoriName: "Kumaş Türü" },
    { label: "Sezon", type: "dropdown", kategoriName: "Sezon" },
    { label: "Cinsiyet", type: "dropdown", kategoriName: "Cinsiyet" },
    { label: "Yaş Grubu", type: "dropdown", kategoriName: "Yaş Grubu" },
    { label: "Desen", type: "dropdown", kategoriName: "Desen" },
    { label: "Kalıp", type: "dropdown", kategoriName: "Kalıp" },
  ],
  "Hazır Giyim Üretim": [
    { label: "Kumaş Kompozisyonu", type: "text" },
    { label: "Kumaş Grubu", type: "dropdown", kategoriName: "Kumaş Grubu" },
    { label: "Kumaş Türü", type: "dropdown", kategoriName: "Kumaş Türü" },
    { label: "Sezon", type: "dropdown", kategoriName: "Sezon" },
    { label: "Cinsiyet", type: "dropdown", kategoriName: "Cinsiyet" },
    { label: "Yaş Grubu", type: "dropdown", kategoriName: "Yaş Grubu" },
    { label: "Desen", type: "dropdown", kategoriName: "Desen" },
    { label: "Kalıp", type: "dropdown", kategoriName: "Kalıp" },
  ],
  "Aksesuar": [
    { label: "Aksesuar Kullanım Alanı", type: "dropdown", kategoriName: "Aksesuar Kullanım Alanı" },
    { label: "Malzeme Türü", type: "dropdown", kategoriName: "Malzeme Türü" },
    { label: "Kaplama", type: "dropdown", kategoriName: "Kaplama" },
    { label: "Beden", type: "dropdown", kategoriName: "Beden" },
    { label: "Ebat Ölçü (cm)", type: "text" },
  ],
  "Ambalaj": [
    { label: "Ambalaj Kullanım Alanı", type: "dropdown", kategoriName: "Ambalaj Kullanım Alanı" },
    { label: "Malzeme Türü", type: "dropdown", kategoriName: "Malzeme Türü" },
    { label: "Baskı", type: "dropdown", kategoriName: "Baskı" },
    { label: "Beden", type: "dropdown", kategoriName: "Beden" },
    { label: "Ebat Ölçü (cm)", type: "text" },
    { label: "Gramaj (gram)", type: "text" },
    { label: "Kalınlık Bilgisi", type: "text" },
    { label: "Kaplama", type: "dropdown", kategoriName: "Kaplama" },
  ],
  "İplik": [
    { label: "İplik Kompozisyonu", type: "text" },
    { label: "İplik Kullanım Alanı", type: "dropdown", kategoriName: "İplik Kullanım Alanı" },
    { label: "Büküm Tipi", type: "dropdown", kategoriName: "Büküm Tipi" },
    { label: "Mukavemet", type: "dropdown", kategoriName: "Mukavemet" },
    { label: "Paket Tipi", type: "dropdown", kategoriName: "Paket Tipi" },
    { label: "İplik Numarası", type: "dropdown", kategoriName: "İplik Numarası" },
  ],
  "Boya ve Kimyasal Maddeler": [
    { label: "Kimyasal Kullanım Alanı", type: "dropdown", kategoriName: "Kimyasal Kullanım Alanı" },
    { label: "Marka", type: "text" },
    { label: "Model", type: "text" },
    { label: "Kimyasal Türü", type: "dropdown", kategoriName: "Kimyasal Türü" },
    { label: "Fiziksel Formu", type: "dropdown", kategoriName: "Fiziksel Formu" },
    { label: "Depolama Koşulu", type: "dropdown", kategoriName: "Depolama Koşulu" },
    { label: "Yoğunluk / Viskozite", type: "text" },
    { label: "pH", type: "text" },
    { label: "STT", type: "date" },
  ],
  "Kimyasal ve Boya": [
    { label: "Kimyasal Kullanım Alanı", type: "dropdown", kategoriName: "Kimyasal Kullanım Alanı" },
    { label: "Marka", type: "text" },
    { label: "Model", type: "text" },
    { label: "Kimyasal Türü", type: "dropdown", kategoriName: "Kimyasal Türü" },
    { label: "Fiziksel Formu", type: "dropdown", kategoriName: "Fiziksel Formu" },
    { label: "Depolama Koşulu", type: "dropdown", kategoriName: "Depolama Koşulu" },
    { label: "Yoğunluk / Viskozite", type: "text" },
    { label: "pH", type: "text" },
    { label: "STT", type: "date" },
  ],
  "Kumaş": [
    { label: "Kumaş Kompozisyonu", type: "text" },
    { label: "En Bilgisi (cm)", type: "text" },
    { label: "Boy Bilgisi (cm)", type: "text" },
    { label: "Gramaj (gram)", type: "text" },
    { label: "Desen", type: "dropdown", kategoriName: "Desen" },
    { label: "Esneklik Oranı", type: "text" },
    { label: "İplik Numarası", type: "dropdown", kategoriName: "İplik Numarası" },
  ],
  "Makine ve Yedek Parça": [
    { label: "Makine Kullanım Alanı", type: "dropdown", kategoriName: "Makine Kullanım Alanı" },
    { label: "Kullanım Durumu", type: "dropdown", kategoriName: "Kullanım Durumu" },
    { label: "Marka", type: "text" },
    { label: "Model", type: "text" },
    { label: "Üretim Yılı", type: "number" },
    { label: "Motor Tipi", type: "dropdown", kategoriName: "Motor Tipi" },
    { label: "Motor Gücü", type: "dropdown", kategoriName: "Motor Gücü" },
  ],
};

interface Varyasyon {
  min_adet: number;
  max_adet: number;
  birim_fiyat: number;
}

export default function YeniUrun() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Kategori
  const [kategoriler, setKategoriler] = useState<{ id: string; name: string }[]>([]);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedGrup, setSelectedGrup] = useState("");
  const [selectedTur, setSelectedTur] = useState("");
  const [kategoriName, setKategoriName] = useState("");

  // Step 2: Ürün Bilgileri
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [minSiparisMiktari, setMinSiparisMiktari] = useState("");
  const [fiyatTipi, setFiyatTipi] = useState("tek_fiyat");
  const [paraBirimi, setParaBirimi] = useState("TRY");
  const [fiyat, setFiyat] = useState("");

  // Step 3: Teknik Detaylar
  const [teknikDetaylar, setTeknikDetaylar] = useState<Record<string, string>>({});
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, { id: string; name: string }[]>>({});

  // Step 4: Varyasyonlar
  const [varyasyonlar, setVaryasyonlar] = useState<Varyasyon[]>([]);

  // Draft ID for auto-save
  const [draftId, setDraftId] = useState<string | null>(editId || null);

  // Load edit data
  useEffect(() => {
    if (editId) {
      loadUrun(editId);
    }
  }, [editId]);

  // Fetch kategoriler on mount
  useEffect(() => {
    fetchKategoriler();
  }, []);

  useEffect(() => {
    if (selectedKategori) {
      fetchChildren(selectedKategori, setGruplar);
      const kat = kategoriler.find(k => k.id === selectedKategori);
      setKategoriName(kat?.name || "");
    }
  }, [selectedKategori, kategoriler]);

  useEffect(() => {
    if (selectedGrup) fetchChildren(selectedGrup, setTurler);
  }, [selectedGrup]);

  // Load dropdown options for teknik detaylar when kategoriName changes
  useEffect(() => {
    if (kategoriName) loadTeknikDropdownOptions();
  }, [kategoriName]);

  const fetchKategoriler = async () => {
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .order("name");
    if (data) setKategoriler(data);
  };

  const fetchChildren = async (parentId: string, setter: (v: { id: string; name: string }[]) => void) => {
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .eq("parent_id", parentId)
      .order("name");
    if (data) setter(data);
  };

  const loadTeknikDropdownOptions = async () => {
    const alanlar = getTeknikAlanlar();
    const dropdownAlanlar = alanlar.filter(a => a.type === "dropdown" && a.kategoriName);
    const kategoriNames = [...new Set(dropdownAlanlar.map(a => a.kategoriName!))];

    if (kategoriNames.length === 0) return;

    // Get kategori IDs by name
    const { data: katData } = await supabase
      .from("firma_bilgi_kategorileri")
      .select("id, name")
      .in("name", kategoriNames);

    if (!katData) return;

    const newOpts: Record<string, { id: string; name: string }[]> = {};
    const promises = katData.map(async (kat) => {
      const { data: secenekler } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("kategori_id", kat.id)
        .is("parent_id", null)
        .order("name");
      if (secenekler) newOpts[kat.name] = secenekler;
    });

    await Promise.all(promises);
    setDropdownOptions(newOpts);
  };

  const loadUrun = async (urunId: string) => {
    const { data } = await supabase.from("urunler").select("*").eq("id", urunId).single();
    if (!data) return;

    setSelectedKategori(data.urun_kategori_id || "");
    setSelectedGrup(data.urun_grup_id || "");
    setSelectedTur(data.urun_tur_id || "");
    setBaslik(data.baslik);
    setAciklama(data.aciklama || "");
    setMinSiparisMiktari(data.min_siparis_miktari?.toString() || "");
    setFiyatTipi(data.fiyat_tipi);
    setParaBirimi(data.para_birimi || "TRY");
    setFiyat(data.fiyat?.toString() || "");
    setTeknikDetaylar(data.teknik_detaylar as Record<string, string> || {});
    setDraftId(urunId);

    // Load varyasyonlar
    const { data: vars } = await supabase
      .from("urun_varyasyonlar")
      .select("*")
      .eq("urun_id", urunId)
      .order("min_adet");
    if (vars) setVaryasyonlar(vars.map(v => ({ min_adet: v.min_adet, max_adet: v.max_adet, birim_fiyat: v.birim_fiyat })));
  };

  const getTeknikAlanlar = () => {
    // Try matching exact name, then partial
    if (TEKNIK_ALANLAR[kategoriName]) return TEKNIK_ALANLAR[kategoriName];
    const key = Object.keys(TEKNIK_ALANLAR).find(k => kategoriName.toLowerCase().includes(k.toLowerCase()));
    return key ? TEKNIK_ALANLAR[key] : [];
  };

  const saveDraft = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      baslik: baslik || "Taslak Ürün",
      aciklama,
      urun_kategori_id: selectedKategori || null,
      urun_grup_id: selectedGrup || null,
      urun_tur_id: selectedTur || null,
      fiyat_tipi: fiyatTipi,
      fiyat: fiyatTipi === "tek_fiyat" && fiyat ? parseFloat(fiyat) : null,
      para_birimi: paraBirimi,
      min_siparis_miktari: minSiparisMiktari ? parseInt(minSiparisMiktari) : null,
      teknik_detaylar: teknikDetaylar,
      durum: "taslak",
    };

    if (draftId) {
      await supabase.from("urunler").update(payload as any).eq("id", draftId);
    } else {
      const { data } = await supabase.from("urunler").insert([payload as any]).select("id").single();
      if (data) setDraftId(data.id);
    }
  };

  const handleNext = async () => {
    // Validations
    if (step === 0 && (!selectedKategori || !selectedGrup || !selectedTur)) {
      toast({ title: "Lütfen kategori, grup ve tür seçiniz.", variant: "destructive" });
      return;
    }
    if (step === 1) {
      if (!baslik.trim()) {
        toast({ title: "Ürün başlığı zorunludur.", variant: "destructive" });
        return;
      }
      if (fiyatTipi === "tek_fiyat" && !fiyat) {
        toast({ title: "Fiyat zorunludur.", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      const alanlar = getTeknikAlanlar();
      for (const alan of alanlar) {
        if (!teknikDetaylar[alan.label]?.trim()) {
          toast({ title: `"${alan.label}" alanı zorunludur.`, variant: "destructive" });
          return;
        }
      }
    }

    // Auto-save draft
    await saveDraft();

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (fiyatTipi === "varyasyonlu" && varyasyonlar.length === 0) {
      toast({ title: "En az bir varyasyon ekleyiniz.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      baslik,
      aciklama,
      urun_kategori_id: selectedKategori,
      urun_grup_id: selectedGrup,
      urun_tur_id: selectedTur,
      fiyat_tipi: fiyatTipi,
      fiyat: fiyatTipi === "tek_fiyat" ? parseFloat(fiyat) : null,
      para_birimi: paraBirimi,
      min_siparis_miktari: minSiparisMiktari ? parseInt(minSiparisMiktari) : null,
      teknik_detaylar: teknikDetaylar,
      durum: "onay_bekliyor",
    };

    let urunId = draftId;
    if (urunId) {
      await supabase.from("urunler").update(payload as any).eq("id", urunId);
    } else {
      const { data } = await supabase.from("urunler").insert([payload as any]).select("id").single();
      urunId = data?.id || null;
    }

    // Save varyasyonlar
    if (urunId && fiyatTipi === "varyasyonlu") {
      await supabase.from("urun_varyasyonlar").delete().eq("urun_id", urunId);
      if (varyasyonlar.length > 0) {
        await supabase.from("urun_varyasyonlar").insert(
          varyasyonlar.map(v => ({ urun_id: urunId!, ...v }))
        );
      }
    }

    setSaving(false);
    toast({ title: "Ürün onaya gönderildi!" });
    navigate("/manupazar");
  };

  const addVaryasyon = () => {
    const lastMax = varyasyonlar.length > 0 ? varyasyonlar[varyasyonlar.length - 1].max_adet : 0;
    setVaryasyonlar([...varyasyonlar, { min_adet: lastMax + 1, max_adet: lastMax + 10, birim_fiyat: 0 }]);
  };

  const updateVaryasyon = (idx: number, field: keyof Varyasyon, value: number) => {
    setVaryasyonlar(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      // Auto-adjust next min_adet
      if (field === "max_adet" && idx < updated.length - 1) {
        updated[idx + 1] = { ...updated[idx + 1], min_adet: value + 1 };
      }
      return updated;
    });
  };

  const removeVaryasyon = (idx: number) => {
    setVaryasyonlar(prev => prev.filter((_, i) => i !== idx));
  };

  const teknikAlanlar = getTeknikAlanlar();

  return (
    <DashboardLayout title={editId ? "Ürün Düzenle" : "Yeni Ürün"}>
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">{editId ? "Ürün Düzenle" : "Yeni Ürün"}</h2>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 py-4">
          {STEPS.map((label, i) => {
            const Icon = STEP_ICONS[i];
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive ? "border-orange-500 bg-orange-500 text-white"
                    : isDone ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 text-center max-w-[80px] ${
                    isActive ? "text-orange-500 font-semibold" : isDone ? "text-foreground" : "text-muted-foreground"
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 mt-[-18px] ${isDone ? "bg-primary" : "bg-muted-foreground/20"}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Step 0: Kategori */}
            {step === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-orange-500" />
                  Kategori – Grup – Tür Seçimi
                </h3>
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-4">
                    <Label className="w-24 shrink-0">Kategori*</Label>
                    <Select value={selectedKategori} onValueChange={(v) => { setSelectedKategori(v); setSelectedGrup(""); setSelectedTur(""); setGruplar([]); setTurler([]); }}>
                      <SelectTrigger><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {kategoriler.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label className="w-24 shrink-0">Grup*</Label>
                    <Select value={selectedGrup} onValueChange={(v) => { setSelectedGrup(v); setSelectedTur(""); setTurler([]); }} disabled={!selectedKategori}>
                      <SelectTrigger><SelectValue placeholder="Grup Seçin" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {gruplar.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label className="w-24 shrink-0">Tür*</Label>
                    <Select value={selectedTur} onValueChange={setSelectedTur} disabled={!selectedGrup}>
                      <SelectTrigger><SelectValue placeholder="Tür Seçin" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {turler.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Ürün Bilgileri */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Ürün Bilgileri</h3>
                <div className="space-y-4 max-w-xl">
                  <div>
                    <Label>Ürün Başlığı*</Label>
                    <Input value={baslik} onChange={e => setBaslik(e.target.value)} placeholder="Ürün başlığı" maxLength={200} />
                  </div>
                  <div>
                    <Label>Ürün Açıklaması*</Label>
                    <Textarea value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="Ürün açıklaması" maxLength={2000} />
                  </div>
                  <div>
                    <Label>Minimum Sipariş Miktarı*</Label>
                    <Input type="number" value={minSiparisMiktari} onChange={e => setMinSiparisMiktari(e.target.value)} placeholder="Minimum Sipariş Miktarı" min={1} />
                  </div>

                  {/* Fiyat Tipi */}
                  <div>
                    <Label>Fiyat Tipi</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setFiyatTipi("tek_fiyat")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${fiyatTipi === "tek_fiyat" ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${fiyatTipi === "tek_fiyat" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {fiyatTipi === "tek_fiyat" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <p className="font-semibold text-foreground">Tek Fiyat</p>
                        <p className="text-xs text-muted-foreground">Tüm sipariş miktarları için tek fiyat</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiyatTipi("varyasyonlu")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${fiyatTipi === "varyasyonlu" ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${fiyatTipi === "varyasyonlu" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {fiyatTipi === "varyasyonlu" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <p className="font-semibold text-foreground">Varyasyonlu Fiyat</p>
                        <p className="text-xs text-muted-foreground">Sipariş adedine göre değişen kademeli fiyatlandırma</p>
                      </button>
                    </div>
                  </div>

                  {fiyatTipi === "tek_fiyat" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Para Birimi*</Label>
                        <Select value={paraBirimi} onValueChange={setParaBirimi}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="TRY">₺ TRY</SelectItem>
                            <SelectItem value="USD">$ USD</SelectItem>
                            <SelectItem value="EUR">€ EUR</SelectItem>
                            <SelectItem value="GBP">£ GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Fiyat*</Label>
                        <Input type="number" value={fiyat} onChange={e => setFiyat(e.target.value)} placeholder="0.00" min={0} step="0.01" />
                      </div>
                    </div>
                  )}

                  {fiyatTipi === "varyasyonlu" && (
                    <div className="space-y-4">
                      <div>
                        <Label>Para Birimi*</Label>
                        <Select value={paraBirimi} onValueChange={setParaBirimi}>
                          <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="TRY">₺ TRY</SelectItem>
                            <SelectItem value="USD">$ USD</SelectItem>
                            <SelectItem value="EUR">€ EUR</SelectItem>
                            <SelectItem value="GBP">£ GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <h4 className="font-semibold text-foreground">Fiyat Aralıkları</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Minimum Adet</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Maksimum Adet</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Birim Fiyat</th>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Para Birimi</th>
                              <th className="px-4 py-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {varyasyonlar.map((v, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    value={v.min_adet}
                                    onChange={e => updateVaryasyon(idx, "min_adet", parseInt(e.target.value) || 0)}
                                    disabled={idx > 0}
                                    min={1}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    value={v.max_adet}
                                    onChange={e => updateVaryasyon(idx, "max_adet", parseInt(e.target.value) || 0)}
                                    min={v.min_adet + 1}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    value={v.birim_fiyat}
                                    onChange={e => updateVaryasyon(idx, "birim_fiyat", parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">
                                  {paraBirimi}
                                </td>
                                <td className="px-4 py-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVaryasyon(idx)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={addVaryasyon}
                          className="w-full py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t"
                        >
                          <Plus className="w-4 h-4" /> Yeni Varyasyon Ekle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Teknik Detaylar */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Teknik Detaylar — {kategoriName}</h3>
                {teknikAlanlar.length === 0 ? (
                  <p className="text-muted-foreground">Bu kategori için teknik detay bulunmamaktadır.</p>
                ) : (
                  <div className="space-y-4 max-w-xl">
                    {teknikAlanlar.map((alan) => (
                      <div key={alan.label}>
                        <Label>{alan.label}*</Label>
                        {alan.type === "dropdown" ? (
                          <Select
                            value={teknikDetaylar[alan.label] || ""}
                            onValueChange={(v) => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: v }))}
                          >
                            <SelectTrigger><SelectValue placeholder={`${alan.label} seçiniz`} /></SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {(dropdownOptions[alan.kategoriName!] || []).map(opt => (
                                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : alan.type === "date" ? (
                          <Input
                            type="date"
                            value={teknikDetaylar[alan.label] || ""}
                            onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))}
                          />
                        ) : alan.type === "number" ? (
                          <Input
                            type="number"
                            value={teknikDetaylar[alan.label] || ""}
                            onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))}
                            placeholder={alan.label}
                          />
                        ) : (
                          <Input
                            value={teknikDetaylar[alan.label] || ""}
                            onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))}
                            placeholder={alan.label}
                            maxLength={500}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Varyasyon / Onay */}
            {step === 3 && (
              <div className="space-y-6">
                {fiyatTipi === "varyasyonlu" ? (
                  <>
                    <h3 className="text-lg font-semibold">Fiyat Aralıkları</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Minimum Adet</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Maksimum Adet</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Birim Fiyat</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Para Birimi</th>
                            <th className="px-4 py-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {varyasyonlar.map((v, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  value={v.min_adet}
                                  onChange={e => updateVaryasyon(idx, "min_adet", parseInt(e.target.value) || 0)}
                                  disabled={idx > 0}
                                  min={1}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  value={v.max_adet}
                                  onChange={e => updateVaryasyon(idx, "max_adet", parseInt(e.target.value) || 0)}
                                  min={v.min_adet + 1}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  value={v.birim_fiyat}
                                  onChange={e => updateVaryasyon(idx, "birim_fiyat", parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step="0.01"
                                />
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {paraBirimi}
                              </td>
                              <td className="px-4 py-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVaryasyon(idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={addVaryasyon}
                        className="w-full py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t"
                      >
                        <Plus className="w-4 h-4" /> Yeni Varyasyon Ekle
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Ürün Onaya Hazır</h3>
                    <p className="text-muted-foreground">Tüm bilgiler tamamlandı. Ürünü onaya göndermek için "Gönder" butonuna tıklayın.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(step - 1) : navigate("/manupazar")}
          >
            Geri
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>İleri</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Gönderiliyor..." : "Gönder"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
