import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import PublicHeader from "@/components/PublicHeader";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Search, Home, Building2, ShoppingBag, Gavel } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);

  useSeoMeta({
    slug: "/404",
    fallbackTitle: "Sayfa Bulunamadı | Tekstil A.Ş.",
    fallbackDescription: "Aradığınız sayfa bulunamadı. Tekstil A.Ş. platformunda arama yaparak ihtiyacınıza uygun firmayı, ürünü veya ihaleyi bulabilirsiniz.",
  });

  // Set noindex meta
  useEffect(() => {
    let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");

    return () => {
      el?.setAttribute("content", "index, follow");
    };
  }, []);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: firma } = await supabase
          .from("firmalar")
          .select("firma_unvani, logo_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (firma) {
          setFirmaUnvani(firma.firma_unvani);
          setFirmaLogoUrl(firma.logo_url);
        }
      }
    };
    init();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/firmalar?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const quickLinks = [
    { to: "/", label: "Ana Sayfa", icon: Home, desc: "Platformun ana sayfasına dön" },
    { to: "/firmalar", label: "TekRehber", icon: Building2, desc: "Firma rehberinde ara" },
    { to: "/tekpazar", label: "TekPazar", icon: ShoppingBag, desc: "Ürünleri keşfet" },
    { to: "/ihaleler", label: "Tekİhale", icon: Gavel, desc: "Açık ihaleleri gör" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn ? <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} /> : <PublicHeader />}

      <main className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* 404 Badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary/10 mx-auto">
            <span className="text-4xl font-bold text-secondary">404</span>
          </div>

          {/* Message */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Sayfa Bulunamadı
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Aradığınız sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir.
              Aşağıdaki arama çubuğunu kullanarak ihtiyacınıza uygun içeriği bulabilirsiniz.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center bg-muted/50 border border-border rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-secondary/30 focus-within:border-secondary transition-all">
              <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Firma, ürün veya hizmet ara..."
                className="flex-1 bg-transparent text-foreground text-sm h-10 px-2 outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/90 transition-colors shrink-0"
              >
                Ara
              </button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-secondary/40 hover:bg-secondary/5 transition-all group"
              >
                <link.icon className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                <span className="text-sm font-medium text-foreground">{link.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
