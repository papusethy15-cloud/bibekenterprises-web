import { Suspense } from "react";
import { getDomainPageData } from "@/lib/domain";
import LoginClient from "./LoginClient";

/**
 * Server component — fetches domain branding (logo/name/color) so the
 * login screen matches the rest of the site, same pattern as booking/page.tsx.
 * LoginClient is wrapped in <Suspense> because it reads useSearchParams()
 * (the ?redirect= target), which requires a boundary for SSR prerendering.
 */
export default async function LoginPage() {
  const data = await getDomainPageData();
  const domain  = data?.domain;
  const profile = data?.profile;

  return (
    <Suspense fallback={<LoginLoadingFallback brand={domain?.primary_color ?? "#1A3FA4"} />}>
      <LoginClient
        siteName={domain?.name ?? "Bibek Enterprises"}
        logoUrl={profile?.logo_url ?? domain?.logo_url ?? null}
        brand={domain?.primary_color ?? "#1A3FA4"}
      />
    </Suspense>
  );
}

function LoginLoadingFallback({ brand }: { brand: string }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: `${brand} transparent ${brand} ${brand}` }}
      />
    </div>
  );
}
