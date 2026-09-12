import { useCallback, useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Empty, ErrorState, Loading, SafeImage, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { palette, radius, spacing } from "../../lib/theme";
import { courseFileUrl, courseThumbnail, type CourseRow } from "./index";

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [labCount, setLabCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from("courses")
      .select("id, title, description, category, content_type, difficulty, duration, thumbnail, created_at")
      .eq("id", id)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!data) throw new Error("Course not found.");
    setCourse(data as CourseRow);
    const { count } = await supabase
      .from("course_labs")
      .select("lab_id", { count: "exact", head: true })
      .eq("course_id", id);
    setLabCount(count ?? 0);
  }, [id]);

  const initial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void initial();
  }, [initial]);

  async function openFile() {
    if (!course) return;
    // Published course bytes are served anonymously through the private-file
    // boundary (origin-controlled headers, no credentials needed).
    try {
      await Linking.openURL(courseFileUrl(course.id));
    } catch {
      setError("Unable to open course file.");
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading course…" />
      </Screen>
    );
  }

  if (error || !course) {
    return (
      <Screen>
        <ErrorState message={error ?? "Course not found."} onRetry={() => void initial()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}>
        <SafeImage uri={courseThumbnail(course.id)} width="100%" height={200} borderRadius={radius.lg} />
        <View style={{ height: spacing.md }} />
        <Txt variant="caption" color={palette.accent400} weight="600">
          {(course.category ?? "").toUpperCase()}
        </Txt>
        <Txt variant="title" weight="700">
          {course.title}
        </Txt>
        <Txt variant="caption" color={palette.ink500}>
          {[course.difficulty, course.duration, labCount > 0 ? `${labCount} labs` : null].filter(Boolean).join(" · ")}
        </Txt>
        {course.description ? (
          <Card>
            <Txt color={palette.ink200}>{course.description}</Txt>
          </Card>
        ) : (
          <Empty title="No description" />
        )}
        <View style={{ height: spacing.md }} />
        <Button title={course.content_type === "pdf" ? "Open PDF" : "Open course file"} onPress={() => void openFile()} />
      </ScrollView>
    </Screen>
  );
}
