import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { palette } from "../../lib/theme";
import { Loading, Screen } from "../../components/ui";
import { TabIcon, type TabRoute } from "../../components/icons";

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

  const icon = (route: TabRoute) => (props: { focused: boolean }) => (
    <TabIcon route={route} focused={props.focused} />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.accent400,
        tabBarInactiveTintColor: palette.ink500,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="search" options={{ title: "Search", tabBarIcon: icon("search") }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: icon("chat") }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: icon("notifications") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("profile") }} />
    </Tabs>
  );
}
