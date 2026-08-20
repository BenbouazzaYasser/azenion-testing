import { z } from "zod";

export const createAnnouncementSchema = z.object({
  emoji: z
    .string()
    .max(16, "Emoji must be 16 characters or less")
    .default("📢"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(80, "Category must be 80 characters or less")
    .default("Platform"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
  badge: z
    .string()
    .max(40, "Badge must be 40 characters or less")
    .nullable()
    .optional(),
  details: z
    .array(z.string().max(500, "Detail lines must be 500 characters or less"))
    .max(10, "You can add at most 10 detail bullets")
    .nullable()
    .optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z.object({
  id: z.string().uuid(),
  emoji: z.string().max(16, "Emoji must be 16 characters or less"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(80, "Category must be 80 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
  badge: z.string().max(40, "Badge must be 40 characters or less").nullable().optional(),
  details: z
    .array(z.string().max(500, "Detail lines must be 500 characters or less"))
    .max(10, "You can add at most 10 detail bullets")
    .nullable()
    .optional(),
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
