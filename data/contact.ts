export interface SocialLink {
  label: string;
  href: string;
}

export interface ContactChannel {
  label: string;
  description: string;
  detail: string;
  href: string;
}

export const CONTACT = {
  email: "Azenion@outlook.com",
  emailHref: "mailto:Azenion@outlook.com",
  socials: [
    { label: "X (Twitter)", href: "https://x.com/azenion" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/azenion" },
    { label: "Instagram", href: "https://instagram.com/Azenion8" },
  ] as SocialLink[],
  channels: [
    {
      label: "Email",
      description: "Reach out directly — we read every message.",
      detail: "Azenion@outlook.com",
      href: "mailto:Azenion@outlook.com",
    },
    {
      label: "Discord",
      description: "Join the conversation in our community server.",
      detail: "discord.gg/3As5ndwwh",
      href: "https://discord.gg/3As5ndwwh",
    },
    {
      label: "LinkedIn",
      description: "Follow us for updates, stories, and opportunities.",
      detail: "linkedin.com/company/azenion",
      href: "https://www.linkedin.com/company/azenion",
    },
    {
      label: "GitHub",
      description: "Explore our open-source projects and contribute.",
      detail: "github.com/azenion",
      href: "#",
    },
  ] as ContactChannel[],
};
