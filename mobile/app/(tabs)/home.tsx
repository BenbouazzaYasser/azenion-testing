import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Empty, ErrorState, Header, Screen, Txt } from "../../components/ui";
import { PostCard, PostSkeleton, type FeedItem } from "../../components/post-card";
import { apiJson } from "../../lib/api";
import { getDirectFeedPage } from "../../lib/feed-direct";
import { palette, spacing } from "../../lib/theme";

interface FeedPage {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (next: number, replace: boolean) => {
    // Boundary first (full enrichment); direct-RLS fallback when the
    // backend boundary is unreachable — visibility stays DB-enforced.
    let data: FeedPage;
    try {
      data = await apiJson<FeedPage>(`/api/feed?scope=global&page=${next}&pageSize=${PAGE_SIZE}`);
    } catch {
      data = { ...(await getDirectFeedPage(next, PAGE_SIZE)), page: next, pageSize: PAGE_SIZE };
    }
    setItems((prev) => {
      if (replace) return data.items;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
    });
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
    setError(null);
    try {
      await loadPage(1, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
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

  function patchItem(next: FeedItem) {
    setItems((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={{ padding: spacing.md, paddingBottom: 0 }}>
          <Header title="Home" />
        </View>
        {[0, 1, 2].map((k) => (
          <View key={k} style={{ paddingHorizontal: spacing.md }}>
            <PostSkeleton />
          </View>
        ))}
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
        <Header
          title="Home"
          right={
            <Txt color={palette.accent400} weight="600" onPress={() => router.push("/academy")}>
              Learn
            </Txt>
          }
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <PostCard item={item} onChanged={patchItem} />
          </View>
        )}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xl }}
        ListEmptyComponent={<Empty title="No posts yet" hint="Pull down to refresh." />}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <PostSkeleton />
            </View>
          ) : null
        }
        onEndReached={() => void onEnd()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
      />
    </Screen>
  );
}
