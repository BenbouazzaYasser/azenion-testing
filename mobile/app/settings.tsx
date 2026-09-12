import { View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Button, Card, Screen, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { clearPeerCache } from "../lib/peers";
import { API_BASE_URL, APP_VERSION } from "../lib/config";
import { palette, spacing } from "../lib/theme";

export default function Settings() {
  const { user, hydrate, signOut } = useAuth();
  const router = useRouter();

  async function onSignOut() {
    clearPeerCache();
    await signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <Card>
        <Txt variant="caption" color={palette.ink500}>
          ACCOUNT
        </Txt>
        <View style={{ height: spacing.xs }} />
        <Txt weight="600">{user?.email ?? "—"}</Txt>
        {hydrate ? (
          <Txt variant="caption" color={palette.ink400}>
            {hydrate.roles.length > 0 ? hydrate.roles.join(" · ") : "member"}
            {hydrate.isCourseManager ? " · course manager" : ""}
          </Txt>
        ) : null}
      </Card>
      <Card>
        <Txt variant="caption" color={palette.ink500}>
          APP
        </Txt>
        <View style={{ height: spacing.xs }} />
        <Txt color={palette.ink200}>Azenion v{APP_VERSION}</Txt>
        <Txt variant="caption" color={palette.ink500}>
          Backend {API_BASE_URL} · Expo {Constants.expoVersion ?? "—"}
        </Txt>
      </Card>
      <Button title="Sign out" variant="secondary" onPress={() => void onSignOut()} />
    </Screen>
  );
}
