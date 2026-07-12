import { create } from "zustand";

interface LiveState {
  /** Bumped by every data mutation. Consumers (useAsync) subscribe to it and
   *  re-fetch, so every list / detail / dashboard / chart updates live. */
  revision: number;
  bump: () => void;
}

export const useLive = create<LiveState>((set) => ({
  revision: 0,
  bump: () => set((s) => ({ revision: s.revision + 1 })),
}));
