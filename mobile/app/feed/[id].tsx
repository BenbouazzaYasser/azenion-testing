import { useCallback, useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Avatar, Button, Empty, ErrorState, Input, Loading, Screen, Txt } from "../../components/ui";
import { PostCard, type FeedItem } from "../../components/post-card";
import { apiJson } from "../../lib/api";
import { getDirectFeedItem } from "../../lib/feed-direct";
import { addComment, getComments, type FeedComment } from "../../lib/feed";
import { resolvePeers } from "../../lib/peers";
import { useAuth } from "../../lib/auth";
import { timeAgo } from "../../lib/format";
import { palette, spacing } from "../../lib/theme";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Boundary first; direct-RLS fallback when it is unreachable.
    let found: FeedItem | null = null;
    try {
      found = (await apiJson<{ item: FeedItem }>(`/api/feed?scope=single&postId=${id}`)).item;
    } catch {
      found = await getDirectFeedItem(id);
    }
    if (!found) throw new Error("Post not found.");
    const postRes = { item: found };
    setItem(postRes.item);
    if (postRes.item.source_id) {
      const rows = await getComments(postRes.item.source_type, postRes.item.source_id);
      setComments(rows);
      const peers = await resolvePeers(
        rows.map((c) => c.user_id),
        user?.id ?? null,
      );
      const map = new Map<string, string>();
      for (const [uid, p] of peers) map.set(uid, p.full_name ?? `@${p.username}`);
      setNames(map);
    }
  }, [id, user?.id]);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load post.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void initial();
  }, [initial]);

  async function send() {
    if (!item?.source_id || sending || !draft.trim()) return;
    setSending(true);
    try {
      const row = await addComment(item.source_type, item.source_id, draft);
      setDraft("");
      setComments((prev) => [...prev, row]);
      setItem({ ...item, comment_count: item.comment_count + 1 });
      const peers = await resolvePeers([row.user_id], user?.id ?? null);
      const p = peers.get(row.user_id);
      if (p) setNames((prev) => new Map(prev).set(row.user_id, p.full_name ?? `@${p.username}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to post comment.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading post…" />
      </Screen>
    );
  }

  if (error && !item) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void initial()} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <Empty title="Post not found" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.md, flexGrow: comments.length === 0 ? 1 : undefined }}
          ListHeaderComponent={
            <View style={{ marginHorizontal: -spacing.md, paddingHorizontal: spacing.md }}>
              <PostCard item={item} onChanged={setItem} />
              <View style={{ height: spacing.sm }} />
              <Txt variant="subtitle" weight="600">
                Comments ({comments.length})
              </Txt>
              <View style={{ height: spacing.sm }} />
            </View>
          }
          renderItem={({ item: c }) => (
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
              <Avatar name={names.get(c.user_id) ?? "?"} size={32} />
              <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 12, padding: spacing.sm }}>
                <Txt weight="600" variant="caption">
                  {names.get(c.user_id) ?? "Someone"} · {timeAgo(c.created_at)}
                </Txt>
                <Txt color={palette.ink200}>{c.body}</Txt>
              </View>
            </View>
          )}
          ListEmptyComponent={<Empty title="No comments yet" hint="Be the first to reply." />}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Write a comment…" autoCapitalize="sentences" />
          </View>
          <Button title={sending ? "…" : "Post"} onPress={() => void send()} disabled={sending || !draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
