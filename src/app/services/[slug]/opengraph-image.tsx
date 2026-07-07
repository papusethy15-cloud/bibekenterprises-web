import { ImageResponse } from "next/og";
import { getServicePageData } from "@/lib/domain";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OG image per service page.
 * Next.js App Router serves this at /services/[slug]/opengraph-image
 * and it's used automatically by the OG meta tags on each service detail page.
 * Brand color, service name, and price all come from the DB — zero hardcoding.
 */
export default async function OgImage({ params }: { params: { slug: string } }) {
  const data = await getServicePageData(params.slug);

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A3FA4",
          color: "#fff",
          fontSize: 48,
          fontWeight: 800,
        }}
      >
        Home Appliance Repair
      </div>,
      { ...size }
    );
  }

  const { service, domain, profile } = data;
  const brand = domain.primary_color ?? "#1A3FA4";
  const siteName = domain.name;
  const logoUrl = profile?.logo_url ?? domain.logo_url ?? null;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: brand,
        padding: "60px 80px",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "sans-serif",
      }}
    >
      {/* Top row: site name + logo placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "8px 20px",
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {siteName}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", color: "#fff" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            opacity: 0.7,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {service.category_name}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          {service.name}
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 26,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Starting ₹{service.base_price.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 18, opacity: 0.75, color: "#fff" }}>
            30-day warranty · Certified technicians · Book in 2 min
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: 20,
          color: "rgba(255,255,255,0.6)",
          fontSize: 16,
        }}
      >
        <span>{process.env.NEXT_PUBLIC_SITE_URL ?? "https://bibekenterprises.com"}</span>
        <span>🛠️ Professional Home Appliance Repair</span>
      </div>
    </div>,
    { ...size }
  );
}
