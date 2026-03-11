import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Image, Upload, Trash2, ExternalLink, Monitor, MapPin, Maximize,
  CheckCircle2, XCircle, Pencil, X, Save,
} from "lucide-react";

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

export default function AdminReklam() {
  const lightMode = useAdminTheme();
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
    const ext = file.name.split(".").pop();
    const filePath = `${banner.slug}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Yükleme Hatası", description: uploadError.message, variant: "destructive" });
      setUploadingId(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    // Update banner record
    const { error: updateError } = await supabase
      .from("banners")
      .update({ gorsel_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", selectedBannerId);

    if (updateError) {
      toast({ title: "Güncelleme Hatası", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: `${banner.baslik} görseli güncellendi.` });
      // Log activity
      try {
        await supabase.functions.invoke("admin-auth/log-banner", {
          body: {
            token: localStorage.getItem("admin_token"),
            action: "Banner görseli güncellendi",
            bannerSlug: banner.slug,
            bannerBaslik: banner.baslik,
          },
        });
      } catch {}
      fetchBanners();
    }
    setUploadingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ gorsel_url: null, updated_at: new Date().toISOString() })
      .eq("id", banner.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Görsel kaldırıldı", description: `${banner.baslik} görseli kaldırıldı. Varsayılan görsel kullanılacak.` });
      fetchBanners();
    }
  };

  const handleToggleAktif = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ aktif: !banner.aktif, updated_at: new Date().toISOString() })
      .eq("id", banner.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      fetchBanners();
    }
  };

  const handleSaveLink = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ link_url: editLinkUrl || null, updated_at: new Date().toISOString() })
      .eq("id", banner.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link güncellendi" });
      setEditingId(null);
      fetchBanners();
    }
  };

  const t = lightMode;
  const cardBg = t ? "bg-white border-gray-200" : "bg-slate-800/50 border-slate-700/50";
  const textColor = t ? "text-gray-900" : "text-white";
  const mutedText = t ? "text-gray-500" : "text-slate-400";

  // Group banners by page
  const grouped = banners.reduce<Record<string, Banner[]>>((acc, b) => {
    if (!acc[b.sayfa]) acc[b.sayfa] = [];
    acc[b.sayfa].push(b);
    return acc;
  }, {});

  return (
    <AdminLayout title="Reklam Yönetimi">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={cardBg}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${textColor}`}>{banners.length}</p>
                  <p className={`text-xs ${mutedText}`}>Toplam Banner Alanı</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cardBg}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${textColor}`}>{banners.filter((b) => b.gorsel_url).length}</p>
                  <p className={`text-xs ${mutedText}`}>Görsel Yüklenen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cardBg}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${textColor}`}>{banners.filter((b) => !b.aktif).length}</p>
                  <p className={`text-xs ${mutedText}`}>Pasif Banner</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <h3 className={`text-sm font-semibold ${textColor}`}>{sayfa}</h3>
                <Badge variant="secondary" className="text-xs">{items.length} alan</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((banner) => (
                  <Card key={banner.id} className={`${cardBg} overflow-hidden`}>
                    <CardContent className="p-0">
                      {/* Preview area */}
                      <div className="relative bg-gray-100 dark:bg-slate-900 h-40 flex items-center justify-center overflow-hidden">
                        {banner.gorsel_url ? (
                          <img
                            src={banner.gorsel_url}
                            alt={banner.baslik}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-400">
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

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className={`font-semibold text-sm ${textColor}`}>{banner.baslik}</h4>
                            <p className={`text-xs ${mutedText} mt-0.5`}>{banner.slug}</p>
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
                            <span className={mutedText}>{banner.konum}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Maximize className="w-3 h-3 text-amber-500" />
                            <span className={mutedText}>{banner.boyut}</span>
                          </div>
                        </div>

                        {/* Link */}
                        {editingId === banner.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editLinkUrl}
                              onChange={(e) => setEditLinkUrl(e.target.value)}
                              placeholder="https://..."
                              className="h-8 text-xs"
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleSaveLink(banner)}>
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ExternalLink className={`w-3 h-3 ${mutedText}`} />
                            <span className={`text-xs truncate flex-1 ${banner.link_url ? textColor : mutedText}`}>
                              {banner.link_url || "Link yok"}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => { setEditingId(banner.id); setEditLinkUrl(banner.link_url || ""); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
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
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Kaldır
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
