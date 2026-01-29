import { useEffect, useRef } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { ChefHat } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: Doc<"messages">[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">Start a conversation!</p>
          <p className="text-sm mt-2 max-w-sm">
            Ask me about recipes, cooking tips, or upload a photo of ingredients.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.map((message) => (
        <ChatBubble key={message._id} message={message} />
      ))}
      {isLoading && messages.length > 0 && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
