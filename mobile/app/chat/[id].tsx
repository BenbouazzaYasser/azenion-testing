import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button, Empty, ErrorState, Input, Loading, Press, Screen, Txt } from "../../components/ui";
import { ActionIcon } from "../../components/icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { getAttachments, sendImage, signAttachment, type ChatAttachment } from "../../lib/chat-media";
import { tap } from "../../lib/haptics";
import { palette, radius, spacing } from "../../lib/theme";

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
  const [attachments, setAttachments] = useState<Map<string, ChatAttachment[]>>(new Map());
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerMenu, setComposerMenu] = useState(false);
  const seen = useRef(new Set<string>());
  const listRef = useRef<FlatList<Message>>(null);
  const stickRef = useRef(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const loadAttachments = useCallback(async () => {
    const rows = await getAttachments(id);
    const signable = rows.filter((a) => a.storage_path && (a.type === "image" || a.type === "file"));
    const urls = await Promise.all(signable.map((a) => signAttachment(a.id).catch(() => null)));
    const withUrls = new Map<string, ChatAttachment[]>();
    const urlById = new Map(signable.map((a, i) => [a.id, urls[i] ?? null]));
    for (const a of rows) {
      const list = withUrls.get(a.message_id) ?? [];
      list.push({ ...a, signedUrl: urlById.get(a.id) ?? null });
      withUrls.set(a.message_id, list);
    }
    setAttachments(withUrls);
  }, [id]);

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
    await loadAttachments();
  }, [id, loadAttachments]);

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
          void loadAttachments().catch(() => {});
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [id, load, loadAttachments]);

  useEffect(() => {
    if (!user || messages.length === 0) return;
    // Best-effort read receipt via the canonical RPC.
    (async () => {
      try {
        await supabase.rpc("mark_messages_received", { p_conversation_id: id });
        await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", user.id);
      } catch {
        // Best effort.
      }
    })();
  }, [id, user, messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    void tap("light");
    const optimistic: Message = { id: `local-${Date.now()}`, sender_id: user.id, content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    stickRef.current = true;
    setDraft("");
    try {
      const { data, error: iErr } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: user.id, content: text })
        .select("id, sender_id, content, created_at")
        .single();
      if (iErr || !data) throw new Error(iErr?.message ?? "Unable to send.");
      const row = data as Message;
      seen.current.add(row.id);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? row : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(e instanceof Error ? e.message : "Unable to send.");
    } finally {
      setSending(false);
    }
  }

  async function pickImage() {
    setComposerMenu(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library access was denied.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSending(true);
    try {
      const messageId = await sendImage({
        conversationId: id,
        uri: asset.uri,
        filename: asset.fileName ?? "image.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        fileSize: asset.fileSize ?? undefined,
      });
      seen.current.add(messageId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send image.");
    } finally {
      setSending(false);
    }
  }

  async function openFile(att: ChatAttachment) {
    const url = att.signedUrl ?? (await signAttachment(att.id).catch(() => null));
    if (!url) {
      setError("Unable to open file.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setError("Unable to open file.");
    }
  }

  function renderAttachment(att: ChatAttachment) {
    if (failedImages.has(att.id)) return null;
    const fail = () => setFailedImages((prev) => new Set(prev).add(att.id));
    if (att.type === "image" && att.signedUrl) {
      return <Image key={att.id} source={{ uri: att.signedUrl }} style={{ width: 200, height: 160, borderRadius: 10, marginTop: 6 }} resizeMode="cover" onError={fail} />;
    }
    if (att.type === "file") {
      return (
        <Pressable key={att.id} onPress={() => void openFile(att)} style={{ marginTop: 6, backgroundColor: palette.surfaceHover, borderRadius: radius.sm, padding: 8, flexDirection: "row", gap: 6, alignItems: "center" }}>
          <ActionIcon name="document-text-outline" size={16} color={palette.onAccent} />
          <Txt variant="caption" color={palette.onAccent}>
            {att.filename ?? "file"}
          </Txt>
        </Pressable>
      );
    }
    return null;
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
      <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingVertical: spacing.sm, flexGrow: messages.length === 0 ? 1 : undefined }}
          ListEmptyComponent={<Empty title="No messages yet" hint="Say hello." />}
          onContentSizeChange={() => {
            if (stickRef.current) listRef.current?.scrollToEnd({ animated: false });
          }}
          onScrollBeginDrag={() => {
            stickRef.current = false;
          }}
          onScrollToTop={() => {
            stickRef.current = false;
          }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            const atts = attachments.get(item.id) ?? [];
            return (
              <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: spacing.xs }}>
                <View
                  style={{
                    backgroundColor: mine ? palette.accent : palette.surfaceHover,
                    borderRadius: radius.lg,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    maxWidth: "80%",
                  }}
                >
                  {item.content ? <Txt color={mine ? palette.onAccent : palette.ink50}>{item.content}</Txt> : null}
                  {atts.map(renderAttachment)}
                </View>
              </View>
            );
          }}
        />
      </View>
      {error ? (
        <Txt color={palette.danger} variant="caption">
          {error}
        </Txt>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "center" }}>
        <Press label="Attach photo" onPress={() => setComposerMenu(true)}>
          <ActionIcon name="add" color={palette.accent400} size={24} />
        </Press>
        <View style={{ flex: 1 }}>
          <Input value={draft} onChangeText={setDraft} placeholder="Message…" autoCapitalize="sentences" />
        </View>
        <Button title={sending ? "…" : "Send"} onPress={() => void send()} disabled={sending || !draft.trim()} />
      </View>
      </KeyboardAvoidingView>
      <Modal visible={composerMenu} transparent animationType="fade" onRequestClose={() => setComposerMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: palette.scrim, justifyContent: "flex-end" }} onPress={() => setComposerMenu(false)}>
          <View style={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }}>
            <Button title="Send photo" variant="secondary" onPress={() => void pickImage()} />
            <View style={{ height: spacing.sm }} />
            <Button title="Cancel" variant="secondary" onPress={() => setComposerMenu(false)} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
