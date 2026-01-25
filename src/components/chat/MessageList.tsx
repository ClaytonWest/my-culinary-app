import { useEffect, useRef } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { RecipeCard } from "./RecipeCard";

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
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Start a conversation!</p>
          <p className="text-sm mt-2">
            Ask me about recipes, cooking tips, or upload a photo of ingredients.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message._id}
          className={cn(
            "flex gap-3 max-w-3xl",
            message.role === "user" ? "ml-auto flex-row-reverse" : ""
          )}
        >
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            {message.role === "user" ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          <div className="max-w-[80%]">
            <div
              className={cn(
                "rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.imageStorageId && (
                <p className="text-xs mt-2 opacity-70">[Image attached]</p>
              )}
            </div>
            {message.recipeJson && (
              <RecipeCard
                recipeJson={message.recipeJson}
                conversationId={message.conversationId}
                messageId={message._id}
              />
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-3 max-w-3xl">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-muted rounded-lg px-4 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
