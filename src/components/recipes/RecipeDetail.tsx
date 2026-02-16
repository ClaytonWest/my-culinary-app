import { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeDetailProps {
  recipe: Doc<"recipes">;
  onBack: () => void;
  onToggleFavorite: () => void;
}

export function RecipeDetail({
  recipe,
  onBack,
  onToggleFavorite,
}: RecipeDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{recipe.title}</h2>
          <p className="text-muted-foreground">{recipe.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
          <Heart
            className={cn(
              "h-5 w-5",
              recipe.isFavorite
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground"
            )}
          />
        </Button>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4">
        {recipe.prepTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Prep: {recipe.prepTime} min</span>
          </div>
        )}
        {recipe.cookTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Cook: {recipe.cookTime} min</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>Serves {recipe.servings}</span>
        </div>
      </div>

      {/* Category badges */}
      {(recipe.mealType || recipe.proteinType) && (
        <div className="flex flex-wrap gap-2">
          {recipe.mealType && (
            <span className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
              {recipe.mealType}
            </span>
          )}
          {recipe.proteinType && (
            <span className="text-sm bg-accent text-accent-foreground px-3 py-1 rounded-full">
              {recipe.proteinType}
            </span>
          )}
        </div>
      )}

      {/* Dietary tags */}
      {recipe.dietaryTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.dietaryTags.map((tag) => (
            <span
              key={tag}
              className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const required = recipe.ingredients.filter((ing) => !ing.optional);
              const optional = recipe.ingredients.filter((ing) => ing.optional);
              return (
                <>
                  <ul className="space-y-2">
                    {required.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span>
                          {ing.amount === "to taste"
                            ? `${ing.name}${ing.preparation ? `, ${ing.preparation}` : ""}, to taste`
                            : `${ing.amount} ${ing.unit} ${ing.name}${ing.preparation ? `, ${ing.preparation}` : ""}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {optional.length > 0 && (
                    <>
                      <p className="text-sm font-medium text-muted-foreground mt-4 mb-2">
                        Optional
                      </p>
                      <ul className="space-y-2">
                        {optional.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {ing.amount === "to taste"
                                ? `${ing.name}${ing.preparation ? `, ${ing.preparation}` : ""}, to taste`
                                : `${ing.amount} ${ing.unit} ${ing.name}${ing.preparation ? `, ${ing.preparation}` : ""}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
