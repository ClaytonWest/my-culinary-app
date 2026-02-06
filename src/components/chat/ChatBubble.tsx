import { Doc } from "../../../convex/_generated/dataModel";
import { ChefHat, User } from "lucide-react";
import { RecipeCard } from "./RecipeCard";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatBubbleProps {
  message: Doc<"messages">;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 max-w-chat mx-auto",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary" : "bg-primary/10"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <ChefHat className="h-4 w-4 text-primary" />
        )}
      </div>

      <div className={cn("space-y-2", isUser ? "max-w-[80%] flex flex-col items-end" : "max-w-full")}>
        <div
          className={cn(
            isUser
              ? "rounded-bubble px-4 py-3 bg-primary text-primary-foreground"
              : "px-1 py-1 text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-lg dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {message.imageStorageId && (
            <div
              className={cn(
                "mt-2 text-xs",
                isUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              [Image attached]
            </div>
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
  );
}
