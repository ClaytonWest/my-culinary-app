import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";
import { compactMemories } from "./lib/memoryCompaction";

// Auto-trigger thresholds
const MESSAGE_THRESHOLD = 10;
const TIME_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check if compaction should run
export const shouldRunCompaction = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return false;

    const now = Date.now();
    const lastCompaction =
      conversation.lastCompactionAt || conversation.createdAt;
    const messagesSinceCompaction = conversation.messageCount;

    // Trigger if 10+ messages OR 24+ hours since last compaction
    const shouldRun =
      messagesSinceCompaction >= MESSAGE_THRESHOLD ||
      now - lastCompaction > TIME_THRESHOLD_MS;

    return shouldRun;
  },
});

// Update last compaction timestamp
export const markCompactionRun = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastCompactionAt: Date.now(),
    });
  },
});

export const runCompaction = action({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Get recent messages from this conversation
    const messages = await ctx.runQuery(internal.messages.getRecentInternal, {
      conversationId: args.conversationId,
      limit: 30,
    });

    // Get existing memories
    const existingMemories = await ctx.runQuery(
      internal.memories.getMemoriesInternal,
      {
        userId,
      }
    );

    const existingFacts = existingMemories.map((m) => m.fact);

    // Run compaction with OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const result = await compactMemories(
      client,
      messages.map((m) => ({ role: m.role, content: m.content })),
      existingFacts
    );

    // Store new memories (only high-confidence are returned)
    if (result.memories.length > 0) {
      await ctx.runMutation(internal.memories.addMemories, {
        userId,
        memories: result.memories,
        sourceConversationId: args.conversationId,
      });
    }

    // Mark compaction as run
    await ctx.runMutation(internal.memoryCompaction.markCompactionRun, {
      conversationId: args.conversationId,
    });

    return {
      newMemories: result.memories.length,
    };
  },
});

// Auto-compaction trigger (call this after AI response)
export const maybeRunCompaction = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const shouldRun = await ctx.runQuery(
      internal.memoryCompaction.shouldRunCompaction,
      {
        conversationId: args.conversationId,
      }
    );

    if (shouldRun) {
      // Run compaction
      try {
        const userId = await getAuthUserId(ctx);
        if (!userId) return;

        const messages = await ctx.runQuery(
          internal.messages.getRecentInternal,
          {
            conversationId: args.conversationId,
            limit: 30,
          }
        );

        const existingMemories = await ctx.runQuery(
          internal.memories.getMemoriesInternal,
          {
            userId,
          }
        );

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const result = await compactMemories(
          client,
          messages.map((m) => ({ role: m.role, content: m.content })),
          existingMemories.map((m) => m.fact)
        );

        if (result.memories.length > 0) {
          await ctx.runMutation(internal.memories.addMemories, {
            userId,
            memories: result.memories,
            sourceConversationId: args.conversationId,
          });
        }

        await ctx.runMutation(internal.memoryCompaction.markCompactionRun, {
          conversationId: args.conversationId,
        });
      } catch (error) {
        console.error("Memory compaction error:", error);
      }
    }
  },
});
