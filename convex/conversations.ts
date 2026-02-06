import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
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
      // Delete storage file if message has an image
      const storageId = message.imageStorageId;
      if (storageId) {
        await ctx.storage.delete(storageId);

        // Delete the uploadedFiles ownership record
        const uploadRecord = await ctx.db
          .query("uploadedFiles")
          .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
          .first();
        if (uploadRecord) {
          await ctx.db.delete(uploadRecord._id);
        }
      }

      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const updateTitleInternal = internalMutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (conversation) {
      await ctx.db.patch(args.id, { title: args.title.slice(0, 100) });
    }
  },
});

export const search = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    if (!args.searchTerm.trim()) return [];

    // Search conversations by title
    const titleMatches = await ctx.db
      .query("conversations")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm).eq("userId", userId)
      )
      .take(limit);

    // Search messages by content
    const messageMatches = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchTerm).eq("userId", userId)
      )
      .take(50);

    // Get unique conversation IDs from message matches, fetch those conversations
    const messageConvoIds = [
      ...new Set(messageMatches.map((m) => m.conversationId)),
    ];
    const messageConvos = await Promise.all(
      messageConvoIds.slice(0, limit).map((id) => ctx.db.get(id))
    );

    // Merge, deduplicate, sort by lastMessageAt desc
    const allConvoMap = new Map();
    for (const c of titleMatches) {
      if (c && !c.isArchived) allConvoMap.set(c._id, c);
    }
    for (const c of messageConvos) {
      if (c && !c.isArchived && !allConvoMap.has(c._id))
        allConvoMap.set(c._id, c);
    }

    return Array.from(allConvoMap.values())
      .sort(
        (a: { lastMessageAt: number }, b: { lastMessageAt: number }) =>
          b.lastMessageAt - a.lastMessageAt
      )
      .slice(0, limit);
  },
});

// Internal query for memory compaction debugging
export const getInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
