import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/**
 * App theme preference (light/dark), persisted to localStorage under
 * `nexora-theme`. Default follows the OS. Applied to <html class="dark"> by the
 * AppShell (scoped to dashboard routes so the marketing site stays light-only).
 */
export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemPrefersDark() ? "dark" : "light",
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "nexora-theme" },
  ),
);
