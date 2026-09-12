import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { Button, Input, Loading, Screen, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { palette, spacing } from "../lib/theme";

export default function Signup() {
  const { session, bootstrapped, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (bootstrapped && session) router.replace("/(tabs)/home");
  }, [bootstrapped, session, router]);

  if (!bootstrapped) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const res = await signUp(email.trim(), password, username.trim(), fullName.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Txt variant="title" weight="700">
          Join Azenion
        </Txt>
        <View style={{ height: spacing.xs }} />
        <Txt color={palette.ink400}>Email and password only — no OAuth in v1.</Txt>
        <View style={{ height: spacing.lg }} />
        <Input value={fullName} onChangeText={setFullName} placeholder="Display name" autoCapitalize="words" />
        <Input value={username} onChangeText={setUsername} placeholder="Username" />
        <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
        <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Txt color={palette.danger}>{error}</Txt> : null}
        <View style={{ height: spacing.sm }} />
        <Button
          title={busy ? "Creating…" : "Create account"}
          onPress={onSubmit}
          disabled={busy || !email || !password || !username}
        />
        <View style={{ height: spacing.md }} />
        <Link href="/login" asChild>
          <Txt color={palette.accent400}>Already have an account? Sign in</Txt>
        </Link>
      </View>
    </Screen>
  );
}
