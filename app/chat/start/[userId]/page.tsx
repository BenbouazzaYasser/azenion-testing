import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateConversation } from "@/actions/chat.actions";

interface Props {
  params: { userId: string };
}

export default async function StartConversationPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getOrCreateConversation(params.userId);

  if (result.error) {
    redirect("/chat");
  }

  redirect(`/chat/${result.conversation_id}`);
}
