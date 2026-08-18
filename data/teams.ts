export interface TeamRole {
  id: string;
  title: string;
  description: string;
}

export interface TeamProject {
  id: string;
  title: string;
  description: string;
  status: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface TeamValue {
  id: string;
  title: string;
  description: string;
}

export interface Team {
  slug: string;
  name: string;
  tagline: string;
  status: string;
  memberCount?: number;
  about: string;
  aboutAdditional: string[];
  roles: TeamRole[];
  projects: TeamProject[];
  members?: TeamMember[];
  values: TeamValue[];
  joinCtaLabel?: string;
  joinCtaHref?: string;
}

export const teams: Team[] = [
  {
    slug: "azenion-core-team",
    name: "Azenion Core Team",
    tagline: "Building the platform, growing the community",
    status: "Recruiting",
    about:
      "The Azenion Core Team is responsible for designing, developing and growing the Azenion ecosystem. Members collaborate on the platform itself, organize initiatives, improve the community experience and shape the future of The Limitless Network.",
    aboutAdditional: [
      "Operating across all Azenion branches and initiatives, the Core Team shapes the platform roadmap, designs community experiences, and ensures the network keeps growing in the right direction.",
      "From organising network-wide events to maintaining the infrastructure that makes Azenion possible — this team is where the vision becomes reality.",
    ],
    roles: [
      {
        id: "frontend",
        title: "Frontend Developers",
        description:
          "Build beautiful, performant interfaces using Next.js, Tailwind CSS, and modern React patterns.",
      },
      {
        id: "backend",
        title: "Backend Developers",
        description:
          "Design and maintain scalable APIs, databases, and server infrastructure that power the network.",
      },
      {
        id: "design",
        title: "UI/UX Designers",
        description:
          "Craft intuitive, premium experiences that make collaboration feel effortless and inspiring.",
      },
      {
        id: "community",
        title: "Community Managers",
        description:
          "Nurture the Azenion community, onboard new members, and keep the energy alive across branches.",
      },
      {
        id: "content",
        title: "Content Creators",
        description:
          "Produce engaging content — from social media to technical writing — that tells the Azenion story.",
      },
    ],
    projects: [
      {
        id: "website",
        title: "Azenion Website",
        description:
          "The public face of the network — a premium, cinematic web experience built with Next.js.",
        status: "Active",
      },
      {
        id: "platform",
        title: "Community Platform",
        description:
          "A unified hub where members connect, collaborate on projects, and track their growth.",
        status: "In Development",
      },
      {
        id: "brand",
        title: "Brand Identity",
        description:
          "Shaping the visual identity, design system, and narrative that defines the Limitless Network.",
        status: "Ongoing",
      },
    ],
    values: [
      {
        id: "collaboration",
        title: "Collaboration",
        description:
          "The best outcomes emerge when diverse minds work together toward a shared vision.",
      },
      {
        id: "innovation",
        title: "Innovation",
        description:
          "We challenge conventions, experiment boldly, and embrace failure as a step forward.",
      },
      {
        id: "ownership",
        title: "Ownership",
        description:
          "Every member takes responsibility and drives their piece of the mission forward.",
      },
      {
        id: "excellence",
        title: "Excellence",
        description:
          "We hold ourselves to high standards in code, design, communication, and culture.",
      },
      {
        id: "continuous-learning",
        title: "Continuous Learning",
        description:
          "We grow by teaching each other, sharing knowledge, and staying curious.",
      },
    ],
  },
];

export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((team) => team.slug === slug);
}
