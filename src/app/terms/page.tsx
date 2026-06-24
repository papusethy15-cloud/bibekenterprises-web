import type { Metadata } from "next";
import Link from "next/link";
import { getDomainBySlug, getDomainProfile } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomainBySlug();
  const siteName = domain?.name ?? "Bibek Enterprises";
  return {
    title: `Terms of Service | ${siteName}`,
    description: `The terms and conditions governing your use of ${siteName}'s platform and services.`,
  };
}

export default async function TermsPage() {
  const domain = await getDomainBySlug();
  const profile = domain ? await getDomainProfile(domain.id) : null;

  const brand     = domain?.primary_color || "#D97706";
  const siteName  = domain?.name ?? "Bibek Enterprises";
  const email     = profile?.support_email || `support@${domain?.slug ?? "bibekenterprises"}.com`;
  const phone     = profile?.support_phone || "+91 80000 00000";
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;
  const legalName = profile?.business_legal_name || siteName;
  const gstin     = profile?.gstin ?? null;
  const updated   = "June 2025";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: `By accessing or using the ${siteName} website, mobile application, or any related services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our platform. These terms constitute a binding legal agreement between you and ${legalName}${gstin ? ` (GSTIN: ${gstin})` : ""}. We reserve the right to modify these terms at any time; continued use after changes constitutes acceptance.`,
    },
    {
      id: "services",
      title: "2. Services Provided",
      content: `${siteName} provides an online platform that connects customers with independent, verified home appliance repair technicians. We facilitate bookings, collect service fees, and coordinate scheduling. We do not manufacture or sell appliances or spare parts. The actual repair service is performed by our network of trained technicians. We act as an intermediary and service coordinator; the technician is the direct service provider under our supervision and quality framework.`,
    },
    {
      id: "eligibility",
      title: "3. User Eligibility",
      content: `You must be at least 18 years of age and capable of entering into a binding legal agreement to use our services. By creating an account, you confirm that all information you provide is accurate, current, and complete. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at ${email} if you suspect any unauthorised use of your account.`,
    },
    {
      id: "bookings",
      title: "4. Bookings & Scheduling",
      content: `When you book a service, you are making a confirmed request for a technician visit at the specified address and time slot. We will confirm your booking via SMS/WhatsApp/email within 30 minutes during working hours (Mon–Sat, 8 AM–8 PM). Bookings are subject to technician availability in your area. We reserve the right to reschedule in exceptional circumstances (weather, technician illness, etc.) with prior notice to you.`,
    },
    {
      id: "pricing",
      title: "5. Pricing & Payments",
      content: `All prices displayed on our platform are in Indian Rupees (INR) and are inclusive of the service charge for the specified service type. GST is charged additionally at the applicable rate and is shown separately before you confirm your booking. The quoted price is the minimum charge; if additional work is required (e.g. spare parts, unforeseen complexity), the technician will quote separately and seek your approval before proceeding. Payment is due upon completion of the service. We accept UPI, credit/debit card, net banking, and cash at your doorstep.`,
    },
    {
      id: "cancellation",
      title: "6. Cancellations & Rescheduling",
      content: `You may cancel or reschedule a booking free of charge up to 2 hours before the scheduled visit time. Cancellations made within 2 hours of the appointment may attract a convenience fee of ₹99 to cover the technician's travel cost. No-shows (where the customer is unavailable at the time of the visit) will be treated as a late cancellation. We will not charge you if we cancel or reschedule on our end; in such cases, rescheduling is prioritised at the earliest available slot of your choice.`,
    },
    {
      id: "warranty",
      title: "7. Service Warranty",
      content: `All services performed by ${siteName} technicians carry a 30-day workmanship warranty from the date of service completion. If the same issue recurs within 30 days due to our technician's work (not due to user misuse or unrelated damage), we will send a technician to resolve it at no additional charge. The warranty does not cover issues caused by: (a) user mishandling or accident; (b) electrical surges or infrastructure issues; (c) unrelated component failure; or (d) tampering by third parties after our service.`,
    },
    {
      id: "liability",
      title: "8. Limitation of Liability",
      content: `To the maximum extent permitted by applicable law, ${legalName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, or goodwill — arising from your use of our services. Our total liability to you for any claim arising from these terms shall not exceed the amount you paid for the specific service giving rise to the claim. Nothing in these terms limits our liability for death or personal injury caused by our negligence.`,
    },
    {
      id: "prohibited",
      title: "9. Prohibited Conduct",
      content: `You agree not to: (a) provide false or misleading information when booking; (b) abuse, threaten, or harass our technicians or support staff; (c) attempt to circumvent our platform by contacting technicians directly for future services (bypassing our booking system); (d) use our platform for any unlawful purpose; (e) reverse-engineer, scrape, or interfere with our systems. Violation of these prohibitions may result in immediate suspension of your account and, where applicable, legal action.`,
    },
    {
      id: "governing",
      title: "10. Governing Law & Disputes",
      content: `These terms are governed by the laws of India. Any disputes arising from or related to these terms or our services shall first be addressed through good-faith negotiation. If unresolved within 30 days, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with the seat of arbitration in ${profile?.office_city || "Bhubaneswar"}, Odisha. The language of arbitration shall be English. Notwithstanding this, either party may seek interim injunctive relief from a court of competent jurisdiction.`,
    },
    {
      id: "contact",
      title: "11. Contact Information",
      content: `For any questions about these Terms of Service, please contact us at: ${legalName}, Email: ${email}, Phone: ${phone}. Our support team is available Monday to Saturday, 8 AM to 8 PM.`,
    },
  ];

  return (
    <LegalPageShell
      brand={brand}
      siteName={siteName}
      title="Terms of Service"
      subtitle={`The terms and conditions governing your use of ${siteName}'s platform and services. Please read carefully before booking.`}
      updated={updated}
      email={email}
      phone={phone}
      phoneHref={phoneHref}
      sections={sections}
    />
  );
}

interface Section { id: string; title: string; content: string }
interface ShellProps {
  brand: string; siteName: string; title: string; subtitle: string;
  updated: string; email: string; phone: string; phoneHref: string; sections: Section[];
}

function LegalPageShell({ brand, siteName, title, subtitle, updated, email, phone, phoneHref, sections }: ShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400 flex-wrap">
          <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
          <span className="text-ink-200">›</span>
          <span className="text-ink-600 font-medium">{title}</span>
        </nav>
      </div>
      <section className="relative overflow-hidden border-b border-ink-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05] animate-blob" style={{ background: brand }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 animate-fade-in-up" style={{ background: `${brand}15`, color: brand }}>Legal</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink-900 mb-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>{title}</h1>
          <p className="text-ink-400 max-w-xl animate-fade-in-up" style={{ animationDelay: "140ms" }}>{subtitle}</p>
          <p className="text-xs text-ink-300 mt-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>Last updated: {updated}</p>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 items-start">
          <aside className="hidden lg:block sticky top-6 self-start">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="block text-xs text-ink-500 hover:text-ink-900 py-1.5 px-3 rounded-lg hover:bg-ink-50 transition-all duration-150 leading-snug">{s.title}</a>
                ))}
              </nav>
            </div>
            <div className="mt-4 rounded-2xl p-5 border" style={{ background: `${brand}08`, borderColor: `${brand}20` }}>
              <p className="text-xs font-bold text-ink-800 mb-3">Questions about these terms?</p>
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 mb-2 transition-colors"><span>✉️</span>{email}</a>
              <a href={phoneHref} className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 transition-colors"><span>📞</span>{phone}</a>
            </div>
          </aside>
          <article className="min-w-0 space-y-10">
            {sections.map((s, i) => (
              <div key={s.id} id={s.id} className="scroll-mt-8 animate-fade-in-up pb-10 border-b border-ink-100 last:border-0 last:pb-0" style={{ animationDelay: `${i * 50}ms` }}>
                <h2 className="text-lg font-bold text-ink-900 mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: brand }} />
                  {s.title}
                </h2>
                <p className="text-ink-500 leading-relaxed text-sm">{s.content}</p>
              </div>
            ))}
            <div className="rounded-2xl p-6 mt-6" style={{ background: `${brand}08`, borderLeft: `4px solid ${brand}` }}>
              <p className="text-sm font-semibold text-ink-800 mb-1">A note from {siteName}</p>
              <p className="text-xs text-ink-500 leading-relaxed">These terms are written to be fair and readable, not to hide obligations in fine print. If anything is unclear, please ask us — we are happy to explain.</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
