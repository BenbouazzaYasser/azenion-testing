import { z } from "zod";

export const MAX_BRANCH_ASSET_SIZE = 2 * 1024 * 1024;
export const ALLOWED_BRANCH_ASSET_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const createBranchSchema = z.object({
  name: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Branch name must be 100 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must be 80 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  institution: z
    .string()
    .max(200, "Institution must be 200 characters or less")
    .nullable()
    .optional(),
  city: z
    .string()
    .max(100, "City must be 100 characters or less")
    .nullable()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .nullable()
    .optional(),
  logo_url: z.string().nullable().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  branch_id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Branch name must be 100 characters or less")
    .optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must be 80 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
    .optional(),
  institution: z
    .string()
    .max(200, "Institution must be 200 characters or less")
    .nullable()
    .optional(),
  city: z
    .string()
    .max(100, "City must be 100 characters or less")
    .nullable()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .nullable()
    .optional(),
  logo_url: z.string().nullable().optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const createBranchAnnouncementSchema = z.object({
  branch_id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  body: z
    .string()
    .max(5000, "Body must be 5000 characters or less")
    .nullable()
    .optional(),
  is_pinned: z.boolean().optional(),
});

export type CreateBranchAnnouncementInput = z.infer<typeof createBranchAnnouncementSchema>;

export const updateBranchAnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  body: z
    .string()
    .max(5000, "Body must be 5000 characters or less")
    .nullable()
    .optional(),
  is_pinned: z.boolean().optional(),
});

export type UpdateBranchAnnouncementInput = z.infer<typeof updateBranchAnnouncementSchema>;

export const createBranchEventSchema = z.object({
  branch_id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  schedule: z
    .string()
    .min(1, "Schedule is required")
    .max(300, "Schedule must be 300 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
  location: z
    .string()
    .max(200, "Location must be 200 characters or less")
    .nullable()
    .optional(),
  starts_at: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Invalid start time")
    .nullable()
    .optional(),
  ends_at: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Invalid end time")
    .nullable()
    .optional(),
  cover_url: z.string().nullable().optional(),
  registration_url: z
    .string()
    .max(500, "Registration URL must be 500 characters or less")
    .nullable()
    .optional(),
  visibility: z.enum(["public", "members"]).default("public"),
});

export type CreateBranchEventInput = z.infer<typeof createBranchEventSchema>;

export const updateBranchEventSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  schedule: z
    .string()
    .min(1, "Schedule is required")
    .max(300, "Schedule must be 300 characters or less")
    .optional(),
  starts_at: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Invalid start time")
    .nullable()
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
  location: z
    .string()
    .max(200, "Location must be 200 characters or less")
    .nullable()
    .optional(),
  ends_at: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Invalid end time")
    .nullable()
    .optional(),
  cover_url: z.string().nullable().optional(),
  registration_url: z
    .string()
    .max(500, "Registration URL must be 500 characters or less")
    .nullable()
    .optional(),
  visibility: z.enum(["public", "members"]).optional(),
});

export type UpdateBranchEventInput = z.infer<typeof updateBranchEventSchema>;

export const createBranchHighlightSchema = z.object({
  branch_id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
  image_url: z.string().nullable().optional(),
  link_url: z
    .string()
    .max(500, "Link must be 500 characters or less")
    .nullable()
    .optional(),
  sort_order: z
    .number()
    .int()
    .min(-100, "Sort order must be between -100 and 100")
    .max(100, "Sort order must be between -100 and 100")
    .default(0),
});

export type CreateBranchHighlightInput = z.infer<typeof createBranchHighlightSchema>;

export const updateBranchHighlightSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
  image_url: z.string().nullable().optional(),
  link_url: z
    .string()
    .max(500, "Link must be 500 characters or less")
    .nullable()
    .optional(),
  sort_order: z.number().int().optional(),
});

export type UpdateBranchHighlightInput = z.infer<typeof updateBranchHighlightSchema>;
