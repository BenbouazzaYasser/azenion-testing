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
import { useTranslation } from "@/components/translation/translation-provider";

export type TeamRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | null;

interface TeamJoinButtonProps {
  teamId: string;
  teamName: string;
  teamSlug: string;
  isMember: boolean;
  isOwner: boolean;
  requestStatus?: TeamRequestStatus;
  onGoToSettings?: () => void;
  className?: string;
}

export function TeamJoinButton({
  teamId,
  teamName,
  teamSlug,
  isMember,
  isOwner,
  requestStatus = null,
  onGoToSettings,
  className,
}: TeamJoinButtonProps) {
  const { t } = useTranslation();
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
      toast.info(t("teams.signInToJoin"));
      router.push(`/login${next}`);
      return;
    }

    setShowRequestDialog(true);
  }

  if (isPending) {
    return (
      <Button size="lg" disabled>
        <Loader2 size={16} className="animate-spin" />
        {t("teams.leaving")}
      </Button>
    );
  }

  if (isRequestPending && !isMember) {
    return (
      <Button size="lg" variant="secondary" disabled className={className} title={t("teams.requestAwaitingReview")}>
        <Hourglass size={16} />
        {t("teams.requestSent")}
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" onClick={handleAction} variant={isMember ? "secondary" : "primary"} className={isMember ? className : undefined}>
        {isMember ? (
          <>
            <LogOut size={16} />
            {t("teams.leaveTeam")}
          </>
        ) : (
          <>
            <Plus size={16} />
            {t("teams.joinTeam")}
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
