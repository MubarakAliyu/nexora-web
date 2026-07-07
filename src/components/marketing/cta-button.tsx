import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "flowbite-react-icons/outline";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Reusable animated CTA — the single call-to-action treatment used site-wide.
 * Renders a Link (internal/external) or a button, styled with buttonVariants,
 * plus a right-sliding arrow on hover and a slight scale-down on press. Motion
 * is CSS-transition based, so it flattens automatically under reduced-motion.
 */
interface CtaButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  withArrow?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  "aria-label"?: string;
}

export function CtaButton({
  children,
  href,
  external,
  withArrow = true,
  variant,
  size,
  className,
  onClick,
  type = "button",
  ...rest
}: CtaButtonProps) {
  const classes = cn(
    buttonVariants({ variant, size }),
    "group/cta transition-transform active:scale-[0.97]",
    className,
  );

  const content = (
    <span className="inline-flex items-center gap-2">
      {children}
      {withArrow && (
        <ArrowRight
          size={18}
          className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
        />
      )}
    </span>
  );

  if (href) {
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {content}
      </a>
    ) : (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} {...rest}>
      {content}
    </button>
  );
}
