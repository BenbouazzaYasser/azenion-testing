"use client";

import { useTransition, useState } from "react";
import { Plus, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinTeam, leaveTeam } from "@/actions/team.actions";
import { OwnershipLeaveModal } from "@/components/shared/ownership-leave-modal";

interface TeamJoinButtonProps {
  teamId: string;
  teamSlug: string;
  isMember: boolean;
  isOwner: boolean;
  onGoToSettings?: () => void;
}

export function TeamJoinButton({ teamId, teamSlug, isMember, isOwner, onGoToSettings }: TeamJoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  function handleAction() {
    if (isMember && isOwner) {
      setShowLeaveModal(true);
      return;
    }

    startTransition(async () => {
      if (isMember) {
        const result = await leaveTeam(teamId, teamSlug);
        if (result.error) {
          alert(result.error);
        }
      } else {
        const result = await joinTeam(teamId);
        if (result.error) {
          alert(result.error);
        }
      }
    });
  }

  if (isPending) {
    return (
      <Button size="lg" disabled>
        <Loader2 size={16} className="animate-spin" />
        {isMember ? "Leaving..." : "Joining..."}
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

      <OwnershipLeaveModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        type="team"
        onGoToSettings={onGoToSettings}
      />
    </>
  );
}
