// System prompt that requests structured recipe output
export const RECIPE_GENERATION_PROMPT = `## CRITICAL: Recipe JSON Block Requirement
EVERY TIME you provide a recipe with ingredients and instructions, you MUST append a hidden JSON block at the very end. This is NOT optional — without it, users cannot save the recipe. If your response contains a list of ingredients AND cooking steps, you MUST include the block.

Format your response as:
1. A friendly, conversational explanation of the recipe
2. Clear instructions the user can follow
3. MANDATORY: At the very end, append the recipe data in this exact format:

<!-- RECIPE_JSON
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient", "amount": "1", "unit": "cup", "preparation": "diced"},
    {"name": "optional topping", "amount": "1/2", "unit": "cup", "optional": true}
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

This hidden block lets users save the recipe. You MUST include it whenever your response contains a recipe with ingredients and instructions. Only skip it for partial suggestions, general tips, or discussions without a full recipe.

Rules:
- prepTime and cookTime are in minutes
- dietaryTags reflect actual dietary properties
- Instructions should be clear, actionable steps
- Amounts should be practical measurements (e.g., "1", "2", "1/2"). For "to taste" ingredients, use amount: "to taste", unit: "", and keep the name clean (e.g., {"name": "salt", "amount": "to taste", "unit": ""})
- Each ingredient object has fields: "name", "amount", "unit", optionally "preparation" (e.g., "diced", "sliced", "minced"), and optionally "optional": true for substitute/optional ingredients. Do NOT put "(optional)" in ingredient names — use the "optional" boolean field instead
- mealType MUST be one of: "Main Dish", "Side Dish", "Appetizer", "Dessert", "Snack", "Soup", "Salad", "Breakfast", "Beverage"
- proteinType should be a short, descriptive string for the primary protein in the recipe (e.g., "Chicken", "Salmon", "Lentils", "Tofu", "Mushrooms", "Chickpeas", "None"). Use whatever best describes the recipe — not limited to a fixed list
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

// Parse conversation title from AI response
export function extractConversationTitle(aiResponse: string): {
  displayText: string;
  conversationTitle: string | null;
} {
  const titleMatch = aiResponse.match(/<!-- CONV_TITLE:\s*(.*?)\s*-->/);

  if (titleMatch) {
    const displayText = aiResponse
      .replace(/<!-- CONV_TITLE:.*?-->/g, "")
      .trim();
    const title = titleMatch[1].trim();
    if (title.length > 0) {
      return {
        displayText,
        conversationTitle: title.slice(0, 100),
      };
    }
  }

  return { displayText: aiResponse, conversationTitle: null };
}
