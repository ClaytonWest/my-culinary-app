import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChefHat } from "lucide-react";
import { SuggestionCard, SuggestionPill } from "./SuggestionCard";
import { AmbientVideoHeader } from "./AmbientVideoHeader";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface WelcomeStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  "Quick weeknight dinner",
  "Meal prep ideas",
  "Use what I have",
  "Healthier alternatives to...",
];

export function WelcomeState({ onSuggestionClick }: WelcomeStateProps) {
  const profile = useQuery(api.users.getProfile);
  const isMobile = useIsMobile();

  const firstName = profile?.name?.split(" ")[0] || "there";

  return (
    <div className="flex-1 flex flex-col">
      <AmbientVideoHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 -mt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Hi {firstName}
          </h1>
          <p className="text-lg text-muted-foreground">
            What shall we cook today?
          </p>
        </div>

        {isMobile ? (
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {suggestions.map((suggestion) => (
              <SuggestionPill
                key={suggestion}
                text={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion}
                text={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
