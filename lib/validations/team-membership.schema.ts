import { z } from "zod";

export const requestTeamJoinSchema = z.object({
  team_id: z.string().uuid("Invalid team"),
  message: z
    .string()
    .max(300, "Message must be 300 characters or less")
    .optional()
    .default(""),
});

export type RequestTeamJoinInput = z.infer<typeof requestTeamJoinSchema>;

export const reviewJoinRequestSchema = z.object({
  request_id: z.string().uuid("Invalid request"),
  accept: z.boolean(),
});

export type ReviewJoinRequestInput = z.infer<typeof reviewJoinRequestSchema>;

export const inviteTeamMemberSchema = z
  .object({
    team_id: z.string().uuid("Invalid team"),
    username: z
      .string()
      .trim()
      .max(50, "Username must be 50 characters or less")
      .optional()
      .default(""),
    email: z
      .string()
      .trim()
      .max(254, "Email must be 254 characters or less")
      .optional()
      .default(""),
  })
  .refine((v) => v.username !== "" || v.email !== "", {
    message: "Enter a username or email",
  });

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

export const respondToInvitationSchema = z.object({
  invitation_id: z.string().uuid("Invalid invitation"),
  accept: z.boolean(),
});

export type RespondToInvitationInput = z.infer<typeof respondToInvitationSchema>;
