import { z } from "zod";
import { TeamPermission, TEAM_PERMISSIONS } from "@/lib/team-permissions";

export const roleNameSchema = z
  .string()
  .trim()
  .min(1, "Role name is required")
  .max(40, "Role name must be 40 characters or less");

export const roleColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex value like #2563eb")
  .optional()
  .nullable();

export const createTeamRoleSchema = z.object({
  team_id: z.string().uuid("Invalid team"),
  name: roleNameSchema,
  color: roleColorSchema,
});

export type CreateTeamRoleInput = z.infer<typeof createTeamRoleSchema>;

export const updateTeamRoleSchema = z.object({
  role_id: z.string().uuid("Invalid role"),
  name: roleNameSchema.optional(),
  color: roleColorSchema,
});

export type UpdateTeamRoleInput = z.infer<typeof updateTeamRoleSchema>;

export const deleteTeamRoleSchema = z.object({
  role_id: z.string().uuid("Invalid role"),
  team_id: z.string().uuid("Invalid team"),
});

export type DeleteTeamRoleInput = z.infer<typeof deleteTeamRoleSchema>;

export const setRolePermissionsSchema = z.object({
  role_id: z.string().uuid("Invalid role"),
  permissions: z
    .array(z.nativeEnum(TeamPermission))
    .refine((v) => v.every((p) => TEAM_PERMISSIONS.includes(p)), {
      message: "Unknown permission",
    }),
});

export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;

export const assignMemberRolesSchema = z.object({
  team_id: z.string().uuid("Invalid team"),
  member_id: z.string().uuid("Invalid member"),
  role_ids: z.array(z.string().uuid("Invalid role")),
});

export type AssignMemberRolesInput = z.infer<typeof assignMemberRolesSchema>;
