import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Empty, ErrorState, Input, Loading, Screen, Txt } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { palette, spacing } from "../../lib/theme";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
}

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(new Set<string>());

  const load = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (qErr) throw new Error(qErr.message);
    const rows = (data ?? []) as Message[];
    seen.current = new Set(rows.map((m) => m.id));
    setMessages(rows);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unable to load messages.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const channel = supabase
      .channel(`conv-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const row = payload.new as Message;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);
          setMessages((prev) => [...prev, row]);
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [id, load]);

  useEffect(() => {
    if (!user || messages.length === 0) return;
    // Best-effort read receipt via the canonical RPC.
    void supabase.rpc("mark_messages_received", { p_conversation_id: id }).then(() =>
      supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", user.id),
    );
  }, [id, user, messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      const { error: iErr } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.id,
        content: text,
      });
      if (iErr) throw new Error(iErr.message);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Loading label="Loading conversation…" />
      </Screen>
    );
  }

  if (error && messages.length === 0) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); void load().then(() => setLoading(false)); }} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, flexGrow: messages.length === 0 ? 1 : undefined }}
          ListEmptyComponent={<Empty title="No messages yet" hint="Say hello." />}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: spacing.xs }}>
                <View
                  style={{
                    backgroundColor: mine ? palette.accent : palette.surfaceHover,
                    borderRadius: 14,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    maxWidth: "80%",
                  }}
                >
                  <Txt color={mine ? "#FFFFFF" : palette.ink50}>{item.content}</Txt>
                </View>
              </View>
            );
          }}
        />
        {error ? (
          <Txt color={palette.danger} variant="caption">
            {error}
          </Txt>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Message…" autoCapitalize="words" />
          </View>
          <Button title={sending ? "…" : "Send"} onPress={() => void send()} disabled={sending || !draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
