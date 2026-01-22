import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    favoritesOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
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
      })
    ),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.array(v.string()),
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
      })
    ),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.optional(v.array(v.string())),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("user_created"),
      v.literal("ai_extracted")
    ),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
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
