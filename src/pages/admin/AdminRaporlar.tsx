import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { TrendingUp, Users, UserCheck, ClipboardList, Target } from "lucide-react";

const reportCards = [
  {
    title: "Satış Kanalı Raporları",
    description: "Paket satışlarının kanal bazlı dağılımı, performansı ve trend analizi",
    icon: TrendingUp,
    path: "/yonetim/raporlar/satis-kanali",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Müşteri Tipi Raporları",
    description: "Firma türü, tipi ve ölçeği bazında müşteri segmentasyonu",
    icon: Users,
    path: "/yonetim/raporlar/musteri-tipi",
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Personel Performans Raporları",
    description: "Personel bazlı aksiyon, ziyaret ve satış performans metrikleri",
    icon: UserCheck,
    path: "/yonetim/raporlar/personel-performans",
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Aksiyon Türü Raporları",
    description: "Aksiyon türlerine göre dağılım, başarı oranı ve sonuç analizi",
    icon: ClipboardList,
    path: "/yonetim/raporlar/aksiyon-turu",
    color: "from-orange-500 to-amber-500",
  },
  {
    title: "Hedef & Prim Raporları",
    description: "PKL hedefleri, gerçekleşme oranları ve prim hesaplamaları",
    icon: Target,
    path: "/yonetim/raporlar/hedef-prim",
    color: "from-rose-500 to-pink-500",
  },
];

export default function AdminRaporlar() {
  const lightMode = useAdminTheme();

  return (
    <AdminLayout title="Raporlar">
      <div className="max-w-5xl mx-auto">
        <p className="text-sm mb-6" style={{ color: `hsl(var(--admin-muted))` }}>
          Detaylı analiz ve raporlama araçlarına aşağıdan erişebilirsiniz.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="group rounded-xl border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{
                background: `hsl(var(--admin-card))`,
                borderColor: `hsl(var(--admin-border))`,
              }}
            >
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: `hsl(var(--admin-text))` }}>
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `hsl(var(--admin-muted))` }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
