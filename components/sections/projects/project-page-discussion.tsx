import { MessageSquare } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ChannelChat } from "@/components/servers/channel-chat";
import type { ChannelMessageWithSender } from "@/data/servers";

interface ProjectPageDiscussionProps {
  channelId: string;
  channelName: string;
  topic: string | null;
  currentUserId: string;
  initialMessages: ChannelMessageWithSender[];
}

export function ProjectPageDiscussion({
  channelId,
  channelName,
  topic,
  currentUserId,
  initialMessages,
}: ProjectPageDiscussionProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-discussion-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            <MessageSquare size={13} />
            Live
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-discussion-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Discussion
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-400">
            A group chat for everyone on this project.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-10 flex h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-void-900/40 shadow-card backdrop-blur-xl">
            <ChannelChat
              channelId={channelId}
              channelName={channelName}
              topic={topic}
              currentUserId={currentUserId}
              initialMessages={initialMessages}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
