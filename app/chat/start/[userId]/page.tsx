import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/user";
import { getOrCreateConversation } from "@/actions/chat.actions";

interface Props {
  params: { userId: string };
}

export default async function StartConversationPage({ params }: Props) {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/start/${params.userId}`)}`);
  }

  const result = await getOrCreateConversation(params.userId);

  if (result.error) {
    redirect("/chat");
  }

  redirect(`/chat/${result.conversation_id}`);
}
