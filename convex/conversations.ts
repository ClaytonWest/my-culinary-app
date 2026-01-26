import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_userId_lastMessageAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return conversations;
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conversation = await ctx.db.get(args.id);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    requireOwnership(conversation.userId, userId);
    return conversation;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    return await ctx.db.insert("conversations", {
      userId,
      title: args.title ?? "New Chat",
      lastMessageAt: Date.now(),
      messageCount: 0,
      isArchived: false,
      createdAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conversation = await ctx.db.get(args.id);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    requireOwnership(conversation.userId, userId);
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conversation = await ctx.db.get(args.id);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    requireOwnership(conversation.userId, userId);
    await ctx.db.patch(args.id, { title: args.title.slice(0, 100) });
  },
});

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conversation = await ctx.db.get(args.id);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    requireOwnership(conversation.userId, userId);

    // Delete all messages in this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Internal query for memory compaction debugging
export const getInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
