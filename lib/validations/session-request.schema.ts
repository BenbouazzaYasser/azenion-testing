import { z } from "zod";

export const SESSION_REQUEST_FORMATS = ["ONLINE", "IN_PERSON", "EITHER"] as const;
export const SESSION_REQUEST_STATUSES = [
  "PENDING",
  "REVIEWING",
  "ACCEPTED",
  "SCHEDULED",
  "DECLINED",
] as const;

export type SessionRequestFormat = (typeof SESSION_REQUEST_FORMATS)[number];
export type SessionRequestStatus = (typeof SESSION_REQUEST_STATUSES)[number];

export const createSessionRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
  preferred_format: z.enum(SESSION_REQUEST_FORMATS).default("EITHER"),
  preferred_branch_id: z
    .string()
    .uuid("Please choose a valid branch")
    .nullable()
    .optional(),
});

export type CreateSessionRequestInput = z.infer<typeof createSessionRequestSchema>;

export const updateSessionRequestStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SESSION_REQUEST_STATUSES),
  admin_notes: z
    .string()
    .max(2000, "Admin notes must be 2000 characters or less")
    .nullable()
    .optional(),
});

export type UpdateSessionRequestStatusInput = z.infer<typeof updateSessionRequestStatusSchema>;

export interface SessionRequestRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  description: string;
  preferred_format: SessionRequestFormat;
  preferred_branch_id: string | null;
  status: SessionRequestStatus;
  admin_notes: string | null;
  branch_name: string | null;
}

export interface AdminSessionRequestRow extends SessionRequestRow {
  requester_username: string | null;
  requester_full_name: string | null;
  requester_avatar_url: string | null;
}
