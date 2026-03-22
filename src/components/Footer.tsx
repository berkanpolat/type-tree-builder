import { Link, useNavigate } from "react-router-dom";
import logoImg from "@/assets/tekstil-as-logo.png";
import { Mail, Phone, MapPin } from "lucide-react";
import { Linkedin, Instagram, Facebook } from "lucide-react";

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
    <footer className="bg-primary mt-auto min-h-[280px]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo & Company Info */}
          <div className="space-y-4">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-8 brightness-0 invert" />
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              Manufixo Teknoloji A.Ş. tarafından geliştirilmiştir.
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
                <Linkedin className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.instagram.com/tekstilascom/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors">
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.facebook.com/tekstilas" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-colors">
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <span className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/30 cursor-default" title="Yakında">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </span>
            </div>
          </div>

          {/* Manufixo Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Tekstil A.Ş.</h4>
            <ul className="space-y-2.5">
              <li>
                <FooterLink to="/hakkimizda">Hakkımızda</FooterLink>
              </li>
              <li>
                <FooterLink to="/iletisim">İletişim</FooterLink>
              </li>
            </ul>
          </div>

          {/* Modüller Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Modüller</h4>
            <ul className="space-y-2.5">
              <li>
                <FooterLink to="/uretici-ve-tedarikci-kesfi">TekRehber</FooterLink>
              </li>
              <li>
                <FooterLink to="/online-pazar-yeri">TekPazar</FooterLink>
              </li>
              <li>
                <FooterLink to="/online-ihale-platformu">Tekİhale</FooterLink>
              </li>
            </ul>
          </div>

          {/* Kurumsal Bilgi Column */}
          <div>
            <h4 className="text-secondary font-bold text-sm mb-4">Kurumsal Bilgi</h4>
            <ul className="space-y-2.5">
              <li><FooterLink to="/sss">SSS</FooterLink></li>
              <li><FooterLink to="/kvkk-aydinlatma">KVKK Aydınlatma Metni</FooterLink></li>
              <li><FooterLink to="/gizlilik-kosullari">Gizlilik Koşulları</FooterLink></li>
              <li><FooterLink to="/kullanim-kosullari">Kullanım Koşulları &amp; Üyelik Sözleşmesi</FooterLink></li>
              <li><FooterLink to="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</FooterLink></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-primary-foreground/10">
          <p className="text-primary-foreground/50 text-sm text-center">
            © 2026 Tekstil A.Ş. – Manufixo Teknoloji A.Ş. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
