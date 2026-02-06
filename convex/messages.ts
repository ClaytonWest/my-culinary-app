import { v } from "convex/values";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { requireAuth, requireOwnership, verifyFileOwnership } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { validatePrompt } from "./lib/validators";

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    requireOwnership(conversation.userId, userId);

    const limit = Math.min(args.limit ?? 50, 100);

    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .take(limit);
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    requireOwnership(conversation.userId, userId);

    // Verify image ownership if provided
    if (args.imageStorageId) {
      await verifyFileOwnership(ctx, args.imageStorageId, userId);
    }

    // Validate content
    const validatedContent = validatePrompt(args.content);

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "user",
      content: validatedContent,
      imageStorageId: args.imageStorageId,
      isStreaming: false,
      createdAt: Date.now(),
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      messageCount: conversation.messageCount + 1,
    });

    // Auto-generate title from first message if it's still "New Chat"
    if (conversation.title === "New Chat" && conversation.messageCount === 0) {
      const title = validatedContent.slice(0, 50) + (validatedContent.length > 50 ? "..." : "");
      await ctx.db.patch(args.conversationId, { title });

      // Fire async AI title generation - Convex reactivity will push update to sidebar
      await ctx.scheduler.runAfter(0, internal.titleGeneration.generateTitle, {
        conversationId: args.conversationId,
        firstMessage: validatedContent,
      });
    }

    return messageId;
  },
});

// Internal query for memory compaction and AI chat
export const getRecentInternal = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(args.limit);
  },
});

// Internal: Get message by ID
export const getById = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

// Internal: Create assistant message
export const createAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    content: v.string(),
    recipeJson: v.optional(v.string()),
    linkedRecipeId: v.optional(v.id("recipes")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: args.content,
      recipeJson: args.recipeJson,
      linkedRecipeId: args.linkedRecipeId,
      isStreaming: false,
      createdAt: Date.now(),
    });

    // Update conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        lastMessageAt: Date.now(),
        messageCount: conversation.messageCount + 1,
      });
    }

    return messageId;
  },
});

// Internal: Update image analysis
export const updateImageAnalysis = internalMutation({
  args: {
    messageId: v.id("messages"),
    analysis: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      imageAnalysis: args.analysis,
    });
  },
});
