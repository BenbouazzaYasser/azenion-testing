"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { ChannelMessageWithSender } from "@/data/servers";

export interface ChannelCursor {
  createdAt: string;
  id: string;
}

export type DeliveryState = "sent" | "pending" | "failed";

export type GatewayMessage = ChannelMessageWithSender & {
  delivery: DeliveryState;
  error?: string | null;
};

export interface ChannelCache {
  messages: GatewayMessage[];
  cursor: ChannelCursor | null;
  hasMore: boolean;
  loaded: boolean;
}

export type GatewayStatus = "connecting" | "connected" | "error" | "closed";

export interface TypingUser {
  user_id: string;
  username?: string | null;
}

interface GatewayStore {
  channels: Map<string, ChannelCache>;
  listeners: Set<() => void>;
  channel: RealtimeChannel | null;
  client: ReturnType<typeof createClient> | null;
  userId: string | null;
  serverId: string | null;
  status: GatewayStatus;
  typing: Map<string, Map<string, TypingUser>>;
  presence: Map<string, Set<string>>;
  topology: Map<string, Record<string, unknown>>;
  profiles: Map<string, ChannelMessageWithSender["sender"]>;
  profileRequests: Map<string, Promise<void>>;
}

const DB_NAME = "azenion-server-gateway";
const DB_VERSION = 1;
const STORE_NAME = "channel-cache";
const PAGE_SIZE = 50;

function emptyCache(): ChannelCache {
  return { messages: [], cursor: null, hasMore: false, loaded: false };
}

function localId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `local:${crypto.randomUUID()}`;
  return `local:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function compareMessages(a: GatewayMessage, b: GatewayMessage): number {
  const at = a.created_at ?? "";
  const bt = b.created_at ?? "";
  return at.localeCompare(bt) || a.id.localeCompare(b.id);
}

function profileFromRow(row: Record<string, unknown>): NonNullable<ChannelMessageWithSender["sender"]> {
  return {
    id: String(row.id),
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
    username: typeof row.username === "string" ? row.username : "member",
  };
}

let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return databasePromise;
}

async function readPersisted(key: string): Promise<ChannelCache | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const value = request.result as ChannelCache | undefined;
      resolve(value ? { ...emptyCache(), ...value, loaded: true } : null);
    };
    request.onerror = () => resolve(null);
  });
}

async function writePersisted(key: string, cache: ChannelCache): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(cache, key);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

class ServerGateway {
  private readonly store: GatewayStore = {
    channels: new Map(),
    listeners: new Set(),
    channel: null,
    client: null,
    userId: null,
    serverId: null,
    status: "closed",
    typing: new Map(),
    presence: new Map(),
    topology: new Map(),
    profiles: new Map(),
    profileRequests: new Map(),
  };

  subscribe = (listener: () => void): (() => void) => {
    this.store.listeners.add(listener);
    return () => this.store.listeners.delete(listener);
  };

  getStatus = (): GatewayStatus => this.store.status;

  getChannel = (channelId: string): ChannelCache => this.store.channels.get(channelId) ?? emptyCache();

  getTyping = (channelId: string): TypingUser[] => {
    return [...(this.store.typing.get(channelId)?.values() ?? [])];
  };

  getPresence = (serverId: string): string[] => [...(this.store.presence.get(serverId) ?? [])];

  getTopology = (table: string, id: string): Record<string, unknown> | null =>
    this.store.topology.get(`${table}:${id}`) ?? null;

  getProfile = (userId: string): GatewayMessage["sender"] =>
    this.store.profiles.get(userId) ?? null;

  private emit(): void {
    for (const listener of this.store.listeners) listener();
  }

  private cacheKey(channelId: string): string {
    return `${this.store.userId ?? "anonymous"}:${channelId}`;
  }

  private updateChannel(channelId: string, update: (current: ChannelCache) => ChannelCache): void {
    const current = this.getChannel(channelId);
    const next = update(current);
    this.store.channels.set(channelId, next);
    void writePersisted(this.cacheKey(channelId), next);
    this.emit();
  }

  seedChannel = (
    channelId: string,
    initialMessages: ChannelMessageWithSender[],
    hasMore: boolean,
    cursor: ChannelCursor | null,
  ): void => {
    const incoming = initialMessages.map((message) => ({ ...message, delivery: "sent" as const }));
    for (const message of incoming) {
      if (message.sender) this.store.profiles.set(message.sender.id, message.sender);
    }
    const current = this.getChannel(channelId);
    if (current.loaded && current.messages.length > 0) {
      this.updateChannel(channelId, (value) => {
        const byId = new Map(value.messages.map((message) => [message.id, message]));
        for (const message of incoming) byId.set(message.id, message);
        return { ...value, messages: [...byId.values()].sort(compareMessages) };
      });
      return;
    }
    this.updateChannel(channelId, () => ({
      messages: incoming,
      cursor,
      hasMore,
      loaded: true,
    }));
  };

  hydrateChannel = async (
    channelId: string,
    initialMessages: ChannelMessageWithSender[],
    hasMore: boolean,
    cursor: ChannelCursor | null,
  ): Promise<void> => {
    // Seed immediately so the channel renders without waiting for IndexedDB.
    this.seedChannel(channelId, initialMessages, hasMore, cursor);
    // Background merge: if IndexedDB has a deeper/stale cache, replace it.
    const persisted = await readPersisted(this.cacheKey(channelId));
    if (persisted && persisted.messages.length > 0) {
      this.updateChannel(channelId, (current) => {
        const byId = new Map(persisted.messages.map((message) => [message.id, message]));
        for (const message of initialMessages) {
          byId.set(message.id, { ...message, delivery: "sent" });
        }
        return {
          ...current,
          messages: [...byId.values()].sort(compareMessages),
          hasMore: persisted.hasMore || hasMore,
          cursor: current.cursor ?? persisted.cursor ?? cursor,
          loaded: true,
        };
      });
    }
  };

  private getClient(): ReturnType<typeof createClient> {
    if (!this.store.client) this.store.client = createClient();
    return this.store.client;
  }

  connect = (userId: string, serverId?: string): void => {
    if (this.store.userId === userId && this.store.channel) {
      if (serverId && this.store.serverId !== serverId) {
        this.store.serverId = serverId;
        void this.store.channel.track({ user_id: userId, server_id: serverId, online_at: new Date().toISOString() });
      }
      return;
    }
    if (this.store.userId && this.store.userId !== userId) {
      this.store.channels.clear();
      this.store.typing.clear();
      this.store.presence.clear();
      this.store.topology.clear();
      this.store.profiles.clear();
      this.store.profileRequests.clear();
    }
    if (this.store.channel) {
      void this.getClient().removeChannel(this.store.channel);
      this.store.channel = null;
    }
    this.store.userId = userId;
    this.store.serverId = serverId ?? null;
    this.store.status = "connecting";
    const client = this.getClient();
    const channel = client
      .channel("azenion-server-gateway", { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.receiveMessage(payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "channel_messages" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.receiveMessage(payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "channel_messages" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const old = payload.old as Record<string, unknown>;
          if (typeof old.id === "string") this.removeMessage(old.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servers" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
          this.receiveTopology("servers", payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
          this.receiveTopology("channels", payload),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
          this.receiveTopology("server_members", payload),
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        this.receiveTyping(payload as Record<string, unknown>);
      })
      .on("presence", { event: "sync" }, () => {
        this.receivePresence(channel);
      })
      .subscribe((status) => {
        this.store.status = status === "SUBSCRIBED"
          ? "connected"
          : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
            ? "error"
            : status === "CLOSED"
              ? "closed"
              : "connecting";
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: userId, server_id: this.store.serverId, online_at: new Date().toISOString() });
        }
        this.emit();
      });
    this.store.channel = channel;
    this.emit();
  };

  private receiveTopology(
    table: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ): void {
    const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : typeof row.server_id === "string" ? `${row.server_id}:${String(row.user_id)}` : null;
    if (!id) return;
    const key = `${table}:${id}`;
    if (payload.eventType === "DELETE") this.store.topology.delete(key);
    else this.store.topology.set(key, row);
    this.emit();
  }

  private receiveMessage(row: Record<string, unknown>): void {
    const id = typeof row.id === "string" ? row.id : null;
    const channelId = typeof row.channel_id === "string" ? row.channel_id : null;
    if (!id || !channelId) return;
    const senderId = typeof row.sender_id === "string" ? row.sender_id : null;
    if (!senderId) return;
    const message: GatewayMessage = {
      id,
      channel_id: channelId,
      sender_id: senderId,
      content: typeof row.content === "string" ? row.content : "",
      image_url: typeof row.image_url === "string" ? row.image_url : null,
      created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      edited_at: typeof row.edited_at === "string" ? row.edited_at : null,
      sender: this.store.profiles.get(senderId) ?? null,
      delivery: "sent",
    };
    this.mergeIncoming(message);
    if (!this.store.profiles.has(senderId)) void this.loadProfile(senderId);
  }

  async loadProfile(userId: string): Promise<void> {
    if (this.store.profileRequests.has(userId)) return this.store.profileRequests.get(userId);
    const request = (async () => {
      try {
        const { data } = await this.getClient()
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .eq("id", userId)
          .single();
        if (!data) return;
        const profile = profileFromRow(data as Record<string, unknown>);
        this.store.profiles.set(userId, profile);
        for (const [channelId, cache] of this.store.channels) {
          if (cache.messages.some((message) => message.sender_id === userId)) {
            this.updateChannel(channelId, (value) => ({
              ...value,
              messages: value.messages.map((message) =>
                message.sender_id === userId ? { ...message, sender: profile } : message,
              ),
            }));
          }
        }
      } catch {
        // A missing public profile should not interrupt message delivery.
      } finally {
        this.store.profileRequests.delete(userId);
      }
    })();
    this.store.profileRequests.set(userId, request);
    return request;
  }

  mergeIncoming = (message: GatewayMessage): void => {
    this.updateChannel(message.channel_id, (current) => {
      const existing = current.messages.findIndex((item) => item.id === message.id);
      if (existing >= 0) {
        const messages = [...current.messages];
        messages[existing] = { ...messages[existing], ...message, delivery: "sent" };
        return { ...current, messages: messages.sort(compareMessages) };
      }
      return { ...current, messages: [...current.messages, message].sort(compareMessages), loaded: true };
    });
  };

  updateMessage = (messageId: string, patch: Partial<Pick<GatewayMessage, "content" | "edited_at">>): void => {
    for (const [channelId, cache] of this.store.channels) {
      if (cache.messages.some((message) => message.id === messageId)) {
        this.updateChannel(channelId, (value) => ({
          ...value,
          messages: value.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message,
          ),
        }));
      }
    }
  };

  removeMessage = (messageId: string): void => {
    for (const [channelId, cache] of this.store.channels) {
      if (cache.messages.some((message) => message.id === messageId)) {
        this.updateChannel(channelId, (value) => ({
          ...value,
          messages: value.messages.filter((message) => message.id !== messageId),
        }));
      }
    }
  };

  appendOptimistic = (channelId: string, userId: string, content: string): string => {
    const id = localId();
    const message: GatewayMessage = {
      id,
      channel_id: channelId,
      sender_id: userId,
      content,
      image_url: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      sender: null,
      delivery: "pending",
    };
    this.updateChannel(channelId, (current) => ({
      ...current,
      messages: [...current.messages, message].sort(compareMessages),
      loaded: true,
    }));
    return id;
  };

  reconcile = (channelId: string, temporaryId: string, serverMessage: GatewayMessage): void => {
    this.updateChannel(channelId, (current) => {
      const messages = current.messages.filter((message) => message.id !== temporaryId);
      const existing = messages.findIndex((message) => message.id === serverMessage.id);
      if (existing >= 0) messages[existing] = serverMessage;
      else messages.push(serverMessage);
      return { ...current, messages: messages.sort(compareMessages) };
    });
  };

  markFailed = (channelId: string, temporaryId: string, error: string): void => {
    this.updateChannel(channelId, (current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === temporaryId ? { ...message, delivery: "failed", error } : message,
      ),
    }));
  };

  prependOlder = (channelId: string, messages: ChannelMessageWithSender[], cursor: ChannelCursor | null, hasMore: boolean): void => {
    this.updateChannel(channelId, (current) => {
      const byId = new Map(current.messages.map((message) => [message.id, message]));
      for (const message of messages) byId.set(message.id, { ...message, delivery: "sent" });
      return { ...current, messages: [...byId.values()].sort(compareMessages), cursor, hasMore };
    });
  };

  loadOlder = async (channelId: string, cursor: ChannelCursor): Promise<ChannelMessageWithSender[]> => {
    const client = this.getClient();
    const { data, error } = await client.rpc("get_channel_messages", {
      p_channel_id: channelId,
      p_before_created_at: cursor.createdAt,
      p_before_id: cursor.id,
      p_limit: PAGE_SIZE + 1,
    });
    let rows: Record<string, unknown>[] = (data ?? []) as Record<string, unknown>[];
    if (error) {
      const fallback = await client
        .from("channel_messages")
        .select("id, channel_id, sender_id, content, image_url, created_at, edited_at")
        .eq("channel_id", channelId)
        .or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (fallback.error) throw new Error(fallback.error.message);
      rows = (fallback.data ?? []) as Record<string, unknown>[];
    }
    const hasMore = rows.length > PAGE_SIZE;
    const page = rows.slice(0, PAGE_SIZE).reverse();
    const profiles = new Map<string, ChannelMessageWithSender["sender"]>();
    const senderIds = [...new Set(page.map((row) => String(row.sender_id)))];
    if (senderIds.length > 0) {
      const { data: profileRows } = await this.getClient()
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", senderIds);
      for (const profile of profileRows ?? []) {
        const parsed = profileFromRow(profile as Record<string, unknown>);
        this.store.profiles.set(parsed.id, parsed);
        profiles.set(parsed.id, parsed);
      }
    }
    const messages = page.map((row) => ({
      id: String(row.id),
      channel_id: String(row.channel_id),
      sender_id: String(row.sender_id),
      content: typeof row.content === "string" ? row.content : "",
      image_url: typeof row.image_url === "string" ? row.image_url : null,
      created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      edited_at: typeof row.edited_at === "string" ? row.edited_at : null,
      sender: profiles.get(String(row.sender_id)) ?? null,
    }));
    const oldest = messages[0];
    const nextCursor = oldest?.created_at ? { createdAt: oldest.created_at, id: oldest.id } : null;
    this.prependOlder(channelId, messages, nextCursor, hasMore);
    return messages;
  };

  disconnect = (): void => {
    if (this.store.channel) void this.getClient().removeChannel(this.store.channel);
    this.store.channel = null;
    this.store.userId = null;
    this.store.status = "closed";
    this.store.channels.clear();
    this.store.typing.clear();
    this.store.presence.clear();
    this.store.topology.clear();
    this.store.profiles.clear();
    this.store.profileRequests.clear();
    this.emit();
  };

  setTyping = (channelId: string, typing: boolean): void => {
    if (!this.store.channel || !this.store.userId) return;
    void this.store.channel.send({
      type: "broadcast",
      event: "typing",
      payload: { channel_id: channelId, user_id: this.store.userId, typing },
    });
  };

  private receiveTyping(payload: Record<string, unknown>): void {
    const channelId = typeof payload.channel_id === "string" ? payload.channel_id : null;
    const userId = typeof payload.user_id === "string" ? payload.user_id : null;
    if (!channelId || !userId || userId === this.store.userId) return;
    const users = this.store.typing.get(channelId) ?? new Map<string, TypingUser>();
    if (payload.typing === false) users.delete(userId);
    else users.set(userId, { user_id: userId, username: typeof payload.username === "string" ? payload.username : null });
    this.store.typing.set(channelId, users);
    this.emit();
    if (payload.typing !== false) {
      window.setTimeout(() => {
        const current = this.store.typing.get(channelId);
        current?.delete(userId);
        this.emit();
      }, 5000);
    }
  }

  private receivePresence(channel: RealtimeChannel): void {
    const state = channel.presenceState<{ user_id?: string; server_id?: string }>();
    for (const [key, entries] of Object.entries(state)) {
      const entry = entries[0];
      const serverId = entry?.server_id;
      if (!serverId) continue;
      const users = this.store.presence.get(serverId) ?? new Set<string>();
      users.add(key);
      this.store.presence.set(serverId, users);
    }
    this.emit();
  }
}

export const serverGateway = new ServerGateway();
export { PAGE_SIZE as SERVER_CHANNEL_PAGE_SIZE };
