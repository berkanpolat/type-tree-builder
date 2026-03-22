import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ROOT_PATHS = ["/", "/firmalar", "/tekpazar", "/ihaleler", "/dashboard", "/giris-kayit"];

export default function MobileBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = ROOT_PATHS.includes(location.pathname);
  if (isRoot) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 mr-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
      aria-label="Geri"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
