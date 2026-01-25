import { v } from "convex/values";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Memory category type
const memoryCategory = v.union(
  v.literal("allergy"),
  v.literal("intolerance"),
  v.literal("restriction"),
  v.literal("preference"),
  v.literal("goal"),
  v.literal("equipment")
);

// Priority order for context injection (allergies first = survives truncation)
const CATEGORY_PRIORITY = [
  "allergy",
  "intolerance",
  "restriction",
  "equipment",
  "goal",
  "preference",
] as const;

// Get all memories for a user
export const getMemories = query({
  args: {
    category: v.optional(memoryCategory),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.category) {
      return await ctx.db
        .query("userMemories")
        .withIndex("by_userId_category", (q) =>
          q.eq("userId", userId).eq("category", args.category!)
        )
        .collect();
    }

    return await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get formatted memories for system prompt injection
export const getMemoryContext = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const memories = await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (memories.length === 0) return "";

    // Group memories by category
    const grouped: Record<string, typeof memories> = {};
    for (const category of CATEGORY_PRIORITY) {
      grouped[category] = memories.filter((m) => m.category === category);
    }

    // Build context with PRIORITY ORDER (allergies first)
    let context = "**User Dietary Profile (ALWAYS RESPECT):**\n\n";

    if (grouped.allergy.length > 0) {
      context += `ALLERGIES (CRITICAL - NEVER INCLUDE):\n`;
      context += grouped.allergy.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.intolerance.length > 0) {
      context += `INTOLERANCES (avoid, traces may be acceptable):\n`;
      context +=
        grouped.intolerance.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.restriction.length > 0) {
      context += `DIETARY RESTRICTIONS (hard limits):\n`;
      context +=
        grouped.restriction.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.equipment.length > 0) {
      context += `KITCHEN EQUIPMENT:\n`;
      context +=
        grouped.equipment.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.goal.length > 0) {
      context += `DIETARY GOALS:\n`;
      context += grouped.goal.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.preference.length > 0) {
      context += `PREFERENCES:\n`;
      context +=
        grouped.preference.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }

    return context;
  },
});

// Internal query for memory compaction
export const getMemoriesInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Internal: Get memory context for AI
export const getMemoryContextInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (memories.length === 0) return "";

    const grouped: Record<string, typeof memories> = {};
    for (const category of CATEGORY_PRIORITY) {
      grouped[category] = memories.filter((m) => m.category === category);
    }

    let context = "**User Dietary Profile (ALWAYS RESPECT):**\n\n";

    if (grouped.allergy.length > 0) {
      context += `ALLERGIES (CRITICAL - NEVER INCLUDE):\n`;
      context += grouped.allergy.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.intolerance.length > 0) {
      context += `INTOLERANCES:\n`;
      context +=
        grouped.intolerance.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.restriction.length > 0) {
      context += `DIETARY RESTRICTIONS:\n`;
      context +=
        grouped.restriction.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.equipment.length > 0) {
      context += `KITCHEN EQUIPMENT:\n`;
      context +=
        grouped.equipment.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.goal.length > 0) {
      context += `DIETARY GOALS:\n`;
      context += grouped.goal.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.preference.length > 0) {
      context += `PREFERENCES:\n`;
      context +=
        grouped.preference.map((m) => `  - ${m.fact}`).join("\n") + "\n\n";
    }

    return context;
  },
});

// Internal: Add extracted memories
export const addMemories = internalMutation({
  args: {
    userId: v.id("users"),
    memories: v.array(
      v.object({
        fact: v.string(),
        category: memoryCategory,
        confidence: v.literal("high"),
      })
    ),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const memory of args.memories) {
      // Check for duplicate facts
      const existing = await ctx.db
        .query("userMemories")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("fact"), memory.fact))
        .first();

      if (!existing) {
        await ctx.db.insert("userMemories", {
          userId: args.userId,
          fact: memory.fact,
          category: memory.category,
          confidence: memory.confidence,
          extractedAt: now,
          sourceConversationId: args.sourceConversationId,
        });
      }
    }
  },
});

// User can manually delete a memory
export const deleteMemory = mutation({
  args: { id: v.id("userMemories") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const memory = await ctx.db.get(args.id);

    if (!memory || memory.userId !== userId) {
      throw new Error("Memory not found");
    }

    await ctx.db.delete(args.id);
  },
});

// User can manually add a memory
export const addMemoryManual = mutation({
  args: {
    fact: v.string(),
    category: memoryCategory,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    await ctx.db.insert("userMemories", {
      userId,
      fact: args.fact.slice(0, 500),
      category: args.category,
      confidence: "high",
      extractedAt: Date.now(),
    });
  },
});
