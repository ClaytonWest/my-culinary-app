import { cn } from "@/lib/utils";

interface SuggestionCardProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export function SuggestionCard({ text, onClick, className }: SuggestionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative px-4 py-3 rounded-xl bg-card border border-border",
        "hover:border-primary/50 hover:bg-muted/50 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "text-left text-sm font-medium text-foreground",
        "min-h-[44px]",
        className
      )}
    >
      <span className="group-hover:text-primary transition-colors">{text}</span>
    </button>
  );
}

interface SuggestionPillProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export function SuggestionPill({ text, onClick, className }: SuggestionPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full bg-muted/80 border border-border",
        "hover:border-primary/50 hover:bg-primary/10 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "text-sm font-medium text-foreground whitespace-nowrap",
        "min-h-[44px]",
        className
      )}
    >
      {text}
    </button>
  );
}
