import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

/** Calm split auth chrome: brand panel + form area. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/properties/tower-poolside.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-foreground/75" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="inline-block">
            <Image
              src="/brand/logo-white.svg"
              alt="Nexora"
              width={180}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <div>
            <h2 className="font-heading text-h1 font-medium leading-tight text-background md:text-hero md:leading-[1.1]">
              Managing Properties. Maximizing Value.
            </h2>
            <p className="mt-5 max-w-md text-body text-background/80">
              The Nexora platform — transparent, professional property management for
              owners, investors and residents.
            </p>
          </div>
          <p className="text-caption text-background/60">A Groupe M-Zi Inc. Company</p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Image
              src="/brand/logo-primary.svg"
              alt="Nexora"
              width={160}
              height={37}
              className="h-8 w-auto"
            />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
