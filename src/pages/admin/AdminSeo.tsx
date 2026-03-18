import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminApi } from "@/hooks/use-admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Globe, AlertTriangle, CheckCircle2, XCircle, Edit2, Plus, Trash2, RefreshCw,
  FileText, Tag, Image, Link2, Code2, Eye, BarChart3, TrendingUp
} from "lucide-react";

interface SeoEntry {
  id: string;
  sayfa_slug: string;
  sayfa_adi: string;
  sayfa_tipi: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
  json_ld: any;
  h1_text: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

interface SeoAuditResult {
  slug: string;
  sayfa_adi: string;
  score: number;
  issues: { type: "error" | "warning" | "info"; message: string }[];
}

const emptySeoEntry: Partial<SeoEntry> = {
  sayfa_slug: "",
  sayfa_adi: "",
  sayfa_tipi: "statik",
  title: "",
  description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  og_image: "",
  canonical_url: "",
  robots: "index, follow",
  json_ld: null,
  h1_text: "",
  aktif: true,
};

const DYNAMIC_FALLBACKS: Record<string, { title: string; description: string }> = {
  "/:slug": {
    title: "[Firma Adı] | Tekstil A.Ş.",
    description: "[Firma Adı] firma profili, ürünleri ve iletişim bilgileri.",
  },
  "/ihaleler/:slug": {
    title: "[İhale Başlığı] | İhaleler | Tekstil A.Ş.",
    description: "[İhale Başlığı] ihale detayları, şartları ve başvuru bilgileri.",
  },
};

function auditSeoEntry(entry: SeoEntry): SeoAuditResult {
  const issues: SeoAuditResult["issues"] = [];
  let score = 100;

  const fallback = DYNAMIC_FALLBACKS[entry.sayfa_slug];
  const isDynamic = entry.sayfa_tipi === "dinamik";
  const effectiveTitle = entry.title || (isDynamic && fallback ? fallback.title : null);
  const effectiveDescription = entry.description || (isDynamic && fallback ? fallback.description : null);

  if (!effectiveTitle) {
    issues.push({ type: "error", message: "Title etiketi tanımlanmamış" });
    score -= 20;
  } else {
    if (!entry.title && isDynamic && fallback) {
      issues.push({ type: "info", message: "Title fallback sistemiyle otomatik üretiliyor" });
    }
    if (entry.title && entry.title.length < 30) {
      issues.push({ type: "warning", message: `Title çok kısa (${entry.title.length} karakter, min 30)` });
      score -= 5;
    }
    if (entry.title && entry.title.length > 60) {
      issues.push({ type: "warning", message: `Title çok uzun (${entry.title.length} karakter, max 60)` });
      score -= 5;
    }
  }

  if (!effectiveDescription) {
    issues.push({ type: "error", message: "Meta description tanımlanmamış" });
    score -= 20;
  } else {
    if (!entry.description && isDynamic && fallback) {
      issues.push({ type: "info", message: "Description fallback sistemiyle otomatik üretiliyor" });
    }
    if (entry.description && entry.description.length < 70) {
      issues.push({ type: "warning", message: `Description çok kısa (${entry.description.length} karakter, min 70)` });
      score -= 5;
    }
    if (entry.description && entry.description.length > 160) {
      issues.push({ type: "warning", message: `Description çok uzun (${entry.description.length} karakter, max 160)` });
      score -= 5;
    }
  }

  if (!entry.keywords) {
    issues.push({ type: "info", message: "Anahtar kelimeler tanımlanmamış" });
    score -= 3;
  }

  if (!entry.og_title && !effectiveTitle) {
    issues.push({ type: "warning", message: "Open Graph title tanımlanmamış" });
    score -= 5;
  }
  if (!entry.og_description && !effectiveDescription) {
    issues.push({ type: "warning", message: "Open Graph description tanımlanmamış" });
    score -= 5;
  }
  if (!entry.og_image) {
    issues.push({ type: "warning", message: "Open Graph image tanımlanmamış" });
    score -= 5;
  }

  if (!entry.canonical_url) {
    issues.push({ type: "info", message: "Canonical URL tanımlanmamış" });
    score -= 3;
  }

  if (!entry.json_ld) {
    issues.push({ type: "warning", message: "JSON-LD yapısal veri tanımlanmamış" });
    score -= 10;
  }

  if (!entry.h1_text && entry.sayfa_tipi === "statik") {
    issues.push({ type: "info", message: "H1 metni tanımlanmamış" });
    score -= 3;
  }

  if (entry.robots?.includes("noindex") && entry.sayfa_tipi !== "statik") {
    issues.push({ type: "warning", message: "Bu sayfa noindex olarak işaretlenmiş" });
  }

  if (issues.length === 0) {
    issues.push({ type: "info", message: "Tüm SEO kontrolleri başarılı!" });
  }

  return { slug: entry.sayfa_slug, sayfa_adi: entry.sayfa_adi, score: Math.max(0, score), issues };
}

export default function AdminSeo() {
  const callApi = useAdminApi();
  const { token } = useAdminAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<SeoEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [editEntry, setEditEntry] = useState<Partial<SeoEntry> | null>(null);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("yonetim");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi("seo-list", { token });
      setEntries(data?.entries || []);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callApi, token, toast]);

  useEffect(() => {
    if (token) fetchEntries();
  }, [fetchEntries, token]);

  const handleSave = async () => {
    if (!editEntry?.sayfa_slug || !editEntry?.sayfa_adi) {
      toast({ title: "Hata", description: "Sayfa slug ve adı zorunludur", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const action = editMode === "create" ? "seo-create" : "seo-update";
      await callApi(action, { token, entry: editEntry });
      toast({ title: "Başarılı", description: editMode === "create" ? "SEO kaydı oluşturuldu" : "SEO kaydı güncellendi" });
      setEditEntry(null);
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu SEO kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await callApi("seo-delete", { token, id });
      toast({ title: "Silindi" });
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchSearch = !search || e.sayfa_adi.toLowerCase().includes(search.toLowerCase()) || e.sayfa_slug.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || e.sayfa_tipi === filterType;
    return matchSearch && matchType;
  });

  const auditResults = entries.map(auditSeoEntry).sort((a, b) => a.score - b.score);
  const avgScore = auditResults.length ? Math.round(auditResults.reduce((s, r) => s + r.score, 0) / auditResults.length) : 0;
  const errorCount = auditResults.reduce((s, r) => s + r.issues.filter((i) => i.type === "error").length, 0);
  const warningCount = auditResults.reduce((s, r) => s + r.issues.filter((i) => i.type === "warning").length, 0);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const typeLabels: Record<string, string> = {
    statik: "Statik",
    dinamik: "Dinamik",
    kategori: "Kategori",
    landing: "Landing",
  };

  const typeBadgeColors: Record<string, string> = {
    statik: "bg-primary/10 text-primary border-primary/20",
    dinamik: "bg-secondary/10 text-secondary border-secondary/20",
    kategori: "bg-emerald-50 text-emerald-700 border-emerald-200",
    landing: "bg-violet-50 text-violet-700 border-violet-200",
  };

  const inputClass = "bg-[hsl(var(--admin-input-bg))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text))] placeholder:text-[hsl(var(--admin-muted))]";
  const labelClass = "text-[hsl(var(--admin-text-secondary))] text-xs font-medium";
  const sectionHeadingClass = "text-sm font-semibold text-[hsl(var(--admin-text-secondary))] flex items-center gap-1.5";

  return (
    <AdminLayout title="SEO Yönetimi">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[hsl(var(--admin-card-bg))] border border-[hsl(var(--admin-border))]">
            <TabsTrigger
              value="yonetim"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[hsl(var(--admin-text-secondary))]"
            >
              <Globe className="w-4 h-4 mr-1.5" /> Meta Yönetimi
            </TabsTrigger>
            <TabsTrigger
              value="analiz"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[hsl(var(--admin-text-secondary))]"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" /> SEO Analiz
            </TabsTrigger>
          </TabsList>

          {/* META YÖNETİMİ */}
          <TabsContent value="yonetim" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--admin-muted))]" />
                <Input
                  placeholder="Sayfa adı veya slug ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`pl-10 ${inputClass}`}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={`w-[160px] ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  <SelectItem value="statik">Statik</SelectItem>
                  <SelectItem value="dinamik">Dinamik</SelectItem>
                  <SelectItem value="kategori">Kategori</SelectItem>
                  <SelectItem value="landing">Landing</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => { setEditEntry({ ...emptySeoEntry }); setEditMode("create"); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-1" /> Yeni Sayfa
              </Button>
              <Button
                variant="outline"
                onClick={fetchEntries}
                disabled={loading}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-hover))]"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Yenile
              </Button>
            </div>

            <div className="rounded-lg border border-[hsl(var(--admin-border))] overflow-hidden bg-[hsl(var(--admin-card-bg))]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(var(--admin-hover))] border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Sayfa</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Slug</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Tip</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Title</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Skor</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold">Durum</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-semibold text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const audit = auditSeoEntry(entry);
                    return (
                      <TableRow key={entry.id} className="border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-hover))]">
                        <TableCell className="text-[hsl(var(--admin-text))] font-medium">{entry.sayfa_adi}</TableCell>
                        <TableCell className="text-[hsl(var(--admin-text-secondary))] font-mono text-xs">{entry.sayfa_slug}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${typeBadgeColors[entry.sayfa_tipi] || "border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))]"}`}>
                            {typeLabels[entry.sayfa_tipi] || entry.sayfa_tipi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[hsl(var(--admin-text))] max-w-[200px] truncate text-xs">
                          {entry.title || <span className="text-red-500 italic">Tanımsız</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold border ${getScoreBadge(audit.score)}`}>
                            {audit.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.aktif ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Aktif</Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">Pasif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditEntry({ ...entry }); setEditMode("edit"); }}
                              className="text-[hsl(var(--admin-muted))] hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                              className="text-[hsl(var(--admin-muted))] hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-[hsl(var(--admin-muted))] py-8">
                        {loading ? "Yükleniyor..." : "Kayıt bulunamadı"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* SEO ANALİZ */}
          <TabsContent value="analiz" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${getScoreBadge(avgScore)}`}>
                    <TrendingUp className={`w-6 h-6 ${getScoreColor(avgScore)}`} />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Ortalama Skor</p>
                    <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Toplam Sayfa</p>
                    <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{entries.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50 border border-red-200">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Kritik Hata</p>
                    <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Uyarı</p>
                    <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audit Results */}
            <div className="space-y-3">
              {auditResults.map((result) => (
                <Card key={result.slug} className={`border bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border ${getScoreBadge(result.score)}`}>
                          {result.score}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--admin-text))]">{result.sayfa_adi}</p>
                          <p className="text-xs text-[hsl(var(--admin-muted))] font-mono">{result.slug}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={() => {
                          const entry = entries.find((e) => e.sayfa_slug === result.slug);
                          if (entry) {
                            setEditEntry({ ...entry });
                            setEditMode("edit");
                            setActiveTab("yonetim");
                          }
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Düzenle
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            issue.type === "error"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : issue.type === "warning"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-primary/5 text-primary border border-primary/20"
                          }`}
                        >
                          {issue.type === "error" ? <XCircle className="w-3 h-3" /> : issue.type === "warning" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit / Create Dialog */}
        <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text))]">
            <DialogHeader>
              <DialogTitle className="text-[hsl(var(--admin-text))]">
                {editMode === "create" ? "Yeni SEO Kaydı" : "SEO Kaydı Düzenle"}
              </DialogTitle>
            </DialogHeader>

            {editEntry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temel Bilgiler */}
                <div className="space-y-3 md:col-span-2">
                  <h4 className={sectionHeadingClass}>
                    <Globe className="w-4 h-4" /> Temel Bilgiler
                  </h4>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Sayfa Adı *</Label>
                  <Input
                    value={editEntry.sayfa_adi || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, sayfa_adi: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Sayfa Slug *</Label>
                  <Input
                    value={editEntry.sayfa_slug || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, sayfa_slug: e.target.value })}
                    className={inputClass}
                    disabled={editMode === "edit"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Sayfa Tipi</Label>
                  <Select value={editEntry.sayfa_tipi || "statik"} onValueChange={(v) => setEditEntry({ ...editEntry, sayfa_tipi: v })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="statik">Statik</SelectItem>
                      <SelectItem value="dinamik">Dinamik</SelectItem>
                      <SelectItem value="kategori">Kategori</SelectItem>
                      <SelectItem value="landing">Landing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editEntry.aktif ?? true}
                      onCheckedChange={(v) => setEditEntry({ ...editEntry, aktif: v })}
                    />
                    <Label className={labelClass}>Aktif</Label>
                  </div>
                </div>

                {/* SEO Meta */}
                <div className="space-y-3 md:col-span-2 pt-3 border-t border-[hsl(var(--admin-border))]">
                  <h4 className={sectionHeadingClass}>
                    <Tag className="w-4 h-4" /> SEO Meta Etiketleri
                  </h4>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>
                    Title <span className="text-[hsl(var(--admin-muted))]">({editEntry.title?.length || 0}/60)</span>
                  </Label>
                  <Input
                    value={editEntry.title || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, title: e.target.value })}
                    className={inputClass}
                    maxLength={70}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>
                    Description <span className="text-[hsl(var(--admin-muted))]">({editEntry.description?.length || 0}/160)</span>
                  </Label>
                  <Textarea
                    value={editEntry.description || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, description: e.target.value })}
                    className={inputClass}
                    rows={2}
                    maxLength={170}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>Keywords (virgülle ayırın)</Label>
                  <Input
                    value={editEntry.keywords || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, keywords: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>H1 Metni</Label>
                  <Input
                    value={editEntry.h1_text || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, h1_text: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Robots</Label>
                  <Select value={editEntry.robots || "index, follow"} onValueChange={(v) => setEditEntry({ ...editEntry, robots: v })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">index, follow</SelectItem>
                      <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                      <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                      <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Open Graph */}
                <div className="space-y-3 md:col-span-2 pt-3 border-t border-[hsl(var(--admin-border))]">
                  <h4 className={sectionHeadingClass}>
                    <Image className="w-4 h-4" /> Open Graph
                  </h4>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>OG Title</Label>
                  <Input
                    value={editEntry.og_title || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, og_title: e.target.value })}
                    className={inputClass}
                    placeholder="Boşsa title kullanılır"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>OG Image URL</Label>
                  <Input
                    value={editEntry.og_image || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, og_image: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>OG Description</Label>
                  <Textarea
                    value={editEntry.og_description || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, og_description: e.target.value })}
                    className={inputClass}
                    rows={2}
                    placeholder="Boşsa description kullanılır"
                  />
                </div>

                {/* Teknik */}
                <div className="space-y-3 md:col-span-2 pt-3 border-t border-[hsl(var(--admin-border))]">
                  <h4 className={sectionHeadingClass}>
                    <Code2 className="w-4 h-4" /> Teknik
                  </h4>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>Canonical URL</Label>
                  <Input
                    value={editEntry.canonical_url || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, canonical_url: e.target.value })}
                    className={inputClass}
                    placeholder="https://tekstilas.com/..."
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelClass}>JSON-LD (Yapısal Veri)</Label>
                  <Textarea
                    value={editEntry.json_ld ? (typeof editEntry.json_ld === "string" ? editEntry.json_ld : JSON.stringify(editEntry.json_ld, null, 2)) : ""}
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                        setEditEntry({ ...editEntry, json_ld: parsed });
                      } catch {
                        setEditEntry({ ...editEntry, json_ld: e.target.value });
                      }
                    }}
                    className={`${inputClass} font-mono text-xs`}
                    rows={5}
                    placeholder='{"@context": "https://schema.org", ...}'
                  />
                </div>

                {/* SERP Preview */}
                <div className="md:col-span-2 pt-3 border-t border-[hsl(var(--admin-border))]">
                  <h4 className={`${sectionHeadingClass} mb-3`}>
                    <Eye className="w-4 h-4" /> Google Önizleme
                  </h4>
                  <div className="bg-white rounded-lg p-4 space-y-1 border border-gray-200">
                    <p className="text-sm text-green-700 font-mono">
                      tekstilas.com{editEntry.sayfa_slug !== "/" ? editEntry.sayfa_slug : ""}
                    </p>
                    <p className="text-xl text-blue-800 font-medium leading-tight hover:underline cursor-pointer">
                      {editEntry.title || "Sayfa Başlığı Giriniz"}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {editEntry.description || "Meta açıklama giriniz..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditEntry(null)}
                className="border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-hover))]"
              >
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
