import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-surface-active text-foreground hover:bg-border",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary hover:text-primary",
        ghost: "bg-transparent text-foreground hover:bg-surface-hover",
        link: "h-auto bg-transparent p-0 text-primary underline-offset-4 hover:text-accent hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-caption",
        md: "h-11 px-5 text-body",
        lg: "h-12 px-7 text-body",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

/**
 * Primary #E08A20 button (foreground text, rounded-md, hover → accent) plus
 * secondary / outline / ghost / link variants. `loading` shows a spinner and
 * disables the button. `asChild` renders the styling onto a child element.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {!asChild && loading && <Spinner size={16} />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
