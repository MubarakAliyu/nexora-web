"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSession } from "@/lib/stores/session";

/**
 * Frontend inactivity threshold. Backend is the source of truth for session
 * validity and will override this once integrated. Duration pending stakeholder
 * confirmation — 15 / 30 / 60 minutes were discussed on 27 Aug, none chosen.
 *
 * Change these two values only; everything below derives from them.
 */
export const SESSION_TIMEOUT_MINUTES = 30;
export const SESSION_WARNING_MINUTES = 2;

const MIN = 60_000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;

const mmss = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Inactivity watchdog for authenticated routes.
 *
 * Timing lives in refs and a plain `setInterval`, deliberately: the countdown is a
 * text update once a second, not a state-driven animation, which keeps it clear of
 * the standing rule against Framer `animate` and layout-property transitions.
 *
 * Mounted inside the app shell only, so the marketing site never runs it.
 */
export function SessionTimeout() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);

  const [warning, setWarning] = React.useState(false);
  const [remaining, setRemaining] = React.useState(SESSION_WARNING_MINUTES * MIN);
  const lastActivity = React.useRef(Date.now());
  const warningRef = React.useRef(false);

  const reset = React.useCallback(() => {
    lastActivity.current = Date.now();
    if (warningRef.current) {
      warningRef.current = false;
      setWarning(false);
    }
  }, []);

  const expire = React.useCallback(() => {
    warningRef.current = false;
    setWarning(false);
    logout();
    try { sessionStorage.setItem("nexora-session-expired", "1"); } catch { /* private mode */ }
    router.replace("/login");
  }, [logout, router]);

  React.useEffect(() => {
    if (!user) return;

    const onActivity = () => reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const untilExpiry = SESSION_TIMEOUT_MINUTES * MIN - idle;

      if (untilExpiry <= 0) { expire(); return; }
      if (untilExpiry <= SESSION_WARNING_MINUTES * MIN) {
        if (!warningRef.current) { warningRef.current = true; setWarning(true); }
        setRemaining(untilExpiry);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, [user, reset, expire]);

  if (!user) return null;

  return (
    <Dialog open={warning} onOpenChange={() => { /* must choose — not dismissible by clicking away */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={20} className="text-primary" /> Are you still there?
          </DialogTitle>
          <DialogDescription>
            Your session will expire in{" "}
            <span className="font-mono font-semibold text-foreground">{mmss(remaining)}</span>{" "}
            due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={expire}>Log out now</Button>
          <Button onClick={reset}>Continue session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
