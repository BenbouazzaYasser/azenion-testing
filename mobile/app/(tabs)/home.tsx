import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, RefreshControl, View } from "react-native";
import { Avatar, Card, Empty, ErrorState, Header, Loading, Screen, Txt } from "../../components/ui";
import { apiJson } from "../../lib/api";
import { palette, spacing } from "../../lib/theme";

interface FeedItem {
  id: string;
  title: string;
  body: string | null;
  images: string[];
  created_at: string | null;
  like_count: number;
  comment_count: number;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  entity_name: string | null;
  branch_name: string | null;
}

interface FeedPage {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

function PostCard({ item }: { item: FeedItem }) {
  const subtitle = item.entity_name ?? item.branch_name ?? item.author_username ?? "";
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
        <Avatar uri={item.author_avatar} name={item.author_name ?? item.author_username} />
        <View style={{ flex: 1 }}>
          <Txt weight="600">{item.author_name ?? item.author_username ?? "Unknown"}</Txt>
          {subtitle ? (
            <Txt variant="caption" color={palette.ink400}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
      </View>
      {item.title ? (
        <Txt weight="600" variant="subtitle">
          {item.title}
        </Txt>
      ) : null}
      {item.body ? <Txt color={palette.ink200}>{item.body}</Txt> : null}
      {item.images[0] ? (
        <Image source={{ uri: item.images[0] }} style={{ width: "100%", height: 200, borderRadius: 12, marginTop: spacing.sm }} resizeMode="cover" />
      ) : null}
      <View style={{ height: spacing.sm }} />
      <Txt variant="caption" color={palette.ink500}>
        {item.like_count} likes · {item.comment_count} comments
      </Txt>
    </Card>
  );
}

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (next: number, replace: boolean) => {
    const data = await apiJson<FeedPage>(`/api/feed?scope=global&page=${next}&pageSize=${PAGE_SIZE}`);
    setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
    setHasMore(data.items.length === PAGE_SIZE);
    setPage(next);
  }, []);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadPage(1, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load feed.");
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    void initial();
  }, [initial]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadPage(1, true);
    } catch {
      // Keep existing items on refresh failure.
    } finally {
      setRefreshing(false);
    }
  }

  async function onEnd() {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1, false);
    } catch {
      // Next scroll will retry.
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading feed…" />
      </Screen>
    );
  }

  if (error && items.length === 0) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void initial()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Header title="Home" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <PostCard item={item} />
          </View>
        )}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xl }}
        ListEmptyComponent={<Empty title="No posts yet" hint="Pull down to refresh." />}
        ListFooterComponent={loadingMore ? <Loading /> : null}
        onEndReached={() => void onEnd()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
      />
    </Screen>
  );
}
