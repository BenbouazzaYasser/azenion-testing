import { Ionicons } from "@expo/vector-icons";
import { palette } from "../lib/theme";

export type TabRoute = "home" | "search" | "chat" | "notifications" | "profile";

const TAB_ICONS: Record<TabRoute, { on: string; off: string }> = {
  home: { on: "home", off: "home-outline" },
  search: { on: "search", off: "search-outline" },
  chat: { on: "chatbubbles", off: "chatbubbles-outline" },
  notifications: { on: "notifications", off: "notifications-outline" },
  profile: { on: "person", off: "person-outline" },
};

/** Single source of truth for tab iconography + shared action glyphs. */
export function TabIcon({ route, focused }: { route: TabRoute; focused: boolean }) {
  const set = TAB_ICONS[route];
  return (
    <Ionicons
      name={(focused ? set.on : set.off) as keyof typeof Ionicons.glyphMap}
      size={24}
      color={focused ? palette.accent400 : palette.ink500}
    />
  );
}

export function ActionIcon({
  name,
  size = 20,
  color = palette.ink400,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
