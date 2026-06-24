import type { Metadata } from "next";
import "./globals.css";
import { getDomainBySlug, getDomainSeo, getDomainProfile, getDomainCities, getDomainServices } from "@/lib/domain";
import CityProvider from "@/context/CityContext";
import AuthProvider from "@/context/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { slugify } from "@/lib/slug";
import ChatBot from "@/components/ui/ChatBot";
import CallbackModal from "@/components/ui/CallbackModal";

/**
 * layout.tsx — Dynamic metadata from Admin Dashboard domain settings.
 *
 * Every value here (title, description, OG image, robots, canonical URL,
 * favicon, theme color, JSON-LD schema) is fetched from the database at
 * request time and controlled entirely from the Admin Dashboard →
 * Domains → SEO / Profile tabs. Nothing is hardcoded per-deployment except
 * the NEXT_PUBLIC_DOMAIN_SLUG / NEXT_PUBLIC_DOMAIN_ID in .env.local.
 */
export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomainBySlug();
  const [seo, profile] = await Promise.all([
    domain ? getDomainSeo(domain.id) : Promise.resolve(null),
    domain ? getDomainProfile(domain.id) : Promise.resolve(null),
  ]);

  const siteName = domain?.name ?? "Bibek Enterprises";
  const title =
    seo?.meta_title ?? domain?.meta_title ?? `${siteName} — Home Appliance Repair & Service`;
  const desc =
    seo?.meta_description ??
    domain?.meta_desc ??
    "Professional home appliance repair and maintenance services. AC, Refrigerator, Washing Machine, Geyser, Microwave & more — at your doorstep.";
  const ogImage = seo?.og_image_url ?? profile?.og_image_url ?? profile?.banner_url ?? "/og-default.jpg";
  const canonical = seo?.canonical_url ?? null;
  const robots = seo?.robots ?? "index,follow";
  const favicon = profile?.favicon_url ?? "/favicon.ico";

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: desc,
    keywords: seo?.meta_keywords ?? undefined,
    robots,
    icons: { icon: favicon },
    openGraph: {
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? desc,
      siteName,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? desc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const domain = await getDomainBySlug();
  const [seo, profile, cities, services] = await Promise.all([
    domain ? getDomainSeo(domain.id) : Promise.resolve(null),
    domain ? getDomainProfile(domain.id) : Promise.resolve(null),
    domain ? getDomainCities(domain.id) : Promise.resolve([]),
    domain ? getDomainServices(domain.id) : Promise.resolve([]),
  ]);
  const brand = domain?.primary_color ?? "#D97706";

  // Header props — same display logic the home page uses, lifted up here
  // so the header (logo, search, contact) is consistent across every page.
  const siteName  = domain?.name ?? "Bibek Enterprises";
  const logoUrl   = profile?.logo_url ?? domain?.logo_url ?? null;
  const phone     = profile?.support_phone || "+91 80000 00000";
  const email     = profile?.support_email || `support@${domain?.slug ?? "bibekenterprises"}.com`;
  const whatsapp  = profile?.whatsapp_number ?? null;
  const headerServices = services
    .filter((s) => s.is_visible)
    .map((s) => ({ domain_service_id: s.domain_service_id, name: s.name, category_name: s.category_name }));

  // JSON-LD schema from Admin Dashboard → Domain → SEO → "JSON-LD Schema" field.
  // Falls back to a generated LocalBusiness schema from profile + domain data
  // so search engines still get structured data even before SEO is filled in.
  const schemaJson =
    seo?.schema_json ??
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: domain?.name ?? "Bibek Enterprises",
      description: domain?.description,
      image: profile?.logo_url,
      telephone: profile?.support_phone,
      email: profile?.support_email,
      address: profile?.office_address
        ? {
            "@type": "PostalAddress",
            streetAddress: profile.office_address,
            addressLocality: profile.office_city,
            addressRegion: profile.office_state,
            postalCode: profile.office_pincode,
            addressCountry: profile.office_country ?? "IN",
          }
        : undefined,
      sameAs: [
        profile?.facebook_url,
        profile?.instagram_url,
        profile?.twitter_url,
        profile?.youtube_url,
        profile?.linkedin_url,
      ].filter(Boolean),
      // AggregateRating — ONLY emitted when real review data exists in the
      // database (Admin Dashboard → Profile → Reviews). Google's structured
      // data guidelines prohibit fabricated/placeholder ratings, so we never
      // invent a rating or review count here — it's added dynamically the
      // moment profile.avg_rating / profile.review_count are populated.
      ...(profile?.avg_rating && profile?.review_count
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: profile.avg_rating.toFixed(1),
              reviewCount: profile.review_count,
              bestRating: "5",
              worstRating: "1",
            },
          }
        : {}),
    });

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#D97706" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <CityProvider cities={cities} brand={brand}>
            <Header
              siteName={siteName}
              logoUrl={logoUrl}
              brand={brand}
              phone={phone}
              email={email}
              whatsapp={whatsapp}
              services={headerServices}
            />
            {children}
            <Footer
              siteName={siteName}
              logoUrl={logoUrl}
              brand={brand}
              phone={phone}
              email={email}
              whatsapp={whatsapp}
              officeAddress={profile?.office_address ?? null}
              officeCity={profile?.office_city ?? null}
              copyrightText={profile?.copyright_text ?? null}
              aboutShort={profile?.about_short ?? null}
              socialLinks={[
                profile?.facebook_url  ? { label: "Facebook",  url: profile.facebook_url  } : null,
                profile?.instagram_url ? { label: "Instagram", url: profile.instagram_url } : null,
                profile?.twitter_url   ? { label: "Twitter",   url: profile.twitter_url   } : null,
                profile?.youtube_url   ? { label: "YouTube",   url: profile.youtube_url   } : null,
                profile?.linkedin_url  ? { label: "LinkedIn",  url: profile.linkedin_url  } : null,
              ].filter(Boolean) as { label: string; url: string }[]}
              services={services
                .filter((s) => s.is_visible)
                .slice(0, 8)
                .map((s) => ({ name: s.name, slug: slugify(s.name) }))}
            />
            <ChatBot phone={phone} brand={brand} />
            <CallbackModal brand={brand} siteName={siteName} defaultPhone={phone} />
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
