import { Link, useLocation } from "react-router-dom";
import logoImg from "@/assets/tekstil-as-logo.png";

export default function PublicHeader() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-7 object-contain" />
          </Link>
           <nav className="hidden md:flex items-center gap-6">
            <Link to="/firmalar" className={`text-sm font-medium transition-colors ${isActive("/firmalar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekRehber</Link>
            <Link to="/tekpazar" className={`text-sm font-medium transition-colors ${isActive("/tekpazar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekPazar</Link>
            <Link to="/ihaleler" className={`text-sm font-medium transition-colors ${isActive("/ihaleler") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>Tekİhale</Link>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <nav className="flex md:hidden items-center gap-1 mr-1">
            <Link to="/firmalar" className={`text-[11px] font-medium px-1.5 py-1 rounded ${isActive("/firmalar") ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:bg-muted"}`}>Rehber</Link>
            <Link to="/tekpazar" className={`text-[11px] font-medium px-1.5 py-1 rounded ${isActive("/tekpazar") ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:bg-muted"}`}>Pazar</Link>
            <Link to="/ihaleler" className={`text-[11px] font-medium px-1.5 py-1 rounded ${isActive("/ihaleler") ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:bg-muted"}`}>İhale</Link>
          </nav>
          <Link to="/#kayit" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">Fiyatlandırma</Link>
          <Link to="/hakkimizda" className={`hidden md:inline text-sm font-medium transition-colors ${isActive("/hakkimizda") ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>Hakkımızda</Link>
          <Link
            to="/giris-kayit"
            className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            Giriş Yap
          </Link>
          <Link
            to="/#kayit"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Kayıt Ol
          </Link>
        </div>
      </div>
    </header>
  );
}