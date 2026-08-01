import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be under 100 characters"),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(30, "Username must be under 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    ),
  bio: z
    .string()
    .max(500, "Bio must be under 500 characters")
    .nullable()
    .optional(),
  institution: z
    .string()
    .max(100, "Institution must be under 100 characters")
    .nullable()
    .optional(),
  skills: z
    .array(z.string().max(50))
    .max(20, "Maximum 20 skills allowed")
    .optional(),
  github_url: z
    .string()
    .url("Must be a valid URL")
    .nullable()
    .optional()
    .or(z.literal("")),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
