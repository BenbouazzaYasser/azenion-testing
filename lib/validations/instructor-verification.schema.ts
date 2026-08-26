import { z } from "zod";

export const instructorVerificationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(200, "Full name must be 200 characters or less"),
  bio: z
    .string()
    .trim()
    .min(10, "Bio must be at least 10 characters")
    .max(2000, "Bio must be 2000 characters or less"),
  expertise_areas: z
    .array(z.string().trim().min(1, "Expertise area cannot be empty"))
    .min(1, "Add at least one expertise area")
    .max(10, "Add at most 10 expertise areas"),
  teaching_experience: z
    .string()
    .trim()
    .max(2000, "Teaching experience must be 2000 characters or less")
    .optional()
    .nullable(),
  portfolio_url: z
    .string()
    .trim()
    .url("Portfolio URL must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  linkedin_url: z
    .string()
    .trim()
    .url("LinkedIn URL must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  github_url: z
    .string()
    .trim()
    .url("GitHub URL must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type InstructorVerificationInput = z.infer<typeof instructorVerificationSchema>;

export interface InstructorVerificationRow {
  id: string;
  user_id: string;
  full_name: string;
  bio: string;
  expertise_areas: string[];
  teaching_experience: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}
