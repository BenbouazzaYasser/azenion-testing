import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, Empty, ErrorState, Header, Loading, SafeImage, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { API_BASE_URL } from "../../lib/config";
import { palette, spacing } from "../../lib/theme";

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: string;
  difficulty: string | null;
  duration: string | null;
  thumbnail: string | null;
  created_at: string | null;
}

export function courseThumbnail(id: string): string {
  return `${API_BASE_URL}/api/academy/courses/${id}/file?view=thumbnail`;
}

export function courseFileUrl(id: string): string {
  return `${API_BASE_URL}/api/academy/courses/${id}/file`;
}

export default function Academy() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from("courses")
      .select("id, title, description, category, content_type, difficulty, duration, thumbnail, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);
    if (qErr) throw new Error(qErr.message);
    setCourses((data ?? []) as CourseRow[]);
  }, []);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load courses.");
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
        <Loading label="Loading academy…" />
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
        <Header title="Academy" />
      </View>
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, flexGrow: courses.length === 0 ? 1 : undefined }}
        ListEmptyComponent={<Empty title="No published courses" hint="Check back later." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.accent400} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/academy/${item.id}`)}>
            <Card>
              <SafeImage uri={courseThumbnail(item.id)} width="100%" height={160} topMargin={0} />
              <View style={{ height: spacing.sm }} />
              <Txt variant="caption" color={palette.accent400} weight="600">
                {(item.category ?? "").toUpperCase()} · {item.content_type === "pdf" ? "PDF" : "Interactive"}
              </Txt>
              <Txt variant="subtitle" weight="700">
                {item.title}
              </Txt>
              {item.description ? (
                <Txt color={palette.ink300} numberOfLines={2}>
                  {item.description}
                </Txt>
              ) : null}
              <View style={{ height: spacing.xs }} />
              <Txt variant="caption" color={palette.ink500}>
                {[item.difficulty, item.duration].filter(Boolean).join(" · ")}
              </Txt>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
