import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex gap-3 max-w-chat mx-auto", className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
        <ChefHat className="h-4 w-4 text-primary" />
      </div>
      <div className="bg-muted rounded-bubble px-4 py-3">
        <div className="flex items-center gap-1.5" role="status" aria-label="AI is typing">
          <span className="sr-only">AI is typing</span>
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}
