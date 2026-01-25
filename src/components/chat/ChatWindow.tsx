import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChefHat } from "lucide-react";
import { useToast } from "@/components/common/Toast";

interface ChatWindowProps {
  conversationId: Id<"conversations"> | null;
  onMessageSent?: () => void;
}

export function ChatWindow({ conversationId, onMessageSent }: ChatWindowProps) {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const { showToast } = useToast();

  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  const chatWithAI = useAction(api.ai.chat);

  const handleSend = async (content: string, imageStorageId?: Id<"_storage">) => {
    if (!conversationId) return;

    try {
      // Send user message
      const messageId = await sendMessage({
        conversationId,
        content,
        imageStorageId,
      });

      onMessageSent?.();

      // Trigger AI response
      setIsAiResponding(true);
      try {
        await chatWithAI({
          conversationId,
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

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <ChefHat className="h-16 w-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Welcome to Culinary AI</h2>
        <p className="text-center max-w-md">
          Select a conversation from the sidebar or create a new one to start
          chatting about recipes, cooking tips, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <MessageList
        messages={messages ?? []}
        isLoading={messages === undefined || isAiResponding}
      />
      <MessageInput
        onSend={handleSend}
        disabled={!conversationId || isAiResponding}
        placeholder="Ask about recipes, ingredients, cooking tips..."
      />
    </div>
  );
}
