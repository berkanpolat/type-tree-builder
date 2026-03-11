import { Link } from "react-router-dom";
import logoImg from "@/assets/tekstil-as-logo.png";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-7 object-contain" />
        </Link>
        <Link
          to="/giris-kayit"
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Giriş Yap / Kayıt Ol
        </Link>
      </div>
    </header>
  );
}
