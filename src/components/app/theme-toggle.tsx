"use client";

import * as React from "react";
import { Sun, Moon } from "flowbite-react-icons/outline";
import { useTheme } from "@/lib/stores/theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark toggle. Two variants:
 * - "switch": a labelled pill for the sidebar footer.
 * - "icon": a compact icon button (topbar / settings).
 * Icons cross-fade + rotate via CSS transform (no state-driven Framer animate).
 */
export function ThemeToggle({
  variant = "switch",
  collapsed = false,
}: {
  variant?: "switch" | "icon";
  collapsed?: boolean;
}) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  const icons = (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <Sun
        size={18}
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        size={18}
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </span>
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {icons}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
        collapsed && "justify-center",
      )}
    >
      {icons}
      {!collapsed && <span>{isDark ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
