import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePackageQuota } from "@/hooks/use-package-quota";
import { Crown, ChevronDown, ChevronUp, Eye, FileText, ShoppingBag, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function QuotaReminderBadge() {
  const pkg = usePackageQuota();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isPro = pkg.paketSlug === "pro";

  if (pkg.loading) return null;

  const quotaItems = [
    {
      icon: Eye,
      label: "Profil Görüntüleme",
      used: pkg.usage.profil_goruntuleme,
      limit: pkg.limits.profil_goruntuleme_limiti,
    },
    {
      icon: FileText,
      label: "Teklif Verme",
      used: pkg.usage.teklif_verme,
      limit: pkg.limits.teklif_verme_limiti,
    },
    {
      icon: ShoppingBag,
      label: "Aktif Ürün",
      used: pkg.usage.aktif_urun,
      limit: pkg.limits.aktif_urun_limiti,
    },
    {
      icon: MessageSquare,
      label: "Mesaj",
      used: pkg.usage.mesaj,
      limit: pkg.limits.mesaj_limiti,
    },
  ];

  const criticalCount = quotaItems.filter((q) => {
    if (q.limit === null) return false;
    if (q.limit === 0) return true;
    return q.used >= q.limit;
  }).length;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm"
      >
        <Badge
          variant={isPro ? "default" : "secondary"}
          className={`text-[10px] px-1.5 py-0 ${isPro ? "bg-primary" : "bg-muted-foreground/20 text-foreground"}`}
        >
          {isPro ? "PRO" : "Ücretsiz"}
        </Badge>
        {criticalCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{pkg.paketAd} Paket</span>
          </div>

          <div className="space-y-2.5">
            {quotaItems.map((q) => {
              const isUnlimited = q.limit === null;
              const isBlocked = q.limit === 0;
              const isFull = !isUnlimited && !isBlocked && q.used >= q.limit;
              const percentage = isUnlimited ? 100 : isBlocked ? 100 : q.limit > 0 ? Math.min((q.used / q.limit) * 100, 100) : 0;

              return (
                <div key={q.label}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <q.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {q.label}
                    </span>
                    <span className={`font-medium ${isFull || isBlocked ? "text-destructive" : "text-muted-foreground"}`}>
                      {isUnlimited ? "Sınırsız" : isBlocked ? "Yok" : `${q.used}/${q.limit}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull || isBlocked ? "bg-destructive" : percentage > 70 ? "bg-yellow-500" : "bg-primary"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isPro && (
            <Button
              size="sm"
              className="w-full mt-3 gap-1.5 text-xs h-8"
              onClick={() => { setExpanded(false); navigate("/paketim"); }}
            >
              <Crown className="w-3.5 h-3.5" />
              PRO Pakete Yükselt
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
