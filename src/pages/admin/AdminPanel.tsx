import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquareWarning, Gavel, Package } from "lucide-react";

export default function AdminPanel() {
  const { user } = useAdminAuth();

  const cards = [
    { title: "Panel Kullanıcıları", icon: Users, color: "from-blue-500 to-blue-600" },
    { title: "Şikayetler", icon: MessageSquareWarning, color: "from-red-500 to-red-600" },
    { title: "İhaleler", icon: Gavel, color: "from-emerald-500 to-emerald-600" },
    { title: "Ürünler", icon: Package, color: "from-purple-500 to-purple-600" },
  ];

  return (
    <AdminLayout title="Panel Özeti">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white">
            Hoş geldiniz, {user?.ad} {user?.soyad}
          </h2>
          <p className="text-slate-400 mt-1">
            {user?.is_primary ? "Ana Yönetici" : user?.pozisyon} olarak giriş yaptınız.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{card.title}</CardTitle>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">—</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
