import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookmarkPlus, Check, Clock, Users } from "lucide-react";
import { useToast } from "@/components/common/Toast";

interface RecipeData {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings: number;
  dietaryTags: string[];
}

interface RecipeCardProps {
  recipeJson: string;
  conversationId: Id<"conversations">;
  messageId: Id<"messages">;
}

export function RecipeCard({
  recipeJson,
  conversationId,
  messageId,
}: RecipeCardProps) {
  const createRecipe = useMutation(api.recipes.create);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  let recipe: RecipeData;
  try {
    recipe = JSON.parse(recipeJson);
  } catch {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await createRecipe({
        ...recipe,
        dietaryTags: recipe.dietaryTags || [],
        source: "ai_generated",
        sourceConversationId: conversationId,
        sourceMessageId: messageId,
      });
      setSaved(true);
      showToast(`"${recipe.title}" saved to your recipe book!`, "success");
    } catch (error) {
      console.error("Failed to save recipe:", error);
      showToast("Failed to save recipe. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{recipe.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {recipe.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.prepTime && (
                <span className="inline-flex items-center gap-1 text-xs bg-background px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  Prep: {recipe.prepTime}m
                </span>
              )}
              {recipe.cookTime && (
                <span className="inline-flex items-center gap-1 text-xs bg-background px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  Cook: {recipe.cookTime}m
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs bg-background px-2 py-1 rounded">
                <Users className="h-3 w-3" />
                Serves {recipe.servings}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saved || saving}
            variant={saved ? "outline" : "default"}
            size="sm"
            className={saved ? "bg-green-50 text-green-700 border-green-200" : ""}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Saved
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
