import { z } from "zod";

export const LIVE_SESSION_HOST_TYPES = ["BRANCH", "TEAM"] as const;
export const LIVE_SESSION_FORMATS = ["ONLINE", "IN_PERSON"] as const;
export const LIVE_SESSION_STATUSES = ["UPCOMING", "LIVE", "ENDED"] as const;

export type LiveSessionHostType = (typeof LIVE_SESSION_HOST_TYPES)[number];
export type LiveSessionFormat = (typeof LIVE_SESSION_FORMATS)[number];
export type LiveSessionStatus = (typeof LIVE_SESSION_STATUSES)[number];

const DATETIME_24H_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export const createLiveSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or less"),
  host_type: z.enum(LIVE_SESSION_HOST_TYPES),
  host_id: z.string().uuid("Please choose a valid host"),
  instructor: z
    .string()
    .max(200, "Instructor name must be 200 characters or less"),
  starts_at: z
    .string()
    .regex(
      DATETIME_24H_RE,
      "Start time must be in 24-hour HH:MM format (e.g. 18:30)"
    ),
  ends_at: z
    .string()
    .regex(
      DATETIME_24H_RE,
      "End time must be in 24-hour HH:MM format (e.g. 18:30)"
    )
    .nullable()
    .optional(),
  location: z
    .string()
    .max(500, "Location must be 500 characters or less")
    .nullable()
    .optional(),
  meeting_url: z
    .string()
    .max(500, "Meeting link must be 500 characters or less")
    .nullable()
    .optional(),
  format: z.enum(LIVE_SESSION_FORMATS).default("ONLINE"),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity is too large")
    .nullable()
    .optional(),
  topics: z
    .array(z.string().trim().min(1).max(60))
    .max(20, "Maximum 20 topics")
    .default([]),
});

export const updateLiveSessionSchema = createLiveSessionSchema.extend({
  id: z.string().uuid(),
});

export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;

export interface LiveSessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  host_type: LiveSessionHostType;
  host_id: string;
  host_name: string;
  instructor: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_url: string | null;
  format: LiveSessionFormat;
  capacity: number | null;
  status: LiveSessionStatus;
  topics: string[];
  created_by: string | null;
  duration_minutes: number | null;
  attendee_count: number;
  joined: boolean;
  seats_remaining: number | null;
}

export interface LiveSessionWithManage extends LiveSessionRow {
  canManage: boolean;
}

export interface ManageableHostOption {
  host_type: LiveSessionHostType;
  host_id: string;
  host_name: string;
}
