import { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Clock, Users, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeDetailProps {
  recipe: Doc<"recipes">;
  onBack: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
}

export function RecipeDetail({
  recipe,
  onBack,
  onToggleFavorite,
  onEdit,
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
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
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
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    {ing.amount} {ing.unit} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
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
