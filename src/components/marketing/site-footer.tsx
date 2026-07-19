import Link from "next/link";
import Image from "next/image";
import {
  Whatsapp,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from "flowbite-react-icons/solid";
import { MapPin, Phone, Envelope } from "flowbite-react-icons/outline";
import type { ReactElement } from "react";
import {
  site,
  contact,
  whatsappHref,
  footerColumns,
  socials,
  type SocialPlatform,
} from "@/content/site";

type IconProps = { size?: number; className?: string };

const socialIcon: Record<SocialPlatform, (p: IconProps) => ReactElement> = {
  whatsapp: (p) => <Whatsapp {...p} />,
  facebook: (p) => <Facebook {...p} />,
  instagram: (p) => <Instagram {...p} />,
  linkedin: (p) => <Linkedin {...p} />,
  twitter: (p) => <Twitter {...p} />,
  youtube: (p) => <Whatsapp {...p} />,
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {/* Brand band */}
        <div className="flex flex-col gap-8 border-b border-background/15 pb-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md space-y-5">
            <Image
              src="/brand/logo-white.png"
              alt={site.name}
              width={840}
              height={310}
              className="h-11 w-auto"
            />
            <p className="font-heading text-h3 font-medium text-background">
              {site.tagline}
            </p>
            <blockquote className="border-l-2 border-primary pl-4 font-heading text-body italic text-background/80">
              “{site.quote}”
            </blockquote>
          </div>

          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20 text-background/80 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {socialIcon[s.platform]({ size: 18 })}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns + contact */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-3 lg:grid-cols-5">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-caption font-semibold uppercase tracking-wide text-background/60">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body text-background/75 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact column */}
          <div>
            <h4 className="mb-4 text-caption font-semibold uppercase tracking-wide text-background/60">
              Contact
            </h4>
            <ul className="space-y-3 text-body text-background/75">
              <li className="flex items-start gap-2.5">
                <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>{contact.address}</span>
              </li>
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="flex items-start gap-2.5 transition-colors hover:text-primary"
                >
                  <Phone size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>{contact.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-start gap-2.5 transition-colors hover:text-primary"
                >
                  <Envelope size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>{contact.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 transition-colors hover:text-primary"
                >
                  <Whatsapp size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>{contact.whatsappDisplay}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-background/15 pt-8 text-caption text-background/60 sm:flex-row">
          <p>{site.tagline}</p>
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
