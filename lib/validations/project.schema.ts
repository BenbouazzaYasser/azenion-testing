import { z } from "zod";

export const MAX_ASSET_SIZE = 2 * 1024 * 1024;
export const ALLOWED_ASSET_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const createProjectSchema = z.object({
  team_id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Name must be 100 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must be 80 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
  visibility: z.enum(["open", "private", "invite_only"]).default("open"),
  logo_url: z.string().nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createProjectUpdateSchema = z.object({
  project_id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  body: z
    .string()
    .max(5000, "Body must be 5000 characters or less")
    .nullable()
    .optional(),
});

export type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;

export const updateProjectUpdateSchema = z.object({
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
});

export type UpdateProjectUpdateInput = z.infer<typeof updateProjectUpdateSchema>;

export const createTeamUpdateSchema = z.object({
  team_id: z.string().uuid(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  body: z
    .string()
    .max(5000, "Body must be 5000 characters or less")
    .nullable()
    .optional(),
});

export type CreateTeamUpdateInput = z.infer<typeof createTeamUpdateSchema>;

export const updateTeamUpdateSchema = z.object({
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
});

export type UpdateTeamUpdateInput = z.infer<typeof updateTeamUpdateSchema>;
