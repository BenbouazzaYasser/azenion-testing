import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button, Input, Loading, Screen, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { palette, spacing } from "../lib/theme";

export default function Login() {
  const { session, bootstrapped, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.replace("/(tabs)/home");
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.md }} keyboardShouldPersistTaps="handled">
          <Txt variant="title" weight="700">
            Welcome back
          </Txt>
          <View style={{ height: spacing.xs }} />
          <Txt color={palette.ink400}>Sign in to your Azenion account.</Txt>
          <View style={{ height: spacing.lg }} />
          <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" returnKeyType="next" />
          <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry returnKeyType="go" onSubmitEditing={() => void onSubmit()} />
          {error ? <Txt color={palette.danger}>{error}</Txt> : null}
          <View style={{ height: spacing.sm }} />
          <Button title={busy ? "Signing in…" : "Sign in"} onPress={onSubmit} disabled={busy || !email || !password} />
          <View style={{ height: spacing.md }} />
          <Link href="/signup" asChild>
            <Txt color={palette.accent400}>No account yet? Create one</Txt>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
