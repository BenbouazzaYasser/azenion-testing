/**
 * Pure paid-course file-access decision (unit-tested; no I/O).
 * Paid = is_free === false. Free courses (including drafts) keep existing behavior.
 */
export interface FileAccessInput {
  isFree: boolean | null;
  ownerId: string | null;
  callerUserId: string | null;
  isStaff: boolean;
  hasActiveEntitlement: boolean;
}

export type FileAccessDecision = "allow" | "deny_unauthenticated" | "deny_forbidden";

export function decideFileAccess(input: FileAccessInput): FileAccessDecision {
  if (input.isFree !== false) return "allow";
  if (!input.callerUserId) return "deny_unauthenticated";
  if (input.ownerId && input.ownerId === input.callerUserId) return "allow";
  if (input.isStaff) return "allow";
  if (input.hasActiveEntitlement) return "allow";
  return "deny_forbidden";
}
