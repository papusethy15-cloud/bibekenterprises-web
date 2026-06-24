import type { Metadata } from "next";
import Link from "next/link";
import { getDomainBySlug, getDomainProfile } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomainBySlug();
  const siteName = domain?.name ?? "Bibek Enterprises";
  return {
    title: `Refund Policy | ${siteName}`,
    description: `${siteName}'s refund and cancellation policy — straightforward, no fine print.`,
  };
}

export default async function RefundPolicyPage() {
  const domain = await getDomainBySlug();
  const profile = domain ? await getDomainProfile(domain.id) : null;

  const brand     = domain?.primary_color || "#D97706";
  const siteName  = domain?.name ?? "Bibek Enterprises";
  const email     = profile?.support_email || `support@${domain?.slug ?? "bibekenterprises"}.com`;
  const phone     = profile?.support_phone || "+91 80000 00000";
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;
  const updated   = "June 2025";

  const sections = [
    {
      id: "overview",
      title: "1. Overview",
      content: `At ${siteName}, we are committed to your complete satisfaction. This policy explains when and how refunds are issued for services booked through our platform. We believe in keeping things simple and fair — if we didn't deliver, you shouldn't pay.`,
    },
    {
      id: "eligibility",
      title: "2. Refund Eligibility",
      content: `You are eligible for a full refund in the following situations: (a) You cancel your booking more than 2 hours before the scheduled visit. (b) Our technician does not arrive within 60 minutes of the scheduled slot without prior notice from our team. (c) The service was not completed due to reasons attributable to our technician (e.g. lack of tools, skills, or parts required for the job). (d) You paid for a service that was not performed. (e) Duplicate charges — if your payment was processed more than once for the same booking.`,
    },
    {
      id: "non-refundable",
      title: "3. Non-Refundable Situations",
      content: `Refunds will not be issued in the following situations: (a) The service was completed successfully and the same fault re-occurs after 30 days. (b) The issue recurrence is due to user misuse, mishandling, power surge, or unrelated damage. (c) You cancel within 2 hours of the scheduled visit — in such cases a ₹99 convenience fee is applicable. (d) You were not present at the address at the time of the visit (no-show) — this is treated as a late cancellation. (e) The complaint relates to cosmetic or pre-existing damage that was not reported before work began. (f) Spare parts that were ordered and delivered at your request cannot be returned or refunded.`,
    },
    {
      id: "warranty-claims",
      title: "4. Warranty-Based Re-Service",
      content: `Our 30-day service warranty means: if the same issue recurs within 30 days of the original service and is attributable to our work, we will dispatch a technician to fix it at zero additional cost. This is not a refund — it is a free re-service. To raise a warranty claim, contact our support team with your original booking number within the 30-day window. We will schedule the re-visit within 48 hours of your request.`,
    },
    {
      id: "process",
      title: "5. How to Request a Refund",
      content: `To request a refund: (1) Contact our support team via email (${email}) or phone (${phone}) within 7 days of the service date. (2) Provide your booking number, the issue you experienced, and any supporting evidence (e.g. photos, descriptions). (3) Our team will review your request within 3 business days and respond with a decision. (4) If approved, the refund will be processed to your original payment method within 5–7 business days (UPI and debit/credit card refunds are subject to bank processing times). Cash payments will be refunded in cash by our operations team.`,
    },
    {
      id: "partial",
      title: "6. Partial Refunds",
      content: `In some situations, a partial refund may be appropriate — for example, if a visit was partially completed (diagnosis was done but repair could not proceed due to part unavailability). In such cases, our team will contact you to agree on a fair partial refund or a discounted re-visit price. We aim to resolve all disputes fairly and without escalation.`,
    },
    {
      id: "disputes",
      title: "7. Disputes",
      content: `If you are unhappy with a refund decision, you may escalate the matter to our management team by emailing ${email} with the subject line "Refund Escalation". A senior team member will review your case independently and respond within 5 business days. We are committed to resolving all disputes amicably. If a resolution cannot be reached, the dispute will be handled under our Terms of Service arbitration clause.`,
    },
    {
      id: "timeline",
      title: "8. Refund Timeline Summary",
      content: `UPI / Bank Transfer: 3–5 business days after approval. Credit/Debit Card: 5–7 business days after approval (depends on your card issuer). Cash: Returned in-person by our operations team within 2 business days. Wallet / Prepaid Payment: 2–3 business days. Note: These are processing times after our approval — the actual credit to your account depends on your bank or payment provider.`,
    },
    {
      id: "contact",
      title: "9. Contact for Refunds",
      content: `Refund requests and queries: Email: ${email} | Phone: ${phone} | Support hours: Monday–Saturday, 8 AM – 8 PM. Please have your booking number ready when you contact us — this helps us resolve your query faster.`,
    },
  ];

  // Quick summary cards shown at top
  const quickCards = [
    { icon: "🗓️", title: "Free cancellation", desc: "Cancel 2+ hours before visit" },
    { icon: "⏱", title: "5–7 day refund", desc: "To your original payment method" },
    { icon: "🛡️", title: "30-day re-service", desc: "Same issue? We fix free" },
    { icon: "📞", title: "Easy claims", desc: "Just call or email us" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400 flex-wrap">
          <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
          <span className="text-ink-200">›</span>
          <span className="text-ink-600 font-medium">Refund Policy</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05] animate-blob" style={{ background: brand }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 animate-fade-in-up" style={{ background: `${brand}15`, color: brand }}>
            Our Commitment
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink-900 mb-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            Refund Policy
          </h1>
          <p className="text-ink-400 max-w-xl animate-fade-in-up" style={{ animationDelay: "140ms" }}>
            Straightforward, no fine print. If we didn&apos;t deliver, you don&apos;t pay.
          </p>
          <p className="text-xs text-ink-300 mt-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>Last updated: {updated}</p>
        </div>
      </section>

      {/* Quick summary cards */}
      <section style={{ background: `${brand}07` }} className="border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickCards.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl p-5 border border-ink-100 shadow-sm animate-fade-in-up text-center" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="text-2xl mb-2">{c.icon}</div>
                <p className="font-bold text-ink-900 text-sm">{c.title}</p>
                <p className="text-xs text-ink-400 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body */}
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
              <p className="text-xs font-bold text-ink-800 mb-3">Request a refund?</p>
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
              <p className="text-sm font-semibold text-ink-800 mb-1">We stand behind our work</p>
              <p className="text-xs text-ink-500 leading-relaxed">{siteName} is built on trust. If you are ever unsatisfied, please reach out — we will make it right. A fair resolution is always our goal.</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
