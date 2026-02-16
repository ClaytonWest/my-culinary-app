import { Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeListProps {
  recipes: Doc<"recipes">[];
  onSelect: (recipe: Doc<"recipes">) => void;
  onToggleFavorite: (id: Doc<"recipes">["_id"]) => void;
  onDelete: (id: Doc<"recipes">["_id"]) => void;
}

export function RecipeList({
  recipes,
  onSelect,
  onToggleFavorite,
  onDelete,
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No recipes yet</p>
        <p className="text-sm mt-2">
          Save recipes from your chats to build your collection!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <Card
          key={recipe._id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(recipe)}
        >
          <CardContent className="p-4 h-[200px] flex flex-col">
            {/* Top: title + favorite */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold line-clamp-1 flex-1">{recipe.title}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(recipe._id);
                }}
                className="p-1 flex-shrink-0"
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    recipe.isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  )}
                />
              </button>
            </div>

            {/* Middle: description + meta (grows to fill) */}
            <div className="flex-1 min-h-0 mt-1">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {recipe.description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {(recipe.prepTime || recipe.cookTime) && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {recipe.servings}
                </span>
              </div>
            </div>

            {/* Bottom: tags + delete (always pinned) */}
            <div className="flex items-end justify-between gap-2 mt-2">
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {recipe.mealType && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                    {recipe.mealType}
                  </span>
                )}
                {recipe.proteinType && (
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    {recipe.proteinType}
                  </span>
                )}
                {recipe.dietaryTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {recipe.dietaryTags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{recipe.dietaryTags.length - 2}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this recipe?")) {
                    onDelete(recipe._id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
