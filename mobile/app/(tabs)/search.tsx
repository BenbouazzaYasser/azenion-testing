import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Card, Empty, Header, Input, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { palette, spacing } from "../../lib/theme";

interface SearchUser {
  id: string;
  full_name: string | null;
  username: string;
  institution: string | null;
  avatar_url: string | null;
}

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  async function run(q: string) {
    const stamp = ++latest.current;
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("search_users", { p_query: q });
      if (stamp !== latest.current) return;
      if (rpcError) throw new Error(rpcError.message);
      setResults(((data ?? []) as SearchUser[]).slice(0, 20));
      setSearched(true);
    } catch (e) {
      if (stamp !== latest.current) return;
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      if (stamp === latest.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setBusy(false);
      setError(null);
      return;
    }
    timer.current = setTimeout(() => void run(q), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Header title="Search" />
        <Input value={query} onChangeText={setQuery} placeholder="Search people…" />
        {error ? (
          <Txt color={palette.danger}>{error}</Txt>
        ) : null}
        <View style={{ height: spacing.sm }} />
      </View>
      {busy && results.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0, flexGrow: 1 }}
          ListEmptyComponent={
            searched ? <Empty title="No results" hint="Try a different name." /> : <Empty title="Find people" hint="Search by name or username." />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/user/${item.username}`)}>
              <Card>
                <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                  <Avatar uri={item.avatar_url} name={item.full_name ?? item.username} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="600">{item.full_name ?? item.username}</Txt>
                    <Txt variant="caption" color={palette.ink400}>
                      @{item.username}
                      {item.institution ? ` · ${item.institution}` : ""}
                    </Txt>
                  </View>
                  <Txt color={palette.accent400} weight="600">
                    ›
                  </Txt>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
