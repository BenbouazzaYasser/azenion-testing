import { z } from "zod";

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be 100 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must be 80 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .nullable()
    .optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  logo_url: z.string().nullable().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  team_id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be 100 characters or less")
    .optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must be 80 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .nullable()
    .optional(),
  visibility: z.enum(["public", "private"]).optional(),
  logo_url: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
  technologies: z.array(z.string()).optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const openRoleSchema = z.object({
  id: z.string().uuid().optional(),
  team_id: z.string().uuid(),
  title: z.string().min(1, "Role title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity must be 100 or less").default(1),
});

export type OpenRoleInput = z.infer<typeof openRoleSchema>;
