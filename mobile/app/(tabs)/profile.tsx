import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Card, Empty, ErrorState, Header, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { palette, spacing } from "../../lib/theme";

interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  institution: string | null;
  avatar_url: string | null;
}

interface PostRow {
  id: string;
  title: string;
  body: string | null;
  created_at: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: row, error: pErr }, { data: postRows, error: qErr }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, bio, institution, avatar_url").eq("id", user.id).maybeSingle(),
      supabase
        .from("posts")
        .select("id, title, body, created_at")
        .eq("author_id", user.id)
        .eq("source_type", "user_post")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (qErr) throw new Error(qErr.message);
    setProfile((row ?? null) as ProfileRow | null);
    setPosts(((postRows ?? []) as PostRow[]));
  }, [user]);

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
        <ErrorState message={error ?? "Profile not found."} onRetry={() => void initial()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: posts.length === 0 ? 1 : undefined }}
        ListHeaderComponent={
          <View>
            <Header
              title="Profile"
              right={
                <Txt color={palette.accent400} onPress={() => router.push("/settings")}>
                  Settings
                </Txt>
              }
            />
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
            </Card>
            <Txt variant="subtitle" weight="600">
              Posts
            </Txt>
            <View style={{ height: spacing.sm }} />
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            {item.title ? (
              <Txt weight="600">{item.title}</Txt>
            ) : null}
            {item.body ? <Txt color={palette.ink200}>{item.body}</Txt> : null}
          </Card>
        )}
        ListEmptyComponent={<Empty title="No posts yet" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
      />
    </Screen>
  );
}
