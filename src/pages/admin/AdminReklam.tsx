import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useEffect, useState, useRef, CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { invalidateBannerCache } from "@/hooks/use-banner";
import {
  Image, Upload, Trash2, ExternalLink, Monitor, MapPin, Maximize,
  CheckCircle2, XCircle, Pencil, X, Save,
} from "lucide-react";

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
};

interface Banner {
  id: string;
  slug: string;
  baslik: string;
  sayfa: string;
  konum: string;
  boyut: string;
  gorsel_url: string | null;
  link_url: string | null;
  aktif: boolean;
  updated_at: string;
}

async function adminCall(action: string, body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, {
    body: { token: localStorage.getItem("admin_token"), ...body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminReklam() {
  useAdminTitle("Reklam Yönetimi");
  const { toast } = useToast();
  const { user } = useAdminAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sayfa")
      .order("konum");
    if (data) setBanners(data as Banner[]);
    if (error) toast({ title: "Hata", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleFileSelect = (bannerId: string) => {
    setSelectedBannerId(bannerId);
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBannerId) return;

    const banner = banners.find((b) => b.id === selectedBannerId);
    if (!banner) return;

    setUploadingId(selectedBannerId);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      const result = await adminCall("upload-banner", {
        bannerId: selectedBannerId,
        slug: banner.slug,
        fileName: file.name,
        fileBase64,
        contentType: file.type,
      });

      toast({ title: "Başarılı", description: `${banner.baslik} görseli güncellendi.` });
      invalidateBannerCache(banner.slug);
      fetchBanners();
    } catch (err: any) {
      toast({ title: "Yükleme Hatası", description: err.message, variant: "destructive" });
    }

    setUploadingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = async (banner: Banner) => {
    try {
      await adminCall("update-banner", { bannerId: banner.id, gorsel_url: null });
      toast({ title: "Görsel kaldırıldı", description: `${banner.baslik} görseli kaldırıldı.` });
      invalidateBannerCache(banner.slug);
      fetchBanners();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleAktif = async (banner: Banner) => {
    try {
      await adminCall("update-banner", { bannerId: banner.id, aktif: !banner.aktif });
      invalidateBannerCache(banner.slug);
      fetchBanners();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveLink = async (banner: Banner) => {
    try {
      await adminCall("update-banner", { bannerId: banner.id, link_url: editLinkUrl || null });
      toast({ title: "Link güncellendi" });
      setEditingId(null);
      invalidateBannerCache(banner.slug);
      fetchBanners();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const grouped = banners.reduce<Record<string, Banner[]>>((acc, b) => {
    if (!acc[b.sayfa]) acc[b.sayfa] = [];
    acc[b.sayfa].push(b);
    return acc;
  }, {});

  return (
    <>
    <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl" style={s.card}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={s.text}>{banners.length}</p>
                <p className="text-xs" style={s.muted}>Toplam Banner Alanı</p>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl" style={s.card}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={s.text}>{banners.filter((b) => b.gorsel_url).length}</p>
                <p className="text-xs" style={s.muted}>Görsel Yüklenen</p>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl" style={s.card}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={s.text}>{banners.filter((b) => !b.aktif).length}</p>
                <p className="text-xs" style={s.muted}>Pasif Banner</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          Object.entries(grouped).map(([sayfa, items]) => (
            <div key={sayfa} className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold" style={s.text}>{sayfa}</h3>
                <Badge variant="secondary" className="text-xs" style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))" }}>{items.length} alan</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((banner) => (
                  <div key={banner.id} className="rounded-xl overflow-hidden" style={s.card}>
                    <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: "hsl(var(--admin-input-bg))" }}>
                      {banner.gorsel_url ? (
                        <img
                          src={banner.gorsel_url}
                          alt={banner.baslik}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2" style={s.muted}>
                          <Image className="w-10 h-10" />
                          <span className="text-xs">Varsayılan görsel kullanılıyor</span>
                        </div>
                      )}
                      {!banner.aktif && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive">PASİF</Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm" style={s.text}>{banner.baslik}</h4>
                          <p className="text-xs mt-0.5" style={s.muted}>{banner.slug}</p>
                        </div>
                        <Switch
                          checked={banner.aktif}
                          onCheckedChange={() => handleToggleAktif(banner)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span style={s.muted}>{banner.konum}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Maximize className="w-3 h-3 text-amber-500" />
                          <span style={s.muted}>{banner.boyut}</span>
                        </div>
                      </div>

                      {editingId === banner.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editLinkUrl}
                            onChange={(e) => setEditLinkUrl(e.target.value)}
                            placeholder="https://..."
                            className="h-8 text-xs"
                            style={s.input}
                          />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleSaveLink(banner)} style={s.text}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)} style={s.text}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" style={s.muted} />
                          <span className="text-xs truncate flex-1" style={banner.link_url ? s.text : s.muted}>
                            {banner.link_url || "Link yok"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => { setEditingId(banner.id); setEditLinkUrl(banner.link_url || ""); }}
                            style={s.muted}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 min-w-[120px] gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                          disabled={uploadingId === banner.id}
                          onClick={() => handleFileSelect(banner.id)}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingId === banner.id ? "Yükleniyor..." : "Görsel Yükle"}
                        </Button>
                        {banner.gorsel_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleRemoveImage(banner)}
                            style={s.input}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Kaldır
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
