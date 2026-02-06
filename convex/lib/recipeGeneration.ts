// System prompt that requests structured recipe output
export const RECIPE_GENERATION_PROMPT = `You are a helpful cooking assistant. When providing a complete recipe, ALWAYS include a structured JSON block at the end of your response.

Format your response as:
1. A friendly, conversational explanation of the recipe
2. Clear instructions the user can follow
3. At the very end, include the recipe data in this exact format:

<!-- RECIPE_JSON
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient", "amount": "1", "unit": "cup"}
  ],
  "instructions": ["Step 1", "Step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "dietaryTags": ["vegetarian", "gluten-free"],
  "mealType": "Main Dish",
  "proteinType": "Chicken"
}
RECIPE_JSON -->

This hidden block lets users save the recipe. ONLY include this block when you've provided a COMPLETE recipe with ingredients and instructions. Don't include it for partial suggestions or discussions.

Rules:
- prepTime and cookTime are in minutes
- dietaryTags reflect actual dietary properties
- Instructions should be clear, actionable steps
- Amounts should be practical measurements
- mealType MUST be one of: "Main Dish", "Side Dish", "Appetizer", "Dessert", "Snack", "Soup", "Salad", "Breakfast", "Beverage"
- proteinType MUST be one of: "Chicken", "Beef", "Pork", "Seafood", "Fish", "Turkey", "Lamb", "Tofu", "Legumes", "Eggs", "Veggie", "Other"
- For vegetarian/vegan recipes, use "Veggie" as proteinType
- For recipes with multiple proteins, use the primary one`;

// Parse recipe JSON from AI response
export function extractRecipeJson(aiResponse: string): {
  displayText: string;
  recipeJson: string | null;
} {
  const recipeMatch = aiResponse.match(
    /<!-- RECIPE_JSON\s*([\s\S]*?)\s*RECIPE_JSON -->/
  );

  if (recipeMatch) {
    const displayText = aiResponse
      .replace(/<!-- RECIPE_JSON[\s\S]*?RECIPE_JSON -->/g, "")
      .trim();
    try {
      // Validate it's proper JSON
      JSON.parse(recipeMatch[1]);
      return {
        displayText,
        recipeJson: recipeMatch[1].trim(),
      };
    } catch {
      return { displayText: aiResponse, recipeJson: null };
    }
  }

  return { displayText: aiResponse, recipeJson: null };
}
