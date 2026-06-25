import type { Metadata } from "next";
import Link from "next/link";
import { getDomainBySlug, getDomainProfile } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomainBySlug();
  const siteName = domain?.name ?? "Bibek Enterprises";
  return {
    title: `Privacy Policy | ${siteName}`,
    description: `How ${siteName} collects, uses and protects your personal information.`,
  };
}

export default async function PrivacyPage() {
  const domain = await getDomainBySlug();
  const profile = domain ? await getDomainProfile(domain.id) : null;

  const brand      = domain?.primary_color || "#1A3FA4";
  const siteName   = domain?.name ?? "Bibek Enterprises";
  const email      = profile?.support_email || `support@${domain?.slug ?? "bibekenterprises"}.com`;
  const phone      = profile?.support_phone || "+91 80000 00000";
  const phoneHref  = `tel:${phone.replace(/\s/g, "")}`;
  const legalName  = profile?.business_legal_name || siteName;
  const address    = [profile?.office_address, profile?.office_city, profile?.office_state, profile?.office_pincode].filter(Boolean).join(", ");
  const updated    = "June 2025"; // update when policy changes

  const sections = [
    {
      id: "info-we-collect",
      title: "1. Information We Collect",
      content: `We collect information you provide directly — such as your name, phone number, email address, and home address when you register, book a service, or contact our support team. We also automatically collect certain technical information when you use our website, including your IP address, browser type, device identifiers, and pages visited, through cookies and similar technologies. We do not collect sensitive personal data such as payment card numbers directly — all payments are processed by our third-party payment partners (Razorpay / UPI gateways) under their own privacy policies.`,
    },
    {
      id: "how-we-use",
      title: "2. How We Use Your Information",
      content: `We use your information to: (a) schedule and dispatch technicians to your address; (b) send booking confirmations, updates, and service reminders via SMS, WhatsApp, and email; (c) process payments and generate invoices; (d) improve our platform and personalise your experience; (e) comply with legal obligations, including GST record-keeping requirements; and (f) respond to your customer support queries. We do not use your data for automated decision-making that has legal or similarly significant effects on you.`,
    },
    {
      id: "sharing",
      title: "3. Sharing of Information",
      content: `We share your information only as necessary to provide our services. This includes: (a) our assigned technician (who receives your name, address, and contact number to perform the service); (b) payment processors (Razorpay and UPI partners) who handle transaction data; (c) SMS and WhatsApp notification providers for booking alerts; (d) analytics providers to help us understand usage patterns. We do not sell your personal data to third parties. We do not share your information with advertisers. In the event of a merger or acquisition, your data may be transferred to the new entity under equivalent protections.`,
    },
    {
      id: "cookies",
      title: "4. Cookies & Tracking",
      content: `Our website uses cookies to remember your city preference, maintain your login session, and analyse traffic patterns. You can disable cookies in your browser settings, but doing so may affect your experience (e.g. your city selection will not be saved). We use Google Analytics to understand aggregate traffic patterns — this data is anonymised and not linked to your personal identity. We do not use tracking for targeted advertising.`,
    },
    {
      id: "retention",
      title: "5. Data Retention",
      content: `We retain your personal information for as long as your account is active or as needed to provide services, resolve disputes, enforce agreements, and comply with legal obligations (typically 7 years for financial records under Indian accounting law). If you request deletion of your account, we will remove your personal data within 30 days, except where retention is required by law.`,
    },
    {
      id: "security",
      title: "6. Data Security",
      content: `We implement industry-standard security measures including HTTPS encryption for all data in transit, hashed passwords, and access controls that restrict employee access to customer data on a need-to-know basis. However, no method of electronic transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.`,
    },
    {
      id: "rights",
      title: "7. Your Rights",
      content: `You have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your data (subject to legal retention requirements); (d) withdraw consent for optional communications (e.g. marketing messages) at any time. To exercise these rights, email us at the address below or call our support line. We will respond within 15 business days.`,
    },
    {
      id: "children",
      title: "8. Children's Privacy",
      content: `Our services are not directed at individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe we have inadvertently collected information from a minor, please contact us immediately and we will delete it promptly.`,
    },
    {
      id: "changes",
      title: "9. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes via email or a prominent notice on our website at least 14 days before the changes take effect. The "Last Updated" date at the top of this page will always reflect the current version.`,
    },
    {
      id: "contact",
      title: "10. Contact Us",
      content: `For any privacy-related queries, to exercise your rights, or to report a concern, please contact our Data Protection point of contact at: ${legalName}${address ? `, ${address}` : ""}. Email: ${email} | Phone: ${phone}. We aim to respond to all enquiries within 5 business days.`,
    },
  ];

  return (
    <LegalPageShell
      brand={brand}
      siteName={siteName}
      title="Privacy Policy"
      subtitle={`How ${siteName} collects, uses and protects your personal information.`}
      updated={updated}
      email={email}
      phoneHref={phoneHref}
      phone={phone}
      sections={sections}
    />
  );
}

// ── Shared legal page shell ────────────────────────────────────────────────────
interface Section { id: string; title: string; content: string }
interface ShellProps {
  brand: string;
  siteName: string;
  title: string;
  subtitle: string;
  updated: string;
  email: string;
  phone: string;
  phoneHref: string;
  sections: Section[];
}

function LegalPageShell({ brand, siteName, title, subtitle, updated, email, phone, phoneHref, sections }: ShellProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400 flex-wrap">
          <Link href="/" className="hover:text-ink-700 transition-colors">Home</Link>
          <span className="text-ink-200">›</span>
          <span className="text-ink-600 font-medium">{title}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05] animate-blob" style={{ background: brand }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 animate-fade-in-up" style={{ background: "#F26522", color: "#fff" }}>
            Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink-900 mb-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            {title}
          </h1>
          <p className="text-ink-400 max-w-xl animate-fade-in-up" style={{ animationDelay: "140ms" }}>{subtitle}</p>
          <p className="text-xs text-ink-300 mt-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>Last updated: {updated}</p>
        </div>
      </section>

      {/* Body: TOC + content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 items-start">

          {/* TOC sidebar — sticky */}
          <aside className="hidden lg:block sticky top-6 self-start">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-xs text-ink-500 hover:text-ink-900 py-1.5 px-3 rounded-lg hover:bg-ink-50 transition-all duration-150 leading-snug"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Contact card */}
            <div className="mt-4 rounded-2xl p-5 border" style={{ background: `${brand}08`, borderColor: `${brand}20` }}>
              <p className="text-xs font-bold text-ink-800 mb-3">Questions about this policy?</p>
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 mb-2 transition-colors">
                <span>✉️</span> {email}
              </a>
              <a href={phoneHref} className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 transition-colors">
                <span>📞</span> {phone}
              </a>
            </div>
          </aside>

          {/* Content */}
          <article className="min-w-0 space-y-10">
            {sections.map((s, i) => (
              <div
                key={s.id}
                id={s.id}
                className="scroll-mt-8 animate-fade-in-up pb-10 border-b border-ink-100 last:border-0 last:pb-0"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <h2 className="text-lg font-bold text-ink-900 mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: brand }} />
                  {s.title}
                </h2>
                <p className="text-ink-500 leading-relaxed text-sm">{s.content}</p>
              </div>
            ))}

            {/* Bottom note */}
            <div className="rounded-2xl p-6 mt-6" style={{ background: `${brand}08`, borderLeft: `4px solid ${brand}` }}>
              <p className="text-sm font-semibold text-ink-800 mb-1">A note from {siteName}</p>
              <p className="text-xs text-ink-500 leading-relaxed">
                We take your privacy seriously. If you ever have concerns about how we handle your data, or if you believe your rights have been violated, please reach out to us directly — we will address your concern promptly and transparently.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
