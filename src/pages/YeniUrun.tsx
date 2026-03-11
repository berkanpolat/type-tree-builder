import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, FileText, Settings, Package, Plus, Trash2, X, Upload } from "lucide-react";

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

// Price tier (for varyasyonlu fiyat)
interface FiyatKademesi {
  min_adet: number;
  max_adet: number;
  birim_fiyat: number;
}

// Product variation (Renk + Beden/Birim + photo)
interface UrunVaryasyon {
  varyant_1_label: string;
  varyant_1_value: string;
  varyant_2_label: string;
  varyant_2_value: string;
  foto_url: string;
  foto_file?: File;
}

export default function YeniUrun() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("admin") === "1" && !!localStorage.getItem("admin_token");
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  // Step 0: Kategori
  const [kategoriler, setKategoriler] = useState<{ id: string; name: string }[]>([]);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedGrup, setSelectedGrup] = useState("");
  const [selectedTur, setSelectedTur] = useState("");
  const [kategoriName, setKategoriName] = useState("");

  // Step 1: Ürün Bilgileri + Fiyat
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [minSiparisMiktari, setMinSiparisMiktari] = useState("");
  const [fiyatTipi, setFiyatTipi] = useState("tek_fiyat");
  const [paraBirimi, setParaBirimi] = useState("TRY");
  const [fiyat, setFiyat] = useState("");
  const [fiyatKademeleri, setFiyatKademeleri] = useState<FiyatKademesi[]>([
    { min_adet: 1, max_adet: 10, birim_fiyat: 0 },
  ]);

  // Step 2: Teknik Detaylar
  const [teknikDetaylar, setTeknikDetaylar] = useState<Record<string, string>>({});
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, { id: string; name: string }[]>>({});

  // Step 3: Ürün Varyasyonları (Renk + Beden/Birim + Fotoğraf)
  const [varyasyonlar, setVaryasyonlar] = useState<UrunVaryasyon[]>([]);
  const [selectedV1, setSelectedV1] = useState<string[]>([]);
  const [selectedV2, setSelectedV2] = useState<string[]>([]);
  const [varyant1Options, setVaryant1Options] = useState<{ id: string; name: string }[]>([]);
  const [renkOptions, setRenkOptions] = useState<{ id: string; name: string }[]>([]);

  // Draft ID
  const [draftId, setDraftId] = useState<string | null>(editId || null);

  const isHazirGiyim = kategoriName?.toLowerCase().includes("hazır giyim");
  const varyant1Label = isHazirGiyim ? "Beden" : "Birim";
  const varyant2Label = "Renk";

  useEffect(() => { if (editId) loadUrun(editId); }, [editId]);
  useEffect(() => { fetchKategoriler(); }, []);
  useEffect(() => {
    if (selectedKategori) {
      fetchChildren(selectedKategori, setGruplar);
      const kat = kategoriler.find(k => k.id === selectedKategori);
      setKategoriName(kat?.name || "");
    }
  }, [selectedKategori, kategoriler]);
  useEffect(() => { if (selectedGrup) fetchChildren(selectedGrup, setTurler); }, [selectedGrup]);
  useEffect(() => { if (kategoriName) { loadTeknikDropdownOptions(); loadVaryantOptions(); } }, [kategoriName]);

  const fetchKategoriler = async () => {
    const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name")
      .eq("kategori_id", KATEGORI_ID).is("parent_id", null).order("name");
    if (data) setKategoriler(data);
  };

  const fetchChildren = async (parentId: string, setter: (v: { id: string; name: string }[]) => void) => {
    const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name")
      .eq("kategori_id", KATEGORI_ID).eq("parent_id", parentId).order("name");
    if (data) setter(data);
  };

  const loadVaryantOptions = async () => {
    const v1KatName = kategoriName?.toLowerCase().includes("hazır giyim") ? "Beden" : "Birim Türleri";
    const [v1Res, renkRes] = await Promise.all([
      supabase.from("firma_bilgi_kategorileri").select("id").eq("name", v1KatName).single(),
      supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "Renk").single(),
    ]);
    if (v1Res.data) {
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name")
        .eq("kategori_id", v1Res.data.id).is("parent_id", null).order("name");
      if (data) setVaryant1Options(data);
    }
    if (renkRes.data) {
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name")
        .eq("kategori_id", renkRes.data.id).is("parent_id", null).order("name");
      if (data) setRenkOptions(data);
    }
  };

  const loadTeknikDropdownOptions = async () => {
    const alanlar = getTeknikAlanlar();
    const dropdownAlanlar = alanlar.filter(a => a.type === "dropdown" && a.kategoriName);
    const kategoriNames = [...new Set(dropdownAlanlar.map(a => a.kategoriName!))];
    if (kategoriNames.length === 0) return;
    const { data: katData } = await supabase.from("firma_bilgi_kategorileri").select("id, name").in("name", kategoriNames);
    if (!katData) return;
    const newOpts: Record<string, { id: string; name: string }[]> = {};
    await Promise.all(katData.map(async (kat) => {
      const { data: secenekler } = await supabase.from("firma_bilgi_secenekleri").select("id, name")
        .eq("kategori_id", kat.id).is("parent_id", null).order("name");
      if (secenekler) newOpts[kat.name] = secenekler;
    }));
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

    const { data: vars } = await supabase.from("urun_varyasyonlar").select("*").eq("urun_id", urunId).order("created_at");
    if (vars && vars.length > 0) {
      // Separate price tiers from product variations
      const seenCombos = new Set<string>();
      const prodVars: UrunVaryasyon[] = [];
      const priceTiers: FiyatKademesi[] = [];

      for (const v of vars) {
        const comboKey = `${v.varyant_1_value}|${v.varyant_2_value}`;
        if (!seenCombos.has(comboKey)) {
          seenCombos.add(comboKey);
          prodVars.push({
            varyant_1_label: v.varyant_1_label,
            varyant_1_value: v.varyant_1_value,
            varyant_2_label: v.varyant_2_label || "",
            varyant_2_value: v.varyant_2_value || "",
            foto_url: v.foto_url,
          });
        }
        priceTiers.push({ min_adet: v.min_adet, max_adet: v.max_adet, birim_fiyat: v.birim_fiyat });
      }
      setVaryasyonlar(prodVars);
      if (priceTiers.length > 0) setFiyatKademeleri(priceTiers);
    }
  };

  const getTeknikAlanlar = () => {
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
    if (step === 0 && (!selectedKategori || !selectedGrup || !selectedTur)) {
      toast({ title: "Lütfen kategori, grup ve tür seçiniz.", variant: "destructive" }); return;
    }
    if (step === 1) {
      if (!baslik.trim()) { toast({ title: "Ürün başlığı zorunludur.", variant: "destructive" }); return; }
      if (fiyatTipi === "tek_fiyat" && !fiyat) { toast({ title: "Fiyat zorunludur.", variant: "destructive" }); return; }
      if (fiyatTipi === "varyasyonlu") {
        for (const k of fiyatKademeleri) {
          if (k.max_adet <= k.min_adet || k.birim_fiyat <= 0) {
            toast({ title: "Fiyat kademelerini doğru doldurunuz.", variant: "destructive" }); return;
          }
        }
      }
    }
    if (step === 2) {
      const alanlar = getTeknikAlanlar();
      for (const alan of alanlar) {
        if (!teknikDetaylar[alan.label]?.trim()) {
          toast({ title: `"${alan.label}" alanı zorunludur.`, variant: "destructive" }); return;
        }
      }
    }
    await saveDraft();
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const uploadVaryasyonFoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `varyasyonlar/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("urun-images").upload(path, file);
    if (error) { toast({ title: "Fotoğraf yüklenemedi", variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("urun-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    // Check aktif ürün quota (only for new products, not edits)
    if (!editId && !isAdminMode) {
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "aktif_urun");
      if (!check.allowed) {
        setUpgradeMessage(check.message || "Aktif ürün limitiniz dolmuştur.");
        setUpgradeOpen(true);
        return;
      }
    }

    if (varyasyonlar.length === 0) {
      toast({ title: "En az bir ürün varyasyonu ekleyiniz.", variant: "destructive" }); return;
    }
    for (const v of varyasyonlar) {
      if (!v.foto_url && !v.foto_file) {
        toast({ title: "Her varyasyon için fotoğraf zorunludur.", variant: "destructive" }); return;
      }
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id, baslik, aciklama,
      urun_kategori_id: selectedKategori, urun_grup_id: selectedGrup, urun_tur_id: selectedTur,
      fiyat_tipi: fiyatTipi,
      fiyat: fiyatTipi === "tek_fiyat" ? parseFloat(fiyat) : null,
      para_birimi: paraBirimi,
      min_siparis_miktari: minSiparisMiktari ? parseInt(minSiparisMiktari) : null,
      teknik_detaylar: teknikDetaylar,
      durum: "duzenleniyor",
    };

    let urunId = draftId;
    if (urunId) {
      await supabase.from("urunler").update(payload as any).eq("id", urunId);
    } else {
      const { data } = await supabase.from("urunler").insert([payload as any]).select("id").single();
      urunId = data?.id || null;
    }

    if (urunId) {
      await supabase.from("urun_varyasyonlar").delete().eq("urun_id", urunId);
      const dbRows = [];
      for (const v of varyasyonlar) {
        let fotoUrl = v.foto_url;
        if (v.foto_file) {
          const uploaded = await uploadVaryasyonFoto(v.foto_file);
          if (uploaded) fotoUrl = uploaded;
        }
        // For varyasyonlu, save each variation with price tiers
        if (fiyatTipi === "varyasyonlu") {
          for (const k of fiyatKademeleri) {
            dbRows.push({
              urun_id: urunId,
              varyant_1_label: v.varyant_1_label, varyant_1_value: v.varyant_1_value,
              varyant_2_label: v.varyant_2_label, varyant_2_value: v.varyant_2_value,
              min_adet: k.min_adet, max_adet: k.max_adet, birim_fiyat: k.birim_fiyat,
              foto_url: fotoUrl,
            });
          }
        } else {
          dbRows.push({
            urun_id: urunId,
            varyant_1_label: v.varyant_1_label, varyant_1_value: v.varyant_1_value,
            varyant_2_label: v.varyant_2_label, varyant_2_value: v.varyant_2_value,
            min_adet: 1, max_adet: 1, birim_fiyat: parseFloat(fiyat) || 0,
            foto_url: fotoUrl,
          });
        }
      }
      if (dbRows.length > 0) await supabase.from("urun_varyasyonlar").insert(dbRows as any);

      // Set first variation photo as main product photo if not already set
      const firstFoto = dbRows[0]?.foto_url;
      if (firstFoto) {
        await supabase.from("urunler").update({ foto_url: firstFoto }).eq("id", urunId);
      }
    }

    setSaving(false);
    toast({ title: "Ürün kaydedildi!" });
    navigate(`/urun/${urunId}`);
  };

  // --- Fiyat Kademesi helpers ---
  const addFiyatKademesi = () => {
    const last = fiyatKademeleri[fiyatKademeleri.length - 1];
    setFiyatKademeleri(prev => [...prev, { min_adet: last.max_adet + 1, max_adet: last.max_adet + 10, birim_fiyat: 0 }]);
  };

  const updateKademe = (idx: number, field: keyof FiyatKademesi, value: number) => {
    setFiyatKademeleri(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-adjust next kademe's min_adet
      if (field === "max_adet" && idx < updated.length - 1) {
        updated[idx + 1] = { ...updated[idx + 1], min_adet: value + 1 };
      }
      return updated;
    });
  };

  const removeKademe = (idx: number) => {
    setFiyatKademeleri(prev => prev.filter((_, i) => i !== idx));
  };

  // --- Varyasyon helpers ---
  const getOptionName = (options: { id: string; name: string }[], id: string) =>
    options.find(o => o.id === id)?.name || id;

  const toggleSelection = (list: string[], setList: (l: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter(i => i !== id) : [...list, id]);
  };

  const handleGenerateVaryasyonlar = () => {
    if (selectedV1.length === 0 || selectedV2.length === 0) return;
    const newItems: UrunVaryasyon[] = [];
    for (const v1 of selectedV1) {
      for (const v2 of selectedV2) {
        const v1Name = getOptionName(varyant1Options, v1);
        const v2Name = getOptionName(renkOptions, v2);
        if (!varyasyonlar.some(v => v.varyant_1_value === v1Name && v.varyant_2_value === v2Name) &&
            !newItems.some(v => v.varyant_1_value === v1Name && v.varyant_2_value === v2Name)) {
          newItems.push({
            varyant_1_label: varyant1Label, varyant_1_value: v1Name,
            varyant_2_label: varyant2Label, varyant_2_value: v2Name,
            foto_url: "",
          });
        }
      }
    }
    setVaryasyonlar(prev => [...prev, ...newItems]);
    setSelectedV1([]);
    setSelectedV2([]);
  };

  const handleVaryasyonFotoChange = (idx: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setVaryasyonlar(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], foto_url: previewUrl, foto_file: file };
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
            const isClickable = isAdminMode || isDone || isActive;
            return (
              <div key={label} className="flex items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(i)}
                  className="flex flex-col items-center disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive ? "border-primary bg-primary text-primary-foreground"
                    : isDone ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 text-center max-w-[80px] ${
                    isActive ? "text-primary font-semibold" : isDone ? "text-foreground" : "text-muted-foreground"
                  }`}>{label}</span>
                </button>
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
                  <Pencil className="w-5 h-5 text-primary" />
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

            {/* Step 1: Ürün Bilgileri + Fiyat */}
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
                      <button type="button" onClick={() => setFiyatTipi("tek_fiyat")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${fiyatTipi === "tek_fiyat" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${fiyatTipi === "tek_fiyat" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {fiyatTipi === "tek_fiyat" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <p className="font-semibold text-foreground">Tek Fiyat</p>
                        <p className="text-xs text-muted-foreground">Tüm sipariş miktarları için tek fiyat</p>
                      </button>
                      <button type="button" onClick={() => setFiyatTipi("varyasyonlu")}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${fiyatTipi === "varyasyonlu" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${fiyatTipi === "varyasyonlu" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {fiyatTipi === "varyasyonlu" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <p className="font-semibold text-foreground">Varyasyonlu Fiyat</p>
                        <p className="text-xs text-muted-foreground">Sipariş adedine göre kademeli fiyatlandırma</p>
                      </button>
                    </div>
                  </div>

                  {/* Tek Fiyat */}
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

                  {/* Varyasyonlu Fiyat — Kademeli Fiyat Tablosu */}
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

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Min Adet</TableHead>
                              <TableHead>Max Adet</TableHead>
                              <TableHead>Birim Fiyat</TableHead>
                              <TableHead>Para Birimi</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fiyatKademeleri.map((k, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Input type="number" value={k.min_adet}
                                    onChange={e => updateKademe(idx, "min_adet", parseInt(e.target.value) || 0)}
                                    disabled={idx > 0} className="w-24" min={1} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" value={k.max_adet}
                                    onChange={e => updateKademe(idx, "max_adet", parseInt(e.target.value) || 0)}
                                    className="w-24" min={k.min_adet + 1} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" value={k.birim_fiyat}
                                    onChange={e => updateKademe(idx, "birim_fiyat", parseFloat(e.target.value) || 0)}
                                    className="w-28" min={0} step="0.01" />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{paraBirimi}</TableCell>
                                <TableCell>
                                  {fiyatKademeleri.length > 1 && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeKademe(idx)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Button variant="outline" size="sm" onClick={addFiyatKademesi} className="gap-1">
                        <Plus className="w-4 h-4" /> Yeni Kademe Ekle
                      </Button>
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
                          <Select value={teknikDetaylar[alan.label] || ""}
                            onValueChange={(v) => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: v }))}>
                            <SelectTrigger><SelectValue placeholder={`${alan.label} seçiniz`} /></SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              {(dropdownOptions[alan.kategoriName!] || []).map(opt => (
                                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : alan.type === "date" ? (
                          <Input type="date" value={teknikDetaylar[alan.label] || ""} onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))} />
                        ) : alan.type === "number" ? (
                          <Input type="number" value={teknikDetaylar[alan.label] || ""} onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))} placeholder={alan.label} />
                        ) : (
                          <Input value={teknikDetaylar[alan.label] || ""} onChange={e => setTeknikDetaylar(prev => ({ ...prev, [alan.label]: e.target.value }))} placeholder={alan.label} maxLength={500} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Ürün Varyasyonları (sadece Renk + Beden/Birim + Fotoğraf) */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Ürün Varyasyonları
                </h3>

                {/* Variant selectors */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Varyant 1: Beden / Birim */}
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-sm mb-2 block">{varyant1Label}</Label>
                      <div className="flex flex-wrap gap-1 border rounded-lg p-2 min-h-[40px]">
                        {selectedV1.map(id => (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {getOptionName(varyant1Options, id)}
                            <button onClick={() => toggleSelection(selectedV1, setSelectedV1, id)}><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                        <select className="border-0 bg-transparent text-sm outline-none flex-1 min-w-[100px]" value=""
                          onChange={e => { if (e.target.value) toggleSelection(selectedV1, setSelectedV1, e.target.value); }}>
                          <option value="">Ekle...</option>
                          {varyant1Options.filter(o => !selectedV1.includes(o.id)).map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Varyant 2: Renk */}
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-sm mb-2 block">{varyant2Label}</Label>
                      <div className="flex flex-wrap gap-1 border rounded-lg p-2 min-h-[40px]">
                        {selectedV2.map(id => (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {getOptionName(renkOptions, id)}
                            <button onClick={() => toggleSelection(selectedV2, setSelectedV2, id)}><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                        <select className="border-0 bg-transparent text-sm outline-none flex-1 min-w-[100px]" value=""
                          onChange={e => { if (e.target.value) toggleSelection(selectedV2, setSelectedV2, e.target.value); }}>
                          <option value="">Ekle...</option>
                          {renkOptions.filter(o => !selectedV2.includes(o.id)).map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button onClick={handleGenerateVaryasyonlar} disabled={selectedV1.length === 0 || selectedV2.length === 0} className="mt-6">
                      <Plus className="w-4 h-4 mr-1" /> Ekle
                    </Button>
                  </div>
                </div>

                {/* Generated variations table — only photo, beden/birim, renk */}
                {varyasyonlar.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fotoğraf</TableHead>
                          <TableHead>{varyant1Label}</TableHead>
                          <TableHead>{varyant2Label}</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {varyasyonlar.map((v, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => { const file = e.target.files?.[0]; if (file) handleVaryasyonFotoChange(idx, file); }} />
                                {v.foto_url ? (
                                  <div className="w-12 h-12 rounded overflow-hidden border">
                                    <img src={v.foto_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary transition-colors">
                                    <Upload className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </label>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{v.varyant_1_value}</TableCell>
                            <TableCell className="text-sm">{v.varyant_2_value}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVaryasyon(idx)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate("/manupazar")}>Geri</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>İleri</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Kaydediliyor..." : "İlerle ve Önizle"}</Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
