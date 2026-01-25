import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // User profile (extends auth user)
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    subscriptionTier: v.union(v.literal("free"), v.literal("premium")),
    dailyRequestCount: v.number(),
    lastRequestReset: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // User memories (extracted from conversations via memory compaction)
  userMemories: defineTable({
    userId: v.id("users"),
    fact: v.string(),
    category: v.union(
      v.literal("allergy"),
      v.literal("intolerance"),
      v.literal("restriction"),
      v.literal("preference"),
      v.literal("goal"),
      v.literal("equipment")
    ),
    confidence: v.literal("high"),
    extractedAt: v.number(),
    sourceConversationId: v.optional(v.id("conversations")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_category", ["userId", "category"]),

  // Conversations (chat sessions)
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    isArchived: v.boolean(),
    lastCompactionAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastMessageAt", ["userId", "lastMessageAt"]),

  // Messages within conversations
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    imageAnalysis: v.optional(v.string()),
    recipeJson: v.optional(v.string()),
    linkedRecipeId: v.optional(v.id("recipes")),
    isStreaming: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"]),

  // Saved recipes
  recipes: defineTable({
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
    dietaryTags: v.array(v.string()),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("user_created"),
      v.literal("ai_extracted")
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    isFavorite: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isFavorite", ["userId", "isFavorite"]),
});
