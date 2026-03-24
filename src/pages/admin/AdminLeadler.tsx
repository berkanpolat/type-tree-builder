import { useEffect, useState } from "react";
import { useAdminTitle } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Users, Download, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface LeadRecord {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  kaynak: string;
  created_at: string;
}

const KAYNAK_LABELS: Record<string, string> = {
  tekihale_tanitim: "Tekİhale Tanıtım",
  tekpazar_tanitim: "TekPazar Tanıtım",
  genel: "Genel",
};

export default function AdminLeadler() {
  useAdminTitle("Lead Yönetimi");
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [aksiyonOpen, setAksiyonOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [aksiyonForm, setAksiyonForm] = useState({ tur: "arama", baslik: "", aciklama: "" });
  const [aksiyonSaving, setAksiyonSaving] = useState(false);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("lead_basvurular")
      .select("*")
      .order("created_at", { ascending: false });
    console.log("Lead fetch result:", { data, error });
    if (error) {
      console.error("Lead fetch error:", error);
    }
    setLeads((data as LeadRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(l =>
    !search || `${l.ad} ${l.soyad} ${l.email} ${l.telefon}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAksiyonEkle = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setAksiyonForm({ tur: "arama", baslik: `${lead.ad} ${lead.soyad} - Lead Takip`, aciklama: "" });
    setAksiyonOpen(true);
  };

  const handleAksiyonKaydet = async () => {
    if (!selectedLead || !user) return;
    setAksiyonSaving(true);
    try {
      // Find or skip firma — leads may not have a firma
      const { error } = await supabase.from("admin_aksiyonlar").insert({
        admin_id: user.id,
        firma_id: "00000000-0000-0000-0000-000000000000", // placeholder for non-firma leads
        baslik: aksiyonForm.baslik,
        aciklama: `[LEAD] ${selectedLead.ad} ${selectedLead.soyad} | ${selectedLead.email} | ${selectedLead.telefon}\n\nKaynak: ${KAYNAK_LABELS[selectedLead.kaynak] || selectedLead.kaynak}\n\n${aksiyonForm.aciklama}`,
        tur: aksiyonForm.tur,
        durum: "yapildi",
      });
      if (error) throw error;
      toast({ title: "Başarılı", description: "Aksiyon eklendi." });
      setAksiyonOpen(false);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Aksiyon eklenemedi", variant: "destructive" });
    } finally {
      setAksiyonSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="w-4 h-4" /> Toplam Lead
          </div>
          <p className="text-2xl font-bold text-foreground">{leads.length}</p>
        </div>
        {Object.entries(KAYNAK_LABELS).map(([key, label]) => {
          const count = leads.filter(l => l.kaynak === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Download className="w-4 h-4" /> {label}
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Ad, e-posta veya telefon ara..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Henüz lead başvurusu yok.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.ad} {lead.soyad}</TableCell>
                  <TableCell>
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {lead.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a href={`tel:${lead.telefon}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {lead.telefon}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {KAYNAK_LABELS[lead.kaynak] || lead.kaynak}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleAksiyonEkle(lead)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Aksiyon Ekle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Aksiyon Dialog */}
      <Dialog open={aksiyonOpen} onOpenChange={setAksiyonOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aksiyon Ekle</DialogTitle>
            <DialogDescription>
              {selectedLead && `${selectedLead.ad} ${selectedLead.soyad} için aksiyon oluşturun.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Aksiyon Türü</Label>
              <Select value={aksiyonForm.tur} onValueChange={(v) => setAksiyonForm(p => ({ ...p, tur: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arama">Arama</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="toplanti">Toplantı</SelectItem>
                  <SelectItem value="ziyaret">Ziyaret</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Başlık</Label>
              <Input
                value={aksiyonForm.baslik}
                onChange={(e) => setAksiyonForm(p => ({ ...p, baslik: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea
                value={aksiyonForm.aciklama}
                onChange={(e) => setAksiyonForm(p => ({ ...p, aciklama: e.target.value }))}
                placeholder="Aksiyon detayları..."
                rows={3}
              />
            </div>

            <Button onClick={handleAksiyonKaydet} disabled={aksiyonSaving} className="w-full">
              {aksiyonSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
