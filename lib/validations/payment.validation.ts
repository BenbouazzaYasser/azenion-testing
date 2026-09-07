import { z } from "zod";

export const createCheckoutSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export const coursePurchaseSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  currency: z.enum(["mad"]).default("mad"),
});

export type CreateCheckoutForm = z.infer<typeof createCheckoutSchema>;
export type CoursePurchaseForm = z.infer<typeof coursePurchaseSchema>;
