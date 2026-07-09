import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

/** App-shell UI state (sidebar collapse), persisted to localStorage. */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: "nexora-ui" },
  ),
);
