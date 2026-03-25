import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import MobileBackButton from "@/components/MobileBackButton";
import HeaderMegaMenu from "@/components/HeaderMegaMenu";
import logoImg from "@/assets/tekstil-as-logo.png";

export default function PublicHeader() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const [openMenu, setOpenMenu] = useState<"tekrehber" | "tekpazar" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (menu: "tekrehber" | "tekpazar") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  };

  const handleMenuMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-2 lg:gap-8 min-w-0">
          <MobileBackButton />
          <Link to="/" className="shrink-0 flex items-center">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-8 md:h-10 object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {/* TekRehber with mega menu */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => handleMouseEnter("tekrehber")}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                to="/firmalar"
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive("/firmalar")
                    ? "text-secondary border-b-2 border-secondary pb-0.5"
                    : "text-muted-foreground hover:text-secondary"
                }`}
              >
                TekRehber
              </Link>
              {openMenu === "tekrehber" && (
                <div onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMouseLeave}>
                  <HeaderMegaMenu type="tekrehber" onClose={() => setOpenMenu(null)} />
                </div>
              )}
            </div>

            {/* TekPazar with mega menu */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => handleMouseEnter("tekpazar")}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                to="/tekpazar"
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive("/tekpazar")
                    ? "text-secondary border-b-2 border-secondary pb-0.5"
                    : "text-muted-foreground hover:text-secondary"
                }`}
              >
                TekPazar
              </Link>
              {openMenu === "tekpazar" && (
                <div onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMouseLeave}>
                  <HeaderMegaMenu type="tekpazar" onClose={() => setOpenMenu(null)} />
                </div>
              )}
            </div>

            <Link
              to="/ihaleler"
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                isActive("/ihaleler")
                  ? "text-secondary border-b-2 border-secondary pb-0.5"
                  : "text-muted-foreground hover:text-secondary"
              }`}
            >
              Tekİhale
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <Link
            to="/#kayit"
            className="hidden lg:inline-block text-sm font-medium text-muted-foreground hover:text-secondary transition-colors whitespace-nowrap"
          >
            Fiyatlandırma
          </Link>
          <Link
            to="/hakkimizda"
            className={`hidden lg:inline-block text-sm font-medium transition-colors whitespace-nowrap ${
              isActive("/hakkimizda") ? "text-secondary" : "text-muted-foreground hover:text-secondary"
            }`}
          >
            Hakkımızda
          </Link>
          <Link
            to="/giris-kayit"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Giriş / Kayıt
          </Link>
        </div>
      </div>
    </header>
  );
}
