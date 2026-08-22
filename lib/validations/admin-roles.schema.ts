import { z } from "zod";

export const adminSearchUsersSchema = z.object({
  query: z.string().trim().max(100, "Query must be 100 characters or less"),
});

export type AdminSearchUsersInput = z.infer<typeof adminSearchUsersSchema>;

export const adminAssignRoleSchema = z.object({
  user_id: z.string().uuid("Invalid user"),
  role_name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,49}$/, "Invalid role name"),
});

export type AdminAssignRoleInput = z.infer<typeof adminAssignRoleSchema>;
