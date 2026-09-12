import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { palette } from "../../lib/theme";
import { Loading, Screen } from "../../components/ui";

export default function TabsLayout() {
  const { session, bootstrapped } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (bootstrapped && !session) router.replace("/login");
  }, [bootstrapped, session, router]);

  if (!bootstrapped || !session) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.accent400,
        tabBarInactiveTintColor: palette.ink500,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
