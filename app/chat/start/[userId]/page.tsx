import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation } from "@/actions/chat.actions";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function StartConversationPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/start/${userId}`)}`);
  }

  const result = await getOrCreateConversation(userId);

  if (result.error) {
    redirect("/chat");
  }

  redirect(`/chat/${result.conversation_id}`);
}
