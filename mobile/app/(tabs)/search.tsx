import { useState } from "react";
import { FlatList, View } from "react-native";
import { Avatar, Button, Card, Empty, Header, Input, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { palette, spacing } from "../../lib/theme";

interface SearchUser {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Canonical user search RPC (user-JWT; block-aware, respects
      // search_visibility). Falls back to a safe empty list on failure.
      const { data, error: rpcError } = await supabase.rpc("search_users", { p_query: q });
      if (rpcError) throw new Error(rpcError.message);
      setResults(((data ?? []) as SearchUser[]).slice(0, 20));
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Header title="Search" />
        <Input value={query} onChangeText={setQuery} placeholder="Search people…" />
        <Button title={busy ? "Searching…" : "Search"} onPress={() => void onSearch()} disabled={busy || !query.trim()} />
        {error ? (
          <View style={{ marginTop: spacing.sm }}>
            <Txt color={palette.danger}>{error}</Txt>
          </View>
        ) : null}
        <View style={{ height: spacing.sm }} />
      </View>
      {busy ? (
        <Loading />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0, flexGrow: 1 }}
          ListEmptyComponent={searched ? <Empty title="No results" /> : <Empty title="Find people" hint="Search by name or username." />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                <Avatar uri={item.avatar_url} name={item.full_name ?? item.username} />
                <View>
                  <Txt weight="600">{item.full_name ?? item.username}</Txt>
                  <Txt variant="caption" color={palette.ink400}>
                    @{item.username}
                  </Txt>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
