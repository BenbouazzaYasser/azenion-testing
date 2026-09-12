import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Button, Card, Empty, ErrorState, Header, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { palette, spacing } from "../../lib/theme";

interface PublicProfile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  institution: string | null;
  skills: string[];
  hidden: boolean;
}

interface PostRow {
  id: string;
  title: string;
  body: string | null;
  created_at: string | null;
}

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: me } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    const { data, error: rpcError } = await supabase.rpc("get_public_profile", { p_username: username });
    if (rpcError) throw new Error(rpcError.message);
    if (!data) throw new Error("User not found.");
    const row = data as PublicProfile;
    setProfile(row);
    if (!row.hidden) {
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, title, body, created_at")
        .eq("author_id", row.id)
        .eq("source_type", "user_post")
        .order("created_at", { ascending: false })
        .limit(30);
      setPosts(((postRows ?? []) as PostRow[]));
    } else {
      setPosts([]);
    }
  }, [username]);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void initial();
  }, [initial]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Keep existing content on refresh failure.
    } finally {
      setRefreshing(false);
    }
  }

  async function onMessage() {
    if (!profile || chatBusy) return;
    setChatBusy(true);
    try {
      // Canonical conversation bootstrap; RLS + block guards enforced inside.
      const { data, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
        p_user_id: profile.id,
      });
      if (rpcError || !data) throw new Error(rpcError?.message ?? "Unable to start chat.");
      router.push(`/chat/${data as string}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start chat.");
    } finally {
      setChatBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading profile…" />
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen>
        <ErrorState message={error ?? "User not found."} onRetry={() => void initial()} />
      </Screen>
    );
  }

  if (profile.hidden) {
    return (
      <Screen>
        <Header title={`@${profile.username}`} />
        <Empty title="This profile is private" hint="The user chose not to share it publicly." />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: posts.length === 0 ? 1 : undefined }}
        ListHeaderComponent={
          <View>
            <Header title={`@${profile.username}`} />
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                <Avatar uri={profile.avatar_url} name={profile.full_name ?? profile.username} size={64} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle" weight="700">
                    {profile.full_name ?? profile.username}
                  </Txt>
                  <Txt color={palette.ink400}>@{profile.username}</Txt>
                  {profile.institution ? (
                    <Txt variant="caption" color={palette.ink500}>
                      {profile.institution}
                    </Txt>
                  ) : null}
                </View>
              </View>
              {profile.bio ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Txt color={palette.ink200}>{profile.bio}</Txt>
                </View>
              ) : null}
              {me && me.id !== profile.id ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button title={chatBusy ? "Opening…" : "Message"} onPress={() => void onMessage()} disabled={chatBusy} />
                </View>
              ) : null}
              {profile.skills.length > 0 ? (
                <View style={{ marginTop: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {profile.skills.slice(0, 8).map((s) => (
                    <View key={s} style={{ backgroundColor: palette.surfaceHover, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Txt variant="caption" color={palette.ink300}>
                        {s}
                      </Txt>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
            <Txt variant="subtitle" weight="600">
              Posts
            </Txt>
            <View style={{ height: spacing.sm }} />
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            {item.title ? <Txt weight="600">{item.title}</Txt> : null}
            {item.body ? <Txt color={palette.ink200}>{item.body}</Txt> : null}
          </Card>
        )}
        ListEmptyComponent={<Empty title="No public posts" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
      />
    </Screen>
  );
}
