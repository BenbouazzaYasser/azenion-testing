import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Empty, ErrorState, Header, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { resolvePeers } from "../../lib/peers";
import { timeAgo } from "../../lib/format";
import { palette, spacing } from "../../lib/theme";

interface ConversationItem {
  id: string;
  updated_at: string | null;
  otherId: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
  peerName: string;
  peerAvatar: string | null;
}

export default function ChatList() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: memberships, error: mErr } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .is("deleted_at", null);
    if (mErr) throw new Error(mErr.message);
    const convIds = (memberships ?? []).map((m: { conversation_id: string }) => m.conversation_id);
    if (convIds.length === 0) {
      setItems([]);
      return;
    }
    const [{ data: conversations }, { data: allMembers }, { data: lastMessages }, { data: unreadRows }] =
      await Promise.all([
        supabase.from("conversations").select("id, updated_at").in("id", convIds).order("updated_at", { ascending: false }),
        supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds),
        supabase.from("messages").select("conversation_id, content, created_at, sender_id").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(200),
        supabase.rpc("get_unread_counts", { p_user_id: user.id }),
      ]);
    const membersByConv = new Map<string, string[]>();
    for (const m of (allMembers ?? []) as Array<{ conversation_id: string; user_id: string }>) {
      const list = membersByConv.get(m.conversation_id) ?? [];
      list.push(m.user_id);
      membersByConv.set(m.conversation_id, list);
    }
    const lastByConv = new Map<string, { content: string; created_at: string | null }>();
    for (const m of (lastMessages ?? []) as Array<{ conversation_id: string; content: string; created_at: string | null }>) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    }
    const unreadByConv = new Map<string, number>();
    for (const r of (unreadRows ?? []) as Array<{ conversation_id: string; unread_count: number }>) {
      unreadByConv.set(r.conversation_id, Number(r.unread_count));
    }
    const otherIds = [...new Set([...membersByConv.values()].flat().filter((id) => id !== user.id))];
    const peers = await resolvePeers(otherIds, user.id);
    setItems(
      ((conversations ?? []) as Array<{ id: string; updated_at: string | null }>).map((c) => {
        const otherId = (membersByConv.get(c.id) ?? []).find((id) => id !== user.id) ?? null;
        const peer = otherId ? peers.get(otherId) : undefined;
        const last = lastByConv.get(c.id);
        return {
          id: c.id,
          updated_at: c.updated_at,
          otherId,
          lastMessage: last?.content ?? null,
          lastAt: last?.created_at ?? c.updated_at,
          unread: unreadByConv.get(c.id) ?? 0,
          peerName: peer ? (peer.full_name ?? `@${peer.username}`) : otherId ? `…${otherId.slice(0, 8)}` : "Conversation",
          peerAvatar: peer?.avatar_url ?? null,
        };
      }),
    );
  }, [user]);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load conversations.");
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
      // Keep existing list on refresh failure.
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading chats…" />
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
        <Header title="Chat" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, flexGrow: items.length === 0 ? 1 : undefined }}
        ListEmptyComponent={<Empty title="No conversations" hint="Start one from someone's profile on web for now." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/chat/${item.id}`)}>
            <View style={{ flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm, alignItems: "center" }}>
              <Avatar uri={item.peerAvatar} name={item.peerName} size={48} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt weight="600">{item.peerName}</Txt>
                  <Txt variant="caption" color={item.unread > 0 ? palette.accent400 : palette.ink500} weight={item.unread > 0 ? "700" : "400"}>
                    {[timeAgo(item.lastAt), item.unread > 0 ? `${item.unread} new` : null].filter(Boolean).join(" · ")}
                  </Txt>
                </View>
                {item.lastMessage ? (
                  <Txt variant="caption" color={palette.ink400} numberOfLines={1}>
                    {item.lastMessage}
                  </Txt>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
