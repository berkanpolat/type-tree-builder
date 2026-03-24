import { useEffect, useState } from "react";
import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useAdminApi } from "@/hooks/use-admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Download, Phone, Mail, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface LeadRecord {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  kaynak: string;
  arandi: boolean;
  created_at: string;
}

const KAYNAK_LABELS: Record<string, string> = {
  tekihale_tanitim: "Tekİhale Tanıtım",
  tekpazar_tanitim: "TekPazar Tanıtım",
  landing_page: "Ana Sayfa",
  genel: "Genel",
};

export default function AdminLeadler() {
  useAdminTitle("Lead Yönetimi");
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLeads = async () => {
    if (!token) return;
    try {
      const data = await callApi("list-leads", { token });
      setLeads((data?.leads as LeadRecord[]) || []);
    } catch (err: any) {
      console.error("Lead fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [token]);

  const filtered = leads.filter(l =>
    !search || `${l.ad} ${l.soyad} ${l.email} ${l.telefon}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleArandi = async (lead: LeadRecord) => {
    const newValue = !lead.arandi;
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, arandi: newValue } : l));
    try {
      await callApi("update-lead", { token, leadId: lead.id, arandi: newValue });
    } catch (err: any) {
      // Revert on error
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, arandi: !newValue } : l));
      toast({ title: "Hata", description: err?.message || "Güncelleme başarısız", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <PhoneCall className="w-4 h-4" /> Aranan
          </div>
          <p className="text-2xl font-bold text-foreground">{leads.filter(l => l.arandi).length}</p>
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
              <TableHead className="text-center">Arandı</TableHead>
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
                <TableRow key={lead.id} className={lead.arandi ? "opacity-60" : ""}>
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
                  <TableCell className="text-center">
                    <Switch
                      checked={lead.arandi}
                      onCheckedChange={() => handleToggleArandi(lead)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
