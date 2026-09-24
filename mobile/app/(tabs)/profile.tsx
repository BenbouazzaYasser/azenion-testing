import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Card, Empty, ErrorState, Header, Loading, Press, Screen, Txt } from "../../components/ui";
import { ActionIcon } from "../../components/icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { timeAgo } from "../../lib/format";
import { palette, radius, spacing } from "../../lib/theme";

interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  institution: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface PostRow {
  id: string;
  title: string;
  body: string | null;
  created_at: string | null;
}

type Segment = "posts" | "saved";

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [segment, setSegment] = useState<Segment>("posts");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cache, setCache] = useState<{ mine: PostRow[]; saved: PostRow[] }>({ mine: [], saved: [] });

  const load = useCallback(async () => {
    if (!user) return;
    const { data: row, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, institution, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    setProfile((row ?? null) as ProfileRow | null);

    const [mine, saved] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, body, created_at")
        .eq("author_id", user.id)
        .eq("source_type", "user_post")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("saved_posts")
        .select("post_id, posts(id, title, body, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (mine.error) throw new Error(mine.error.message);
    if (saved.error) throw new Error(saved.error.message);
    const savedPosts = ((saved.data ?? []) as Array<{ posts: PostRow | PostRow[] | null }>)
      .map((r) => (Array.isArray(r.posts) ? r.posts[0] : r.posts))
      .filter((p): p is PostRow => Boolean(p));
    // Cache both lists so segment switching is instant; refresh refetches.
    setCache({ mine: (mine.data ?? []) as PostRow[], saved: savedPosts });
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

  const shown = segment === "saved" ? cache.saved : cache.mine;

  return (
    <Screen padded={false}>
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: shown.length === 0 ? 1 : undefined }}
        ListHeaderComponent={
          <View>
            <Header
              title="Profile"
              right={
                <Press label="Open settings" onPress={() => router.push("/settings")}>
                  <ActionIcon name="settings-outline" color={palette.accent400} size={18} />
                  <Txt color={palette.accent400} weight="600">
                    Settings
                  </Txt>
                </Press>
              }
            />
            <View style={{ backgroundColor: palette.accent, borderWidth: 1, borderColor: palette.secondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                <Avatar uri={profile.avatar_url} name={profile.full_name ?? profile.username} size={72} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle" weight="700" color={palette.onAccent}>
                    {profile.full_name ?? profile.username}
                  </Txt>
                  <Txt color={palette.onAccentMuted}>@{profile.username}</Txt>
                  {profile.institution ? (
                    <Txt variant="caption" color={palette.onAccentMuted}>
                      {profile.institution}
                    </Txt>
                  ) : null}
                </View>
              </View>
              {profile.bio ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Txt color={palette.onAccent}>{profile.bio}</Txt>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
              {(["posts", "saved"] as Segment[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSegment(s)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    alignItems: "center",
                    backgroundColor: segment === s ? palette.accent : palette.surface,
                    borderWidth: 1,
                    borderColor: segment === s ? palette.accent : palette.borderStrong,
                  }}
                >
                  <Txt weight="600" color={segment === s ? palette.onAccent : palette.ink300}>
                    {s === "posts" ? `Posts · ${cache.mine.length}` : `Saved · ${cache.saved.length}`}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            {item.title ? <Txt weight="600">{item.title}</Txt> : null}
            {item.body ? <Txt color={palette.ink200}>{item.body}</Txt> : null}
            {item.created_at ? (
              <Txt variant="caption" color={palette.ink500}>
                {timeAgo(item.created_at)}
              </Txt>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <Empty title={segment === "saved" ? "Nothing saved yet" : "No posts yet"} hint={segment === "saved" ? "Save posts from the feed overflow menu." : undefined} />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
      />
    </Screen>
  );
}
