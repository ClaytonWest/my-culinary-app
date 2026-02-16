import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookmarkPlus, Check, Clock, Users } from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { useNavigate } from "react-router-dom";

interface RecipeData {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit: string; preparation?: string; optional?: boolean }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings: number;
  dietaryTags: string[];
  mealType?: string;
  proteinType?: string;
}

interface RecipeCardProps {
  recipeJson: string;
  conversationId: Id<"conversations">;
  messageId: Id<"messages">;
  linkedRecipeId?: Id<"recipes"> | null;
}

export function RecipeCard({
  recipeJson,
  conversationId,
  messageId,
  linkedRecipeId,
}: RecipeCardProps) {
  const createRecipe = useMutation(api.recipes.create);
  const linkRecipe = useMutation(api.messages.linkRecipe);
  const navigate = useNavigate();
  const alreadySaved = !!linkedRecipeId;
  const [saved, setSaved] = useState(alreadySaved);
  const [saving, setSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<Id<"recipes"> | null>(linkedRecipeId ?? null);
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
      const recipeId = await createRecipe({
        ...recipe,
        dietaryTags: recipe.dietaryTags || [],
        mealType: recipe.mealType as "Main Dish" | "Side Dish" | "Appetizer" | "Dessert" | "Snack" | "Soup" | "Salad" | "Breakfast" | "Beverage" | undefined,
        proteinType: recipe.proteinType,
        source: "ai_generated",
        sourceConversationId: conversationId,
        sourceMessageId: messageId,
      });
      // Link the recipe back to this message so it persists
      await linkRecipe({ messageId, recipeId });
      setSaved(true);
      setSavedRecipeId(recipeId);
      showToast(
        <span>
          "{recipe.title}" saved!{" "}
          <button
            onClick={() => navigate("/recipes", { state: { recipeId } })}
            className="underline font-semibold hover:opacity-80"
          >
            View in Recipe Book
          </button>
        </span>,
        "success"
      );
    } catch (error) {
      console.error("Failed to save recipe:", error);
      showToast("Failed to save recipe. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleViewRecipe = () => {
    if (savedRecipeId) {
      navigate("/recipes", { state: { recipeId: savedRecipeId } });
    }
  };

  return (
    <Card className="mt-3 bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30">
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
          {saved ? (
            <Button
              onClick={handleViewRecipe}
              variant="outline"
              size="sm"
              className="bg-primary/10 text-primary border-primary/30"
            >
              <Check className="h-4 w-4 mr-1" />
              Saved
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
            >
              <BookmarkPlus className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
