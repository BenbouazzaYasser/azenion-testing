export type ProjectStatus = "Active" | "Planning" | "Concept" | "In Development" | "Completed" | "On Hold";

export interface ProjectContributor {
  id: string;
  name: string;
  role: string;
}

export interface ProjectRole {
  id: string;
  title: string;
  description: string;
}

export interface ProjectRoadmapItem {
  id: string;
  phase: string;
  description: string;
  status: "Completed" | "In Progress" | "Upcoming";
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  memberCount?: number;
  technologies: string[];
  about: string;
  aboutAdditional: string[];
  contributors: ProjectContributor[];
  roles: ProjectRole[];
  roadmap: ProjectRoadmapItem[];
  joinCtaLabel?: string;
  joinCtaHref?: string;
}

export const projects: Project[] = [
  {
    slug: "azenion-website",
    title: "Azenion Website",
    tagline: "The public face of the Limitless Network",
    description:
      "Developing the official Azenion platform to connect ambitious students worldwide.",
    status: "Active",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
    about:
      "The Azenion website is the central hub of the Limitless Network — a premium, cinematic web experience that introduces visitors to the ecosystem, highlights branches and teams, and serves as the gateway for new members to join the community.",
    aboutAdditional: [
      "Built with Next.js and Tailwind CSS, the site features a dark cosmic aesthetic, glassmorphism design, and smooth reveal animations that reflect the innovation-driven spirit of the Azenion community.",
      "Every page is crafted to feel both aspirational and inviting — from the cinematic hero sections to the premium card layouts, the website embodies the quality and ambition of the projects built within the network.",
    ],
    contributors: [
      { id: "ziyad", name: "Ziyad", role: "Founder & Lead Developer" },
    ],
    roles: [
      {
        id: "frontend",
        title: "Frontend Developer",
        description:
          "Help build and maintain the Next.js frontend — components, animations, and responsive layouts.",
      },
      {
        id: "backend",
        title: "Backend Developer",
        description:
          "Design APIs and data pipelines to power dynamic content across the platform.",
      },
      {
        id: "content",
        title: "Content Strategist",
        description:
          "Shape the narrative, write compelling copy, and ensure the site communicates the Azenion vision clearly.",
      },
    ],
    roadmap: [
      {
        id: "phase-1",
        phase: "Core Pages & Navigation",
        description:
          "Build the main pages (Home, Branches, Teams, Projects) with full responsive layout and navigation.",
        status: "Completed",
      },
      {
        id: "phase-2",
        phase: "Interactive Features",
        description:
          "Add dynamic filtering, search, and real-time project/team data with a backend integration.",
        status: "In Progress",
      },
      {
        id: "phase-3",
        phase: "Community Dashboard",
        description:
          "Launch a member dashboard with profiles, project contributions, and collaboration tools.",
        status: "Upcoming",
      },
    ],
  },
  {
    slug: "azenion-mobile",
    title: "Azenion Mobile",
    tagline: "The future of Azenion in your pocket",
    description:
      "Designing the future mobile experience for the Azenion ecosystem.",
    status: "Planning",
    technologies: ["React Native", "Expo", "TypeScript"],
    about:
      "Azenion Mobile will bring the Limitless Network to your pocket — a companion app that lets members stay connected, discover projects, and collaborate on the go.",
    aboutAdditional: [
      "Currently in the planning phase, the mobile app will mirror the core experience of the web platform while introducing mobile-first features like push notifications, real-time messaging, and location-based branch discovery.",
      "Built with React Native and Expo, the app will share TypeScript types with the web platform for a unified development experience across devices.",
    ],
    contributors: [],
    roles: [
      {
        id: "mobile-dev",
        title: "Mobile Developer",
        description:
          "Build cross-platform mobile experiences using React Native and Expo.",
      },
      {
        id: "ui-designer",
        title: "Mobile UI Designer",
        description:
          "Design intuitive mobile interfaces that maintain the premium Azenion aesthetic.",
      },
    ],
    roadmap: [
      {
        id: "phase-1",
        phase: "Design & Prototyping",
        description:
          "Define the mobile design system, create wireframes, and build interactive prototypes.",
        status: "Upcoming",
      },
      {
        id: "phase-2",
        phase: "Core Features",
        description:
          "Implement authentication, project browsing, team chat, and notification systems.",
        status: "Upcoming",
      },
      {
        id: "phase-3",
        phase: "Launch",
        description:
          "Beta testing, app store submission, and public release.",
        status: "Upcoming",
      },
    ],
  },
  {
    slug: "community-platform",
    title: "Community Platform",
    tagline: "The engine powering collaboration",
    description:
      "Building the future collaboration platform powering the Azenion community.",
    status: "Concept",
    technologies: ["Next.js", "Supabase", "PostgreSQL"],
    about:
      "The Community Platform is the digital home of the Azenion network — a unified hub where members connect, collaborate on projects, track their growth, and build lasting relationships across campuses and disciplines.",
    aboutAdditional: [
      "Unlike the public-facing website, the Community Platform will be a logged-in experience with member profiles, project workspaces, discussion channels, and a rich collaboration toolkit.",
      "Powered by Supabase and PostgreSQL, the platform will provide real-time data synchronization, secure authentication, and scalable storage — all while keeping the developer experience fast and familiar.",
    ],
    contributors: [
      { id: "ziyad", name: "Ziyad", role: "Founder & Product Lead" },
    ],
    roles: [
      {
        id: "fullstack",
        title: "Full-Stack Developer",
        description:
          "Build end-to-end features across the Next.js frontend and Supabase backend.",
      },
      {
        id: "database",
        title: "Database Engineer",
        description:
          "Design and optimize PostgreSQL schemas, migrations, and queries for scale.",
      },
      {
        id: "product",
        title: "Product Manager",
        description:
          "Define features, prioritize the roadmap, and gather feedback from the community.",
      },
    ],
    roadmap: [
      {
        id: "phase-1",
        phase: "Foundation",
        description:
          "Set up the Next.js + Supabase stack, authentication, and core data models.",
        status: "In Progress",
      },
      {
        id: "phase-2",
        phase: "Member Profiles & Discovery",
        description:
          "Build member profiles, skill tagging, and a discovery feed for projects and people.",
        status: "Upcoming",
      },
      {
        id: "phase-3",
        phase: "Collaboration Workspace",
        description:
          "Launch project workspaces with task boards, file sharing, and real-time chat.",
        status: "Upcoming",
      },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
