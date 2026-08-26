import { z } from "zod";

export const LAB_CATEGORIES = [
  "Programming",
  "Web Development",
  "Backend",
  "Frontend",
  "Full Stack",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "Cybersecurity",
  "Cloud",
  "Mobile",
  "Other",
] as const;

export const LAB_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export type LabCategory = (typeof LAB_CATEGORIES)[number];
export type LabDifficulty = (typeof LAB_DIFFICULTIES)[number];

export const labSchema = z.object({
  id: z.string().uuid("Invalid lab id"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be 5000 characters or less")
    .optional()
    .default(""),
  category: z.enum(LAB_CATEGORIES),
  difficulty: z.enum(LAB_DIFFICULTIES),
  estimated_duration_minutes: z
    .number()
    .int("Duration must be a whole number")
    .min(0, "Duration must be 0 or greater")
    .max(10000, "Duration must be 10000 minutes or less")
    .optional()
    .default(0),
  tags: z
    .array(z.string().trim().max(30, "Each tag must be 30 characters or less"))
    .max(10, "Maximum of 10 tags")
    .optional(),
  is_published: z.boolean().optional().default(false),
});

export type LabInput = z.infer<typeof labSchema>;

export interface LabRow {
  id: string;
  title: string;
  description: string | null;
  category: LabCategory;
  difficulty: LabDifficulty;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  is_published: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LabVersionRow {
  id: string;
  lab_id: string;
  version_number: number;
  instructions_url: string | null;
  starter_code_url: string | null;
  test_file_url: string | null;
  solution_url: string | null;
  resources_url: string | null;
  created_by: string;
  created_at: string;
}

export interface LabSubmissionRow {
  id: string;
  lab_id: string;
  user_id: string;
  lab_version_id: string;
  status: "in_progress" | "submitted" | "passed" | "failed";
  submission_url: string | null;
  test_results: Record<string, any> | null;
  feedback_url: string | null;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}
