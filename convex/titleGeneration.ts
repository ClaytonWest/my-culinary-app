import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

export const generateTitle = internalAction({
  args: {
    conversationId: v.id("conversations"),
    firstMessage: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 30,
        messages: [
          {
            role: "system",
            content:
              "Generate a concise 3-6 word title summarizing this cooking/food conversation. Return ONLY the title text, no quotes, no punctuation at the end.",
          },
          {
            role: "user",
            content: args.firstMessage,
          },
        ],
      });

      const title = response.choices[0]?.message?.content?.trim();
      if (title) {
        await ctx.runMutation(internal.conversations.updateTitleInternal, {
          id: args.conversationId,
          title,
        });
      }
    } catch (error) {
      // Silently fail - truncated title remains as fallback
      console.error("Title generation failed:", error);
    }
  },
});
