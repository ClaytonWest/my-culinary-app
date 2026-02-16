import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";
import { RecipeInputSchema } from "./lib/validators";

const mealTypeValidator = v.optional(v.union(
  v.literal("Main Dish"),
  v.literal("Side Dish"),
  v.literal("Appetizer"),
  v.literal("Dessert"),
  v.literal("Snack"),
  v.literal("Soup"),
  v.literal("Salad"),
  v.literal("Breakfast"),
  v.literal("Beverage")
));



export const list = query({
  args: {
    limit: v.optional(v.number()),
    favoritesOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
    mealType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    let recipes;

    if (args.favoritesOnly) {
      recipes = await ctx.db
        .query("recipes")
        .withIndex("by_userId_isFavorite", (q) =>
          q.eq("userId", userId).eq("isFavorite", true)
        )
        .take(limit);
    } else {
      recipes = await ctx.db
        .query("recipes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    }

    // Simple text search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(searchLower) ||
          r.description.toLowerCase().includes(searchLower) ||
          r.ingredients.some((i) =>
            i.name.toLowerCase().includes(searchLower)
          ) ||
          r.dietaryTags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    // Category filters
    if (args.mealType) {
      recipes = recipes.filter((r) => r.mealType === args.mealType);
    }

    // Sort favorites to the top
    recipes.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return recipes;
  },
});

export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    return recipe;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    ingredients: v.array(
      v.object({
        name: v.string(),
        amount: v.string(),
        unit: v.string(),
        preparation: v.optional(v.string()),
        optional: v.optional(v.boolean()),
      })
    ),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.array(v.string()),
    mealType: mealTypeValidator,
    proteinType: v.optional(v.string()),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("user_created"),
      v.literal("ai_extracted")
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    RecipeInputSchema.parse({
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      instructions: args.instructions,
      servings: args.servings,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      dietaryTags: args.dietaryTags,
      mealType: args.mealType,
      proteinType: args.proteinType,
    });

    const now = Date.now();

    return await ctx.db.insert("recipes", {
      userId,
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      instructions: args.instructions,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      servings: args.servings,
      dietaryTags: args.dietaryTags,
      mealType: args.mealType,
      proteinType: args.proteinType,
      source: args.source,
      sourceConversationId: args.sourceConversationId,
      sourceMessageId: args.sourceMessageId,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal create for AI extraction
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(
      v.object({
        name: v.string(),
        amount: v.string(),
        unit: v.string(),
        preparation: v.optional(v.string()),
        optional: v.optional(v.boolean()),
      })
    ),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.optional(v.array(v.string())),
    mealType: mealTypeValidator,
    proteinType: v.optional(v.string()),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("user_created"),
      v.literal("ai_extracted")
    ),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    RecipeInputSchema.parse({
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      instructions: args.instructions,
      servings: args.servings,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      dietaryTags: args.dietaryTags,
      mealType: args.mealType,
      proteinType: args.proteinType,
    });

    const now = Date.now();
    return await ctx.db.insert("recipes", {
      ...args,
      dietaryTags: args.dietaryTags || [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update recipe
export const update = mutation({
  args: {
    id: v.id("recipes"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ingredients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          amount: v.string(),
          unit: v.string(),
        })
      )
    ),
    instructions: v.optional(v.array(v.string())),
    servings: v.optional(v.number()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    dietaryTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);

    RecipeInputSchema.partial().parse({
      ...(args.title !== undefined && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.ingredients !== undefined && { ingredients: args.ingredients }),
      ...(args.instructions !== undefined && { instructions: args.instructions }),
      ...(args.servings !== undefined && { servings: args.servings }),
      ...(args.prepTime !== undefined && { prepTime: args.prepTime }),
      ...(args.cookTime !== undefined && { cookTime: args.cookTime }),
      ...(args.dietaryTags !== undefined && { dietaryTags: args.dietaryTags }),
    });

    // Update recipe
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.ingredients) updates.ingredients = args.ingredients;
    if (args.instructions) updates.instructions = args.instructions;
    if (args.servings) updates.servings = args.servings;
    if (args.prepTime !== undefined) updates.prepTime = args.prepTime;
    if (args.cookTime !== undefined) updates.cookTime = args.cookTime;
    if (args.dietaryTags) updates.dietaryTags = args.dietaryTags;

    await ctx.db.patch(args.id, updates);
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    await ctx.db.patch(args.id, {
      isFavorite: !recipe.isFavorite,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    await ctx.db.delete(args.id);
  },
});

// Lightweight autocomplete endpoint for @mention
export const listForMention = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 10, 20);

    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);

    let filtered = recipes;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = recipes.filter((r) =>
        r.title.toLowerCase().includes(searchLower)
      );
    }

    return filtered.slice(0, limit).map((r) => ({
      _id: r._id,
      title: r.title,
      mealType: r.mealType,
      proteinType: r.proteinType,
    }));
  },
});

// Internal query for fetching full recipe data (used by AI context injection)
export const getInternal = internalQuery({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
