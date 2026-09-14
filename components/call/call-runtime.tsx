"use client";

import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useCallManager } from "@/lib/call/use-call-manager";
import { IncomingCallOverlay } from "@/components/call/incoming-call-overlay";
import { ActiveCallOverlay } from "@/components/call/active-call-overlay";

/**
 * The heavy half of the call system, code-split into its own chunk and loaded
 * by CallProvider only after hydration. Owns the singleton WebRTC manager
 * (global incoming-call realtime listener, signaling, peer lifecycle, media
 * controls) and renders the incoming/active call overlays.
 *
 * It renders no children, so the provider's `{children}` subtree stays stable
 * — nothing remounts when this chunk arrives.
 */
export function CallRuntime() {
  const manager = useCallManager();
  const pathname = usePathname();
  const canHostOverlay = !pathname || !pathname.startsWith("/login");

  const acceptIncoming = async () => {
    const res = await manager.acceptCall();
    if (res.error) toast.error(res.error);
  };

  return (
    <>
      {canHostOverlay && manager.incomingCall ? (
        <IncomingCallOverlay
          info={manager.incomingCall}
          onAccept={() => void acceptIncoming()}
          onDecline={manager.declineCall}
        />
      ) : null}
      {canHostOverlay && manager.activeCall && manager.activeCall.phase !== "ended" ? (
        <ActiveCallOverlay call={manager.activeCall} manager={manager} />
      ) : null}
    </>
  );
}