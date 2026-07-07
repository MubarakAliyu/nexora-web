import Link from "next/link";
import { ArrowRight } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

/**
 * Inline text link with an underline that grows from the left on hover and an
 * arrow that nudges right. Primary → accent colour. CSS-transition based.
 */
export function AnimatedLink({
  href,
  children,
  className,
  withArrow = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  withArrow?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/link inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-accent",
        className,
      )}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover/link:scale-x-100" />
      </span>
      {withArrow && (
        <ArrowRight
          size={16}
          className="transition-transform duration-300 ease-out group-hover/link:translate-x-1"
        />
      )}
    </Link>
  );
}
