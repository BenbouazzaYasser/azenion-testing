import { useState } from "react";
import { Image, Modal, Pressable, Share, View } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Avatar, Button, Card, Txt } from "./ui";
import { ActionIcon } from "./icons";
import { palette, radius, spacing } from "../lib/theme";
import { timeAgo } from "../lib/format";
import { setLiked, setSaved } from "../lib/feed";
import { tap } from "../lib/haptics";

export interface FeedItem {
  id: string;
  source_type: string;
  source_id: string | null;
  title: string;
  body: string | null;
  images: string[];
  created_at: string | null;
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
  saved_by_user: boolean;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  entity_name: string | null;
  branch_name: string | null;
}

export function postLink(item: FeedItem): string {
  return `azenion://feed/post/${item.id}`;
}

export function PostCard({ item, onChanged }: { item: FeedItem; onChanged: (next: FeedItem) => void }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (busy || !item.source_id) return;
    const next = !item.user_has_liked;
    void tap("light");
    onChanged({
      ...item,
      user_has_liked: next,
      like_count: Math.max(0, item.like_count + (next ? 1 : -1)),
    });
    try {
      await setLiked(item.source_type, item.source_id, next);
    } catch {
      // Revert optimistic update on failure.
      onChanged(item);
    }
  }

  async function toggleSave() {
    if (busy) return;
    setBusy(true);
    const next = !item.saved_by_user;
    try {
      await setSaved(item.id, next);
      onChanged({ ...item, saved_by_user: next });
    } catch {
      // Keep previous state on failure.
    } finally {
      setBusy(false);
      setMenu(false);
    }
  }

  async function share() {
    setMenu(false);
    try {
      await Share.share({ message: `${item.title}\n${postLink(item)}` });
    } catch {
      // Dismissed or unavailable — nothing to do.
    }
  }

  async function copyLink() {
    setMenu(false);
    try {
      await Clipboard.setStringAsync(postLink(item));
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  }

  const subtitle = item.entity_name ?? item.branch_name ?? "";
  const failedImage = useState(false);

  return (
    <Card>
      <Pressable onPress={() => router.push(`/feed/${item.id}`)}>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Avatar uri={item.author_avatar} name={item.author_name ?? item.author_username} />
          <View style={{ flex: 1 }}>
            <Txt weight="600" numberOfLines={1}>
              {item.author_name ?? item.author_username ?? "Unknown"}
            </Txt>
            <Txt variant="caption" color={palette.ink400} numberOfLines={1}>
              {[item.author_username ? `@${item.author_username}` : null, subtitle, timeAgo(item.created_at)]
                .filter(Boolean)
                .join(" · ")}
            </Txt>
          </View>
          <Pressable hitSlop={12} onPress={() => setMenu(true)}>
            <ActionIcon name="ellipsis-horizontal" />
          </Pressable>
        </View>
        {item.title ? (
          <Txt weight="600" variant="subtitle">
            {item.title}
          </Txt>
        ) : null}
        {item.body ? (
          <Txt color={palette.ink200} numberOfLines={6}>
            {item.body}
          </Txt>
        ) : null}
      </Pressable>
      {item.images[0] && !failedImage[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          style={{ width: "100%", height: 220, borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: palette.surfaceHover }}
          resizeMode="cover"
          onError={() => failedImage[1](true)}
        />
      ) : null}
      <View style={{ flexDirection: "row", marginTop: spacing.sm, gap: spacing.lg }}>
        <Pressable hitSlop={10} onPress={() => void toggleLike()} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <ActionIcon name={item.user_has_liked ? "heart" : "heart-outline"} color={item.user_has_liked ? palette.danger : palette.ink400} />
          <Txt variant="caption" color={palette.ink400}>
            {item.like_count}
          </Txt>
        </Pressable>
        <Pressable hitSlop={10} onPress={() => router.push(`/feed/${item.id}`)} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <ActionIcon name="chatbubble-outline" />
          <Txt variant="caption" color={palette.ink400}>
            {item.comment_count}
          </Txt>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={10} onPress={() => void share()}>
          <ActionIcon name="share-outline" />
        </Pressable>
      </View>
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={() => setMenu(false)}>
          <View style={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }}>
            <Button title={item.saved_by_user ? "Unsave post" : "Save post"} variant="secondary" onPress={() => void toggleSave()} />
            <View style={{ height: spacing.sm }} />
            <Button title="Share…" variant="secondary" onPress={() => void share()} />
            <View style={{ height: spacing.sm }} />
            <Button title="Copy link" variant="secondary" onPress={() => void copyLink()} />
            <View style={{ height: spacing.sm }} />
            <Button title="Close" variant="secondary" onPress={() => setMenu(false)} />
          </View>
        </Pressable>
      </Modal>
    </Card>
  );
}

export function PostSkeleton() {
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.surfaceHover }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 14, borderRadius: 7, backgroundColor: palette.surfaceHover, width: "50%" }} />
          <View style={{ height: 12, borderRadius: 6, backgroundColor: palette.surfaceHover, width: "35%" }} />
        </View>
      </View>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: palette.surfaceHover, marginBottom: 6 }} />
      <View style={{ height: 14, borderRadius: 7, backgroundColor: palette.surfaceHover, width: "80%" }} />
      <View style={{ height: 180, borderRadius: radius.md, backgroundColor: palette.surfaceHover, marginTop: spacing.sm }} />
    </Card>
  );
}
