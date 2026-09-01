import { z } from "zod";

export const COURSE_CATEGORIES = [
  "Programming",
  "Engineering",
  "AI",
  "Mathematics",
  "Cybersecurity",
  "Design",
  "Data Science",
  "Cloud Computing",
  "Mobile Development",
  "Business",
  "Marketing",
  "DevOps",
  "Web Development",
  "Blockchain",
  "Networking",
  "Databases",
  "Game Development",
  "Robotics",
  "IoT",
  "Embedded Systems",
] as const;

export const COURSE_CONTENT_TYPES = ["html_css", "pdf"] as const;

export const COURSE_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
export type CourseContentType = (typeof COURSE_CONTENT_TYPES)[number];
export type CourseDifficulty = (typeof COURSE_DIFFICULTIES)[number];

export const courseSchema = z.object({
  id: z.string().uuid("Invalid course id"),
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
  category: z.enum(COURSE_CATEGORIES),
  duration: z
    .string()
    .trim()
    .max(50, "Duration must be 50 characters or less")
    .optional()
    .default(""),
  difficulty: z.enum(COURSE_DIFFICULTIES).optional(),
  tags: z
    .array(z.string().trim().max(30, "Each tag must be 30 characters or less"))
    .max(10, "Maximum of 10 tags")
    .optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: CourseContentType;
  file_url: string;
  thumbnail: string | null;
  duration: string | null;
  difficulty: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
}