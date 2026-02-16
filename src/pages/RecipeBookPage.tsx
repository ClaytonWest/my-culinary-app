import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipeList } from "@/components/recipes/RecipeList";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { ChefHat, Search, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/components/common/Toast";

export function RecipeBookPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipeIdFromState = (location.state as { recipeId?: Id<"recipes"> } | null)?.recipeId ?? null;
  const [search, setSearch] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("");
  const [selectedRecipe, setSelectedRecipe] = useState<Doc<"recipes"> | null>(
    null
  );
  const { showToast } = useToast();

  // Deep link: fetch recipe by ID from navigation state
  const linkedRecipe = useQuery(
    api.recipes.get,
    recipeIdFromState ? { id: recipeIdFromState } : "skip"
  );

  // Auto-select linked recipe when it loads
  useEffect(() => {
    if (linkedRecipe && !selectedRecipe) {
      setSelectedRecipe(linkedRecipe);
      // Clear the state so refreshing doesn't re-open
      navigate("/recipes", { replace: true, state: {} });
    }
  }, [linkedRecipe, selectedRecipe, navigate]);

  const recipes = useQuery(api.recipes.list, {
    search: search || undefined,
    favoritesOnly: showFavoritesOnly || undefined,
    mealType: mealTypeFilter || undefined,
  });
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const deleteRecipe = useMutation(api.recipes.remove);

  const handleToggleFavorite = async (id: Id<"recipes">) => {
    try {
      await toggleFavorite({ id });
      showToast("Recipe updated!", "success");
    } catch {
      showToast("Failed to update recipe", "error");
    }
  };

  const handleDelete = async (id: Id<"recipes">) => {
    try {
      await deleteRecipe({ id });
      showToast("Recipe deleted", "success");
    } catch {
      showToast("Failed to delete recipe", "error");
    }
  };

  // If a recipe is selected, show detail view
  if (selectedRecipe) {
    return (
      <div className="flex-1 bg-background overflow-y-auto">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Recipe Book</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <RecipeDetail
            recipe={selectedRecipe}
            onBack={() => setSelectedRecipe(null)}
            onToggleFavorite={async () => {
              await handleToggleFavorite(selectedRecipe._id);
              setSelectedRecipe({
                ...selectedRecipe,
                isFavorite: !selectedRecipe.isFavorite,
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Recipe Book</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="pl-10"
            />
          </div>
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                showFavoritesOnly && "fill-current"
              )}
            />
            Favorites
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={mealTypeFilter}
            onChange={(e) => setMealTypeFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Meal Types</option>
            <option value="Main Dish">Main Dish</option>
            <option value="Side Dish">Side Dish</option>
            <option value="Appetizer">Appetizer</option>
            <option value="Dessert">Dessert</option>
            <option value="Snack">Snack</option>
            <option value="Soup">Soup</option>
            <option value="Salad">Salad</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Beverage">Beverage</option>
          </select>
        </div>

        {/* Recipe list */}
        {recipes === undefined ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <RecipeList
            recipes={recipes}
            onSelect={setSelectedRecipe}
            onToggleFavorite={(id) => handleToggleFavorite(id)}
            onDelete={(id) => handleDelete(id)}
          />
        )}
      </div>
    </div>
  );
}
