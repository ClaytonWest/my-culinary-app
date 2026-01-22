import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipeList } from "@/components/recipes/RecipeList";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { ChefHat, ArrowLeft, Search, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/components/common/Toast";

export function RecipeBookPage() {
  const [search, setSearch] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Doc<"recipes"> | null>(
    null
  );
  const { showToast } = useToast();

  const recipes = useQuery(api.recipes.list, {
    search: search || undefined,
    favoritesOnly: showFavoritesOnly || undefined,
  });
  const toggleFavorite = useMutation(api.recipes.toggleFavorite);
  const deleteRecipe = useMutation(api.recipes.remove);

  const handleToggleFavorite = async (id: typeof selectedRecipe extends null ? never : typeof selectedRecipe._id) => {
    try {
      await toggleFavorite({ id });
      showToast("Recipe updated!", "success");
    } catch {
      showToast("Failed to update recipe", "error");
    }
  };

  const handleDelete = async (id: typeof selectedRecipe extends null ? never : typeof selectedRecipe._id) => {
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
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/" className="hover:opacity-70">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Recipe Book</h1>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
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
            onEdit={() => {
              showToast("Edit functionality coming soon!", "info");
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="hover:opacity-70">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Recipe Book</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
      </main>
    </div>
  );
}
