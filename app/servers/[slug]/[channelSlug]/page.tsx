import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelChat } from "@/components/servers/channel-chat";
import { getChannelMessages, getServerView } from "@/data/servers";

interface ChannelPageProps {
  params: Promise<{ slug: string; channelSlug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug, channelSlug } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) notFound();

  const view = await getServerView(slug);
  // RLS already filters channels the user can't see.
  const channel = view?.channels.find((c) => c.slug === channelSlug);

  if (!view || !channel) notFound();

  const messages = await getChannelMessages(channel.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChannelChat
        channelId={channel.id}
        channelName={channel.name}
        topic={channel.topic}
        currentUserId={user.id}
        initialMessages={messages}
      />
    </div>
  );
}
