import { Link, useNavigate } from "react-router-dom";
import logoImg from "@/assets/tekstil-as-logo.png";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaLinkedinIn, FaInstagram, FaFacebookF, FaXTwitter } from "react-icons/fa6";

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => { navigate(to); window.scrollTo(0, 0); }}
      className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors text-left"
    >
      {children}
    </button>
  );
}

export default function Footer() {
  return (
    <footer className="bg-primary mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo & Company Info */}
          <div className="space-y-4">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-8 brightness-0 invert" />
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              Manufixo Bilişim Teknolojileri A.Ş. tarafından geliştirilmiştir.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Mail className="w-4 h-4 shrink-0" />
                <span>info@tekstilas.com</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Phone className="w-4 h-4 shrink-0" />
                <span>+90 850 242 5700</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Ataşehir, İstanbul</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://www.linkedin.com/company/tekstilas/?originalSubdomain=tr" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors">
                <FaLinkedinIn className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.instagram.com/tekstilascom/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors">
                <FaInstagram className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.facebook.com/tekstilas" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors">
                <FaFacebookF className="w-3.5 h-3.5" />
              </a>
              <span className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/30 cursor-default" title="Yakında">
                <FaXTwitter className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Manufixo Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Tekstil A.Ş.</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/hakkimizda" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link to="/iletisim" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Modüller Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Modüller</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/anasayfa" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  Üretici &amp; tedarikçi keşfi
                </Link>
              </li>
              <li>
                <Link to="/tekihale" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  TekIhale – Teklif alma &amp; verme sistemi
                </Link>
              </li>
              <li>
                <Link to="/anasayfa" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  TekPazar – B2B ürün listeleme
                </Link>
              </li>
            </ul>
          </div>

          {/* Kurumsal Bilgi Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Kurumsal Bilgi</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  SSS
                </Link>
              </li>
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  Gizlilik Koşulları
                </Link>
              </li>
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  Kullanım Koşulları &amp; Üyelik Sözleşmesi
                </Link>
              </li>
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-primary-foreground/10">
          <p className="text-primary-foreground/50 text-sm text-center">
            © 2026 Tekstil A.Ş. – Manufixo Bilişim Teknolojileri A.Ş. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
