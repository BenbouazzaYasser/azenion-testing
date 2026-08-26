import dynamic from "next/dynamic";

/**
 * Lazy load components that are not needed on initial page load.
 * This improves first contentful paint and time to interactive.
 */

// Modal/Dialog components - loaded only when needed
export const NotificationCenter = dynamic(
  () => import("@/components/notifications/notification-center").then(mod => ({ default: mod.NotificationCenter })),
  { loading: () => null, ssr: false }
);

export const OnboardingModal = dynamic(
  () => import("@/components/onboarding/onboarding-modal").then(mod => ({ default: mod.OnboardingModal })),
  { loading: () => null, ssr: false }
);

// Feed components - heavy components loaded on demand
export const FeedList = dynamic(
  () => import("@/components/feed/feed-list").then(mod => ({ default: mod.FeedList })),
  { loading: () => null }
);

// Chat components
export const ChatSidebar = dynamic(
  () => import("@/components/chat/chat-sidebar").then(mod => ({ default: mod.ChatSidebar })),
  { loading: () => null, ssr: false }
);

export const ChatConversation = dynamic(
  () => import("@/components/chat/chat-conversation").then(mod => ({ default: mod.ChatConversation })),
  { loading: () => null, ssr: false }
);

// Team/Branch components
export const TeamForm = dynamic(
  () => import("@/components/sections/teams/create-team-form").then(mod => ({ default: mod.CreateTeamForm })),
  { loading: () => null }
);

export const ProjectCard = dynamic(
  () => import("@/components/sections/projects/project-card").then(mod => ({ default: mod.ProjectCard })),
  { loading: () => null }
);

// Settings components
export const SettingsPage = dynamic(
  () => import("@/components/settings/settings-page").then(mod => ({ default: mod.SettingsPage })),
  { loading: () => null, ssr: false }
);
