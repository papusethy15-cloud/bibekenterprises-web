import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getDomainBySlug, getDomainProfile, getDomainServices, getDomainCities } from "@/lib/domain";
import { serviceHref } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomainBySlug();
  const siteName = domain?.name ?? "Bibek Enterprises";
  return {
    title: `About Us | ${siteName}`,
    description: `Learn about ${siteName} — our story, mission, and the team behind your trusted home appliance repair service.`,
  };
}

export default async function AboutPage() {
  const domain = await getDomainBySlug();
  const [profile, services, cities] = await Promise.all([
    domain ? getDomainProfile(domain.id) : Promise.resolve(null),
    domain ? getDomainServices(domain.id) : Promise.resolve([]),
    domain ? getDomainCities(domain.id) : Promise.resolve([]),
  ]);

  const brand        = domain?.primary_color || "#1A3FA4";
  const siteName     = domain?.name ?? "Bibek Enterprises";
  const logoUrl      = profile?.logo_url ?? domain?.logo_url ?? null;
  const phone        = profile?.support_phone || "+91 80000 00000";
  const phoneHref    = `tel:${phone.replace(/\s/g, "")}`;
  const email        = profile?.support_email || `support@${domain?.slug ?? "bibekenterprises"}.com`;
  const whatsapp     = profile?.whatsapp_number ?? null;
  const address      = profile?.office_address ?? null;
  const city         = profile?.office_city ?? null;
  const state        = profile?.office_state ?? null;
  const pincode      = profile?.office_pincode ?? null;
  const mapsUrl      = profile?.google_maps_url ?? null;
  const aboutShort   = profile?.about_short ?? null;
  const gstin        = profile?.gstin ?? null;
  const legalName    = profile?.business_legal_name ?? siteName;
  const visibleSvcs  = services.filter(s => s.is_visible);

  const stats = [
    { value: "10,000+", label: "Happy Customers" },
    { value: visibleSvcs.length > 0 ? `${visibleSvcs.length}+` : "20+", label: "Services Offered" },
    { value: cities.length > 0 ? `${cities.length}+` : "5+", label: "Cities Served" },
    { value: "4.8★", label: "Average Rating" },
  ];

  const values = [
    { icon: "🎯", title: "Customer First", desc: "Every decision we make starts with what's best for our customers. Your satisfaction is our only metric." },
    { icon: "🛡️", title: "Integrity", desc: "Transparent pricing, honest diagnosis, and no upselling. We tell you what's needed and nothing more." },
    { icon: "⚡", title: "Speed & Reliability", desc: "Same-day service in most areas. We show up on time, every time — because your time matters." },
    { icon: "🔬", title: "Technical Excellence", desc: "Certified technicians trained on the latest appliances from all major brands across India." },
    { icon: "🌱", title: "Sustainability", desc: "We repair rather than replace — saving you money and reducing e-waste across our service cities." },
    { icon: "🤝", title: "Community", desc: "Locally rooted, nationally minded. We hire from the communities we serve and invest back into them." },
  ];

  const team = [
    { name: "Service Team", role: "Certified Technicians", emoji: "🧑‍🔧", desc: "All technicians are background-verified, factory-trained, and certified on major appliance brands." },
    { name: "Support Team", role: "Customer Success", emoji: "🎧", desc: "Available Mon–Sat 8 AM–8 PM via call, WhatsApp, and chat to resolve any concern instantly." },
    { name: "Quality Team", role: "QA & Warranty", emoji: "✅", desc: "Every job is reviewed. Our 30-day warranty policy is enforced without question — no hassle." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400 flex-wrap">
          <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
          <span className="text-ink-200">›</span>
          <span className="text-ink-600 font-medium">About Us</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.06] animate-blob" style={{ background: brand }} />
          <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.04] animate-blob" style={{ background: brand, animationDelay: "7s" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5" style={{ background: "#F26522", color: "#fff" }}>
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-ink-900 leading-tight mb-6">
              Trusted Home Repair,<br />
              <span style={{ color: brand }}>Built on Honesty</span>
            </h1>
            <p className="text-ink-500 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
              {aboutShort || `${siteName} started with a simple belief — every household deserves reliable, fairly priced appliance repair. We built our service around that belief, and thousands of families trust us for it.`}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/services"
                style={{ background: brand, boxShadow: `0 10px 28px -10px ${brand}70` }}
                className="text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 text-sm"
              >
                Browse Services →
              </Link>
              <a
                href={phoneHref}
                className="font-semibold px-7 py-3.5 rounded-xl border-2 border-ink-100 text-ink-700 hover:border-ink-200 hover:bg-ink-50 transition-all duration-300 text-sm"
              >
                📞 Call Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-ink-100" style={{ background: `${brand}07` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={s.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <p className="text-3xl md:text-4xl font-extrabold text-ink-900" style={{ color: i === 3 ? "#f59e0b" : brand }}>{s.value}</p>
                <p className="text-xs font-semibold text-ink-400 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: visual */}
          <div className="relative">
            <div
              className="w-full rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: "4/3", background: `linear-gradient(135deg, ${brand}12 0%, ${brand}28 100%)` }}
            >
              {logoUrl ? (
                <Image src={logoUrl} alt={siteName} fill sizes="50vw" className="object-contain p-10" />
              ) : (
                <span className="text-8xl animate-float">🔧</span>
              )}
            </div>
            {/* floating badge */}
            <div
              className="absolute -bottom-5 -right-4 bg-white rounded-2xl px-5 py-4 shadow-xl border border-ink-100 animate-float"
              style={{ animationDelay: "1.5s" }}
            >
              <p className="text-2xl font-extrabold text-ink-900">30-day</p>
              <p className="text-xs text-ink-400 font-semibold">Service Warranty</p>
            </div>
          </div>

          {/* Right: text */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>Our Mission</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-5 leading-tight">
              Making Home Repair<br />Simple &amp; Trustworthy
            </h2>
            <p className="text-ink-500 leading-relaxed mb-5">
              We believe the appliance repair industry has long been opaque — surprise charges, unreliable scheduling, and technicians who upsell unnecessarily. {siteName} was founded to fix that.
            </p>
            <p className="text-ink-500 leading-relaxed mb-8">
              Our platform connects verified, factory-trained technicians with homeowners who need help — fast, fairly priced, and with a warranty that means something.
            </p>
            <div className="space-y-3">
              {["Verified & insured technicians on every job", "Upfront quotes before any work begins", "30-day warranty, honoured without question", "Real-time technician tracking via app"].map((pt, i) => (
                <div key={pt} className="flex items-center gap-3 text-sm text-ink-700 animate-fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: brand }}>✓</span>
                  {pt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 lg:py-28" style={{ background: `${brand}06` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>What We Stand For</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-3">Our Core Values</h2>
            <p className="text-ink-400 max-w-xl mx-auto text-sm">The principles that guide every technician visit, every customer call, every decision we make.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="bg-white rounded-2xl p-6 border border-ink-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group animate-fade-in-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ background: `${brand}12` }}
                >
                  {v.icon}
                </div>
                <h3 className="font-bold text-ink-900 mb-2">{v.title}</h3>
                <p className="text-sm text-ink-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>The People Behind</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-900 mt-2 mb-3">Our Teams</h2>
          <p className="text-ink-400 max-w-xl mx-auto text-sm">Specialists dedicated to delivering excellence at every touchpoint.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl p-7 border border-ink-100 hover:border-transparent hover:shadow-xl transition-all duration-300 group animate-fade-in-up text-center"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${brand}12` }}
              >
                {t.emoji}
              </div>
              <h3 className="font-bold text-ink-900 mb-1">{t.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: brand }}>{t.role}</p>
              <p className="text-sm text-ink-400 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services we offer ── */}
      {visibleSvcs.length > 0 && (
        <section className="py-16 border-t border-ink-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>What We Fix</span>
                <h2 className="text-2xl font-extrabold text-ink-900 mt-1">Our Services</h2>
              </div>
              <Link href="/services" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: brand }}>View all →</Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {visibleSvcs.slice(0, 12).map((s) => (
                <Link
                  key={s.domain_service_id}
                  href={serviceHref(s)}
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-ink-100 bg-white text-ink-600 hover:bg-ink-900 hover:text-white hover:border-ink-900 transition-all duration-200"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact / Find us ── */}
      <section className="py-20 lg:py-24 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: contact info */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>Get In Touch</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2 mb-6">We'd Love to Hear From You</h2>
              <p className="text-ink-300 leading-relaxed mb-8 text-sm">
                Questions, feedback, or just want to know if we service your area? Reach out — our team responds within the hour during working hours.
              </p>
              <div className="space-y-4">
                {[
                  { icon: "📞", label: "Phone", value: phone, href: phoneHref },
                  { icon: "✉️", label: "Email", value: email, href: `mailto:${email}` },
                  whatsapp ? { icon: "💬", label: "WhatsApp", value: whatsapp, href: `https://wa.me/${whatsapp.replace(/\D/g, "")}` } : null,
                  address ? { icon: "📍", label: "Office", value: `${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${pincode ? ` – ${pincode}` : ""}`, href: mapsUrl || "#" } : null,
                ].filter(Boolean).map((item) => item && (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-4 group"
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${brand}20` }}
                    >{item.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-0.5">{item.label}</p>
                      <p className="text-ink-200 text-sm group-hover:text-white transition-colors">{item.value}</p>
                    </div>
                  </a>
                ))}
                <div className="flex items-start gap-4">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${brand}20` }}>🕐</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-0.5">Working Hours</p>
                    <p className="text-ink-200 text-sm">Monday – Saturday: 8 AM – 8 PM</p>
                  </div>
                </div>
              </div>
              {gstin && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">Business Details</p>
                  <p className="text-ink-400 text-xs">{legalName}</p>
                  {gstin && <p className="text-ink-500 text-xs mt-0.5">GSTIN: {gstin}</p>}
                </div>
              )}
            </div>
            {/* Right: CTA card */}
            <div
              className="rounded-3xl p-8 border"
              style={{ background: `${brand}12`, borderColor: `${brand}25` }}
            >
              <div className="text-4xl mb-5">🛠️</div>
              <h3 className="text-2xl font-extrabold text-white mb-3">Ready to book a service?</h3>
              <p className="text-ink-300 text-sm leading-relaxed mb-6">Browse our full list of services, pick your city, and book in under 2 minutes. Our technicians are on standby.</p>
              <Link
                href="/services"
                style={{ background: brand, boxShadow: `0 12px 28px -12px ${brand}70` }}
                className="block w-full text-center text-white font-bold py-3.5 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 mb-3"
              >
                Browse All Services →
              </Link>
              <a
                href={phoneHref}
                className="block w-full text-center font-semibold py-3.5 rounded-xl border border-white/15 text-white hover:bg-white/10 transition-all duration-300 text-sm"
              >
                📞 Call to Book
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
