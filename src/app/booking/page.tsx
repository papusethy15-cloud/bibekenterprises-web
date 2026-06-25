import { Suspense } from "react";
import { getDomainPageData } from "@/lib/domain";
import BookingClient from "./BookingClient";

export default async function BookingPage() {
  const data = await getDomainPageData();

  const domain   = data?.domain;
  const profile  = data?.profile;
  const services = data?.services?.filter((s) => s.is_visible) ?? [];

  return (
    <Suspense fallback={<LoadingFallback brand={domain?.primary_color ?? "#1A3FA4"} />}>
      <BookingClient
        siteName={domain?.name ?? "Bibek Enterprises"}
        logoUrl={profile?.logo_url ?? domain?.logo_url ?? null}
        brand={domain?.primary_color ?? "#1A3FA4"}
        phone={profile?.support_phone ?? "+91 80000 00000"}
        services={services}
        domainId={domain?.id ?? ""}
      />
    </Suspense>
  );
}

function LoadingFallback({ brand }: { brand: string }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: `${brand} transparent ${brand} ${brand}` }} />
    </div>
  );
}
