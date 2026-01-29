import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { InputPill } from "./InputPill";
import { WelcomeState } from "./WelcomeState";
import { useToast } from "@/components/common/Toast";

interface ChatWindowProps {
  conversationId: Id<"conversations"> | null;
  onMessageSent?: () => void;
  onConversationCreated?: (id: Id<"conversations">) => void;
}

export function ChatWindow({
  conversationId,
  onMessageSent,
  onConversationCreated,
}: ChatWindowProps) {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const { showToast } = useToast();

  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  const createConversation = useMutation(api.conversations.create);
  const chatWithAI = useAction(api.ai.chat);

  const handleSend = async (content: string, imageStorageId?: Id<"_storage">) => {
    let activeConversationId = conversationId;

    try {
      if (!activeConversationId) {
        activeConversationId = await createConversation({});
        onConversationCreated?.(activeConversationId);
      }

      const messageId = await sendMessage({
        conversationId: activeConversationId,
        content,
        imageStorageId,
      });

      onMessageSent?.();

      setIsAiResponding(true);
      try {
        await chatWithAI({
          conversationId: activeConversationId,
          messageId,
        });
      } catch (error) {
        console.error("AI chat error:", error);
        showToast("Failed to get AI response. Please try again.", "error");
      } finally {
        setIsAiResponding(false);
      }
    } catch (error) {
      console.error("Send message error:", error);
      showToast("Failed to send message. Please try again.", "error");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col">
        <WelcomeState onSuggestionClick={handleSuggestionClick} />
        <InputPill
          onSend={handleSend}
          disabled={false}
          placeholder="Ask about recipes, ingredients, cooking tips..."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" role="region" aria-label="Chat conversation">
      <MessageList
        messages={messages ?? []}
        isLoading={messages === undefined || isAiResponding}
      />
      <InputPill
        onSend={handleSend}
        disabled={isAiResponding}
        placeholder="Ask about recipes, ingredients, cooking tips..."
      />
    </div>
  );
}
