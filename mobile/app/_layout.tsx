import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth";
import { palette } from "../lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      {/* Dark-only mobile theme (see lib/theme.ts): background and bar stay warm charcoal. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Settings" }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Conversation" }} />
        <Stack.Screen name="feed/[id]" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Post" }} />
        <Stack.Screen name="user/[username]" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Profile" }} />
        <Stack.Screen name="academy/index" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Academy" }} />
        <Stack.Screen name="academy/[id]" options={{ headerShown: true, headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink50, title: "Course" }} />
      </Stack>
    </AuthProvider>
  );
}
