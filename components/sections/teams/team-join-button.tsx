"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, LogOut, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { leaveTeam } from "@/actions/team.actions";
import { OwnershipLeaveModal } from "@/components/shared/ownership-leave-modal";
import { RequestToJoinDialog } from "./request-to-join-dialog";
import { useUser } from "@/hooks/use-user";

export type TeamRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | null;

interface TeamJoinButtonProps {
  teamId: string;
  teamName: string;
  teamSlug: string;
  isMember: boolean;
  isOwner: boolean;
  requestStatus?: TeamRequestStatus;
  onGoToSettings?: () => void;
}

export function TeamJoinButton({
  teamId,
  teamName,
  teamSlug,
  isMember,
  isOwner,
  requestStatus = null,
  onGoToSettings,
}: TeamJoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();

  const isRequestPending = requestStatus === "PENDING" || requestSent;

  function handleAction() {
    if (isMember && isOwner) {
      setShowLeaveModal(true);
      return;
    }

    if (isMember) {
      startTransition(async () => {
        const result = await leaveTeam(teamId, teamSlug);
        if (result.error) {
          toast.error(result.error);
        }
      });
      return;
    }

    if (!loading && !user) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      toast.info("Sign in to join this team.");
      router.push(`/login${next}`);
      return;
    }

    setShowRequestDialog(true);
  }

  if (isPending) {
    return (
      <Button size="lg" disabled>
        <Loader2 size={16} className="animate-spin" />
        Leaving...
      </Button>
    );
  }

  if (isRequestPending && !isMember) {
    return (
      <Button size="lg" variant="secondary" disabled title="Your request is awaiting review">
        <Hourglass size={16} />
        Request Sent
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" onClick={handleAction} variant={isMember ? "secondary" : "primary"}>
        {isMember ? (
          <>
            <LogOut size={16} />
            Leave Team
          </>
        ) : (
          <>
            <Plus size={16} />
            Join Team
          </>
        )}
      </Button>

      <RequestToJoinDialog
        teamId={teamId}
        teamName={teamName}
        open={!isMember && showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        onSuccess={() => setRequestSent(true)}
      />

      <OwnershipLeaveModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        type="team"
        onGoToSettings={onGoToSettings}
      />
    </>
  );
}
