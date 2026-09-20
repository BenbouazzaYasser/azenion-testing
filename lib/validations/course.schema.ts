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
  "Machine Learning",
  "Big Data",
  "Operating Systems",
  "System Administration",
  "Software Testing",
  "AR/VR",
  "Quantum Computing",
  "Edge Computing",
  "Computer Architecture",
  "Computer Science",
  "Information Systems",
  "Software Architecture",
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
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  tags: z
    .array(z.string().trim().max(30, "Each tag must be 30 characters or less"))
    .max(10, "Maximum of 10 tags")
    .optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;

/** A team the current user may publish courses on behalf of (server-derived). */
export interface CoursePublisherTeam {
  team_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface CoursePublisherProfile {
  username: string;
  full_name: string | null;
}

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
  status: "draft" | "published" | "archived";
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  publisher_type: "user" | "team" | null;
  publisher_team_id: string | null;
  published_by: string | null;
  published_at: string | null;
  publisher_team: { name: string; slug: string; logo_url: string | null } | null;
  publisher_profile: CoursePublisherProfile | null;
}
