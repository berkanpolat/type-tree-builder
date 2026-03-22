import { Link, useLocation } from "react-router-dom";
import MobileBackButton from "@/components/MobileBackButton";
import logoImg from "@/assets/tekstil-as-logo.png";

export default function PublicHeader() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-8">
          <MobileBackButton />
          <Link to="/">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-6 md:h-7 object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/firmalar" className={`text-sm font-medium transition-colors ${isActive("/firmalar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekRehber</Link>
            <Link to="/tekpazar" className={`text-sm font-medium transition-colors ${isActive("/tekpazar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekPazar</Link>
            <Link to="/ihaleler" className={`text-sm font-medium transition-colors ${isActive("/ihaleler") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>Tekİhale</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-5">
          <Link to="/#kayit" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">Fiyatlandırma</Link>
          <Link to="/hakkimizda" className={`hidden md:inline text-sm font-medium transition-colors ${isActive("/hakkimizda") ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>Hakkımızda</Link>
          <Link
            to="/giris-kayit"
            className="hidden md:inline-block px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            Giriş Yap
          </Link>
          <Link
            to="/#kayit"
            className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Kayıt Ol
          </Link>
        </div>
      </div>
    </header>
  );
}
