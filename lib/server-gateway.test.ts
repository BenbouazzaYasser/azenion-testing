import { beforeEach, describe, expect, it } from "vitest";
import type { ChannelMessageWithSender } from "@/data/servers";
import { serverGateway } from "@/lib/server-gateway";

function message(id: string, createdAt: string, content = id): ChannelMessageWithSender {
  return {
    id,
    channel_id: "channel-1",
    sender_id: "user-1",
    content,
    image_url: null,
    created_at: createdAt,
    edited_at: null,
    sender: null,
  };
}

describe("serverGateway message state", () => {
  beforeEach(() => serverGateway.disconnect());

  it("reconciles an optimistic message without duplicating the durable row", () => {
    const temporaryId = serverGateway.appendOptimistic("channel-1", "user-1", "hello");
    const durable = {
      ...message("server-1", "2026-01-01T00:00:01.000Z", "hello"),
      delivery: "sent" as const,
    };
    serverGateway.reconcile("channel-1", temporaryId, durable);

    const messages = serverGateway.getChannel("channel-1").messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: "server-1", delivery: "sent" });
  });

  it("deduplicates realtime inserts and preserves failed delivery state", () => {
    const temporaryId = serverGateway.appendOptimistic("channel-1", "user-1", "retry me");
    serverGateway.markFailed("channel-1", temporaryId, "offline");
    serverGateway.mergeIncoming({
      ...message("server-1", "2026-01-01T00:00:01.000Z", "retry me"),
      delivery: "sent",
    });

    const messages = serverGateway.getChannel("channel-1").messages;
    expect(messages.filter((item) => item.content === "retry me")).toHaveLength(2);
    expect(messages.find((item) => item.id === temporaryId)?.delivery).toBe("failed");
  });
});
