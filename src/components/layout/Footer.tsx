import Link from "next/link";

interface SocialLink { label: string; url: string }
interface ServiceItem { name: string; slug: string }

interface Props {
  siteName: string;
  logoUrl: string | null;
  brand: string;
  phone: string;
  email: string;
  whatsapp?: string | null;
  officeAddress?: string | null;
  officeCity?: string | null;
  copyrightText?: string | null;
  aboutShort?: string | null;
  socialLinks?: SocialLink[];
  services?: ServiceItem[];
}

export default function Footer({
  siteName,
  logoUrl,
  brand,
  phone,
  email,
  whatsapp,
  officeAddress,
  officeCity,
  copyrightText,
  aboutShort,
  socialLinks = [],
  services = [],
}: Props) {
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-ink-900 text-ink-300">
      {/* ── Top accent bar ── */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1A3FA4 0%, #3d5fc4 50%, #F26522 100%)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={siteName} className="h-8 object-contain brightness-200" />
              ) : (
                <span className="text-xl font-extrabold text-white">{siteName}</span>
              )}
            </div>
            <p className="text-sm leading-relaxed mb-5 text-ink-400">
              {aboutShort || `Professional home appliance repair and maintenance services by ${siteName}.`}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-2.5">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold hover:bg-white/15 hover:border-white/20 transition-all duration-200"
                    aria-label={s.label}
                    style={{ color: "#1A3FA4" }}
                  >
                    {s.label[0]}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Services column */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2.5 text-sm">
              {services.slice(0, 6).map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="hover:text-white transition-colors flex items-center gap-1.5 group"
                  >
                    <span
                      className="w-1 h-1 rounded-full shrink-0 transition-all duration-200 group-hover:w-2"
                      style={{ background: "#1A3FA4" }}
                    />
                    {s.name}
                  </Link>
                </li>
              ))}
              {services.length > 6 && (
                <li>
                  <Link href="/services" className="text-xs font-semibold hover:text-white transition-colors" style={{ color: "#1A3FA4" }}>
                    View all services →
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "About Us", href: "/about" },
                { label: "All Services", href: "/services" },
                { label: "Blog", href: "/blog" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy", href: "/refund-policy" },
                { label: "Sitemap", href: "/sitemap.xml" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-white transition-colors flex items-center gap-1.5 group">
                    <span
                      className="w-1 h-1 rounded-full shrink-0 transition-all duration-200 group-hover:w-2"
                      style={{ background: "#1A3FA4" }}
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={phoneHref} className="flex items-center gap-2 hover:text-white transition-colors group">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all group-hover:scale-110"
                    style={{ background: "rgba(26,63,164,0.15)" }}
                  >📞</span>
                  <span>{phone}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white transition-colors group">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all group-hover:scale-110"
                    style={{ background: "rgba(26,63,164,0.15)" }}
                  >✉️</span>
                  <span className="break-all">{email}</span>
                </a>
              </li>
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white transition-colors group"
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all group-hover:scale-110"
                      style={{ background: "rgba(26,63,164,0.15)" }}
                    >💬</span>
                    <span>WhatsApp</span>
                  </a>
                </li>
              )}
              {officeAddress && (
                <li className="flex items-start gap-2">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                    style={{ background: "rgba(26,63,164,0.15)" }}
                  >📍</span>
                  <span className="leading-relaxed">
                    {officeAddress}{officeCity ? `, ${officeCity}` : ""}
                  </span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{ background: "rgba(26,63,164,0.15)" }}
                >🕐</span>
                <span>Mon–Sat: 8 AM – 8 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink-500">
          <p>{copyrightText || `© ${year} ${siteName}. All rights reserved.`}</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-300 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-ink-300 transition-colors">Refund</Link>
            <Link href="/sitemap.xml" className="hover:text-ink-300 transition-colors">Sitemap</Link>
            <a href="https://www.lockydev.cloud/" target="_blank" rel="noopener noreferrer" className="hover:text-ink-300 transition-colors">Developed by Locky Dev</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
