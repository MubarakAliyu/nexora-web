import { create } from "zustand";

/**
 * Integration connection state (Revision D). Session-scoped — credentials are
 * never really stored; we only track which services are "connected" and the
 * non-secret display fields so the UI reflects a successful configure.
 */
export interface IntegrationConfig {
  connected: boolean;
  /** Non-secret fields worth echoing back (mode, from email, region…). */
  display?: Record<string, string>;
}

interface IntegrationsState {
  configs: Record<string, IntegrationConfig>;
  isConnected: (id: string) => boolean;
  save: (id: string, display?: Record<string, string>) => void;
}

export const useIntegrations = create<IntegrationsState>((set, get) => ({
  configs: {
    flutterwave: { connected: true },
    resend: { connected: true },
    africastalking: { connected: true },
  },
  isConnected: (id) => get().configs[id]?.connected ?? false,
  save: (id, display) =>
    set((s) => ({ configs: { ...s.configs, [id]: { connected: true, display } } })),
}));
