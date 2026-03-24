import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Pencil, X, Check, Upload, ImageIcon } from "lucide-react";

interface Referans {
  id: string;
  referans_adi: string;
  logo_url: string | null;
}

interface ReferanslarTabProps {
  userId: string;
  onDataChange?: () => void;
}

export default function ReferanslarTab({ userId, onDataChange }: ReferanslarTabProps) {
  const [firmaId, setFirmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [referanslar, setReferanslar] = useState<Referans[]>([]);

  const [referansAdi, setReferansAdi] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const firmaRes = await supabase.from("firmalar").select("id").eq("user_id", userId).single();
      if (firmaRes.data) {
        setFirmaId(firmaRes.data.id);
        const { data } = await supabase
          .from("firma_referanslar")
          .select("*")
          .eq("firma_id", firmaRes.data.id)
          .order("created_at");
        if (data) setReferanslar(data.map(r => ({ id: r.id, referans_adi: r.referans_adi, logo_url: r.logo_url })));
      }
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  const resetForm = () => {
    setReferansAdi("");
    setLogoFile(null);
    setLogoPreview(null);
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `referanslar/${firmaId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("firma-images").upload(fileName, file, { upsert: true });
    if (error) { toast({ title: "Yükleme hatası", description: error.message, variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("firma-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!referansAdi.trim()) {
      toast({ title: "Hata", description: "Referans adı giriniz.", variant: "destructive" });
      return;
    }

    setUploading(true);
    let logoUrl: string | null = null;

    if (logoFile) {
      logoUrl = await uploadLogo(logoFile);
      if (!logoUrl) { setUploading(false); return; }
    }

    if (editingId) {
      const updatePayload: any = { referans_adi: referansAdi };
      if (logoUrl) updatePayload.logo_url = logoUrl;

      const { error } = await supabase.from("firma_referanslar").update(updatePayload).eq("id", editingId);
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); setUploading(false); return; }

      setReferanslar(prev => prev.map(r => r.id === editingId ? {
        ...r,
        referans_adi: referansAdi,
        logo_url: logoUrl || r.logo_url,
      } : r));
      toast({ title: "Güncellendi" });
    } else {
      const { data, error } = await supabase.from("firma_referanslar").insert({
        firma_id: firmaId,
        referans_adi: referansAdi,
        logo_url: logoUrl,
      }).select().single();
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); setUploading(false); return; }
      setReferanslar(prev => [...prev, { id: data.id, referans_adi: referansAdi, logo_url: logoUrl }]);
      toast({ title: "Referans eklendi" });
    }

    setUploading(false);
    resetForm();
  };

  const handleEdit = (r: Referans) => {
    setEditingId(r.id);
    setReferansAdi(r.referans_adi);
    setLogoPreview(r.logo_url);
    setLogoFile(null);
  };

  const handleDelete = async (id: string) => {
    const ref = referanslar.find(r => r.id === id);
    const { error } = await supabase.from("firma_referanslar").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }

    // Try to delete storage file
    if (ref?.logo_url) {
      const path = ref.logo_url.split("/firma-images/")[1];
      if (path) await supabase.storage.from("firma-images").remove([path]);
    }

    setReferanslar(prev => prev.filter(r => r.id !== id));
    if (editingId === id) resetForm();
    toast({ title: "Referans silindi" });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Referanslar</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Referans Logosu</Label>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded border border-border" />
            ) : (
              <div className="w-12 h-12 rounded border border-dashed border-border flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <div className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
                <Upload className="w-4 h-4" />
                Logo Yükle
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Referans Adı</Label>
          <Input placeholder="Referans Adı" value={referansAdi} onChange={e => setReferansAdi(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={uploading} className="gap-1.5">
          {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {uploading ? "Yükleniyor..." : editingId ? "Güncelle" : "Referans Ekle"}
        </Button>
        {editingId && (
          <Button variant="outline" onClick={resetForm} className="gap-1.5">
            <X className="w-4 h-4" /> İptal
          </Button>
        )}
      </div>

      {referanslar.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {referanslar.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-4 border border-border rounded-lg bg-background">
              {r.logo_url ? (
                <img src={r.logo_url} alt={r.referans_adi} className="w-12 h-12 object-contain rounded" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span className="flex-1 font-medium text-foreground truncate">{r.referans_adi}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(r)} className="h-8 w-8">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
