import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAppLayout } from "@/components/layout/AppLayout";

export function ChatPage() {
  const { selectedConversationId, setSelectedConversationId } = useAppLayout();

  return (
    <ChatWindow
      conversationId={selectedConversationId}
      onMessageSent={() => {}}
      onConversationCreated={setSelectedConversationId}
    />
  );
}
