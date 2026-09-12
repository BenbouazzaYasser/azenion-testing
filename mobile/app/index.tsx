import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { Loading, Screen } from "../components/ui";

export default function Index() {
  const { session, bootstrapped } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!bootstrapped) return;
    router.replace(session ? "/(tabs)/home" : "/login");
  }, [bootstrapped, session, router]);

  return (
    <Screen>
      <Loading label="Loading Azenion…" />
    </Screen>
  );
}
