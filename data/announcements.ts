export interface Announcement {
  id: string;
  emoji: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  details?: string[];
  date?: string;
}

export const announcements: Announcement[] = [
  {
    id: "welcome",
    emoji: "🚀",
    title: "Welcome to Azenion",
    category: "Platform",
    description:
      "Welcome to Azenion, The Limitless Network. Today marks the beginning of a community dedicated to connecting ambitious students, innovators and builders across institutions.",
    badge: "Latest",
    date: "2024",
  },
  {
    id: "website-launch",
    emoji: "🌐",
    title: "Website Launch",
    category: "Development",
    description:
      "The first version of the Azenion website is now live. More pages, features and community tools will continue to be released over time.",
    date: "2024",
  },
  {
    id: "first-branches",
    emoji: "🏫",
    title: "First Branches Available",
    category: "Community",
    description:
      "The first official branches are now available. Members can now join their institution and become part of the growing ecosystem.",
    details: ["EMSI", "FSR"],
    date: "2024",
  },
];
