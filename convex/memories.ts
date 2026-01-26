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

// ============================================
// TOOL-USE MUTATIONS (for LLM function calling)
// ============================================

// List all memories for a user (internal, for tool use)
export const listMemoriesForTool = internalQuery({
  args: {
    userId: v.id("users"),
    category: v.optional(memoryCategory),
  },
  handler: async (ctx, args) => {
    let memories;

    if (args.category) {
      memories = await ctx.db
        .query("userMemories")
        .withIndex("by_userId_category", (q) =>
          q.eq("userId", args.userId).eq("category", args.category!)
        )
        .collect();
    } else {
      memories = await ctx.db
        .query("userMemories")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    // Return formatted for LLM consumption
    return memories.map((m) => ({
      id: m._id,
      fact: m.fact,
      category: m.category,
      extractedAt: m.extractedAt,
    }));
  },
});

// Remove memory by fuzzy search (internal, for tool use)
export const removeBySearch = internalMutation({
  args: {
    userId: v.id("users"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const searchLower = args.searchTerm.toLowerCase();

    // Get all user memories
    const memories = await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Fuzzy match - find memories where the fact contains the search term
    const matches = memories.filter((m) =>
      m.fact.toLowerCase().includes(searchLower) ||
      searchLower.includes(m.fact.toLowerCase().split(" ")[0]) // Match first word
    );

    if (matches.length === 0) {
      return {
        success: false,
        message: `No memories found matching "${args.searchTerm}"`,
        deletedCount: 0,
        deletedFacts: [],
      };
    }

    // Delete all matches
    const deletedFacts: string[] = [];
    for (const memory of matches) {
      await ctx.db.delete(memory._id);
      deletedFacts.push(memory.fact);
    }

    return {
      success: true,
      message: `Deleted ${matches.length} memory(s) matching "${args.searchTerm}"`,
      deletedCount: matches.length,
      deletedFacts,
    };
  },
});

// Remove memory by ID (internal, for tool use)
export const removeById = internalMutation({
  args: {
    userId: v.id("users"),
    memoryId: v.id("userMemories"),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);

    if (!memory) {
      return { success: false, message: "Memory not found" };
    }

    if (memory.userId !== args.userId) {
      return { success: false, message: "Memory not found" };
    }

    await ctx.db.delete(args.memoryId);
    return {
      success: true,
      message: `Deleted memory: "${memory.fact}"`,
      deletedFact: memory.fact,
    };
  },
});

// Add memory with duplicate checking (internal, for tool use)
export const addMemoryForTool = internalMutation({
  args: {
    userId: v.id("users"),
    fact: v.string(),
    category: memoryCategory,
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const factLower = args.fact.toLowerCase();

    // Check for similar existing memories
    const existing = await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Check for duplicates (exact or very similar)
    const duplicate = existing.find((m) => {
      const existingLower = m.fact.toLowerCase();
      return (
        existingLower === factLower ||
        existingLower.includes(factLower) ||
        factLower.includes(existingLower)
      );
    });

    if (duplicate) {
      return {
        success: false,
        message: `Similar memory already exists: "${duplicate.fact}"`,
        isDuplicate: true,
        existingFact: duplicate.fact,
      };
    }

    // Insert new memory
    const id = await ctx.db.insert("userMemories", {
      userId: args.userId,
      fact: args.fact.slice(0, 500),
      category: args.category,
      confidence: "high",
      extractedAt: Date.now(),
      sourceConversationId: args.sourceConversationId,
    });

    return {
      success: true,
      message: `Remembered: "${args.fact}" (${args.category})`,
      memoryId: id,
      isDuplicate: false,
    };
  },
});

// Update existing memory (internal, for tool use)
export const updateMemoryForTool = internalMutation({
  args: {
    userId: v.id("users"),
    searchTerm: v.string(),
    newFact: v.optional(v.string()),
    newCategory: v.optional(memoryCategory),
  },
  handler: async (ctx, args) => {
    const searchLower = args.searchTerm.toLowerCase();

    // Find matching memory
    const memories = await ctx.db
      .query("userMemories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const match = memories.find((m) =>
      m.fact.toLowerCase().includes(searchLower)
    );

    if (!match) {
      return {
        success: false,
        message: `No memory found matching "${args.searchTerm}"`,
      };
    }

    // Update the memory
    const updates: Record<string, any> = {};
    if (args.newFact) updates.fact = args.newFact.slice(0, 500);
    if (args.newCategory) updates.category = args.newCategory;

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        message: "No updates provided",
      };
    }

    await ctx.db.patch(match._id, updates);

    return {
      success: true,
      message: `Updated memory from "${match.fact}" to "${args.newFact || match.fact}" (${args.newCategory || match.category})`,
      oldFact: match.fact,
      newFact: args.newFact || match.fact,
      category: args.newCategory || match.category,
    };
  },
});
