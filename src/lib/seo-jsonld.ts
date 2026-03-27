/**
 * JSON-LD structured data helpers for SEO
 */

const BASE_URL = "https://tekstilas.com";

export function injectJsonLd(id: string, data: Record<string, any>) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({ "@context": "https://schema.org", ...data });
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function buildWebSiteSchema() {
  return {
    "@type": "WebSite",
    name: "Tekstil A.Ş.",
    url: BASE_URL,
    description: "Türkiye'nin B2B Tekstil Platformu",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/firmalar?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationSchema() {
  return {
    "@type": "Organization",
    name: "Tekstil A.Ş.",
    url: BASE_URL,
    logo: `${BASE_URL}/pwa-icon-512.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+908502425700",
      contactType: "customer service",
      availableLanguage: "Turkish",
    },
    sameAs: [
      "https://www.instagram.com/tekstilas",
      "https://www.linkedin.com/company/tekstilas",
    ],
  };
}

export function buildProductSchema(product: {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  sku?: string;
  slug?: string;
  sellerName?: string;
}) {
  return {
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.image && { image: product.image }),
    ...(product.sku && { sku: product.sku }),
    ...(product.slug && { url: `${BASE_URL}/urunler/${product.slug}` }),
    ...(product.sellerName && {
      brand: { "@type": "Brand", name: product.sellerName },
    }),
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: product.currency || "TRY",
        availability: "https://schema.org/InStock",
        seller: product.sellerName ? { "@type": "Organization", name: product.sellerName } : undefined,
      },
    }),
  };
}

export function buildEventSchema(event: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  slug?: string;
  image?: string;
  organizerName?: string;
}) {
  return {
    "@type": "Event",
    name: event.name,
    ...(event.description && { description: event.description }),
    ...(event.startDate && { startDate: event.startDate }),
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.slug && { url: `${BASE_URL}/ihaleler/${event.slug}` }),
    ...(event.image && { image: event.image }),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: `${BASE_URL}/ihaleler/${event.slug || ""}`,
    },
    ...(event.organizerName && {
      organizer: { "@type": "Organization", name: event.organizerName },
    }),
  };
}

export function buildLocalBusinessSchema(firma: {
  name: string;
  description?: string;
  logo?: string;
  url?: string;
  city?: string;
  phone?: string;
  email?: string;
}) {
  return {
    "@type": "LocalBusiness",
    name: firma.name,
    ...(firma.description && { description: firma.description }),
    ...(firma.logo && { image: firma.logo }),
    ...(firma.url && { url: firma.url }),
    ...(firma.city && {
      address: { "@type": "PostalAddress", addressLocality: firma.city, addressCountry: "TR" },
    }),
    ...(firma.phone && { telephone: firma.phone }),
    ...(firma.email && { email: firma.email }),
  };
}

export function buildFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
