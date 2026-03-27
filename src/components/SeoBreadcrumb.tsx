import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SeoBreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function SeoBreadcrumb({ items }: SeoBreadcrumbProps) {
  // Inject BreadcrumbList JSON-LD
  useEffect(() => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://tekstilas.com" },
        ...items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: item.label,
          ...(item.href ? { item: `https://tekstilas.com${item.href}` } : {}),
        })),
      ],
    };

    let script = document.getElementById("seo-breadcrumb-ld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "seo-breadcrumb-ld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
    };
  }, [items]);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto py-2">
      <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0">
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Ana Sayfa</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          {item.href && i < items.length - 1 ? (
            <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
