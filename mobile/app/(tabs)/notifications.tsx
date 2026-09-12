import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Empty, ErrorState, Header, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { resolvePeers } from "../../lib/peers";
import { palette, spacing } from "../../lib/theme";

interface NotificationRow {
  id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  read: boolean;
  created_at: string | null;
}

const FEED_POST_TYPES = new Set(["liked_your_update", "commented_on_your_update", "replied_to_your_comment", "liked_your_comment", "mentioned_you"]);

function labelFor(type: string): string {
  switch (type) {
    case "liked_your_update":
      return "liked your update";
    case "commented_on_your_update":
      return "commented on your update";
    case "replied_to_your_comment":
      return "replied to your comment";
    case "liked_your_comment":
      return "liked your comment";
    case "mentioned_you":
      return "mentioned you";
    case "team_update":
      return "posted a team update";
    case "project_update":
      return "posted a project update";
    case "branch_announcement":
      return "posted a branch announcement";
    default:
      return "sent you a notification";
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [peerNames, setPeerNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: qErr } = await supabase
      .from("notifications")
      .select("id, type, actor_id, target_type, target_id, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (qErr) throw new Error(qErr.message);
    const list = (data ?? []) as NotificationRow[];
    setRows(list);
    const actorIds = [...new Set(list.map((n) => n.actor_id).filter((a): a is string => Boolean(a)))];
    const peers = await resolvePeers(actorIds);
    const names = new Map<string, string>();
    for (const [id, p] of peers) names.set(id, p.full_name ?? `@${p.username}`);
    setPeerNames(names);
  }, [user]);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void initial();
  }, [initial]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  async function open(n: NotificationRow) {
    if (!n.read) {
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, read: true } : r)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id).eq("user_id", user?.id);
    }
    // Deep destinations mirror the web resolver for the cases with a stable
    // mobile route today; everything else lands back on the list, read.
    if (n.target_type === "chat" || n.target_type === "conversation" || n.target_type === "message") {
      if (n.target_id) router.push(`/chat/${n.target_id}`);
    } else if (n.type && FEED_POST_TYPES.has(n.type)) {
      router.push("/(tabs)/home");
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Keep existing list on refresh failure.
    } finally {
      setRefreshing(false);
    }
  }

  const unread = rows.filter((r) => !r.read).length;

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading notifications…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void initial()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Header title={unread > 0 ? `Alerts (${unread})` : "Alerts"} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, flexGrow: rows.length === 0 ? 1 : undefined }}
        ListEmptyComponent={<Empty title="All caught up" hint="New activity will appear here." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => void open(item)}>
            <View style={{ flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm, alignItems: "center", opacity: item.read ? 0.65 : 1 }}>
              <Avatar name={item.actor_id ? (peerNames.get(item.actor_id) ?? "?") : "A"} />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={2}>
                  <Txt weight="600">{item.actor_id ? (peerNames.get(item.actor_id) ?? "Someone") : "Azenion"}</Txt>
                  <Txt color={palette.ink300}> {labelFor(item.type)}</Txt>
                </Txt>
                {item.created_at ? (
                  <Txt variant="caption" color={palette.ink500}>
                    {new Date(item.created_at).toLocaleString()}
                  </Txt>
                ) : null}
              </View>
              {!item.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent400 }} /> : null}
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
