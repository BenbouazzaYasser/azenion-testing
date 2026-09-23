import { redirect } from "next/navigation";
import { Hash } from "lucide-react";
import { getServerView } from "@/data/servers";
import { serverT } from "@/lib/translation/server";

interface ServerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { slug } = await params;
  const view = await getServerView(slug);

  if (!view) redirect("/servers");

  if (view.channels.length > 0) {
    redirect(`/servers/${view.server.slug}/${view.channels[0]!.slug}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-input">
        <Hash size={26} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-ink-50">{await serverT("servers.noChannels")}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-ink-400">
        {await serverT("servers.noChannelsSub")}
      </p>
    </div>
  );
}
