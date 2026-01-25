import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";
import {
  checkTopicGuardrail,
  checkOutputGuardrail,
  CULINARY_SYSTEM_BOUNDARY,
} from "./lib/topicGuardrails";
import {
  RECIPE_GENERATION_PROMPT,
  extractRecipeJson,
} from "./lib/recipeGeneration";
import { analyzeIngredientImage } from "./lib/imageAnalysis";

export const chat = action({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // Get the user's message
    const userMessage = await ctx.runQuery(internal.messages.getById, {
      messageId: args.messageId,
    });
    if (!userMessage) throw new Error("Message not found");

    // Handle image if present
    let imageContext = "";
    if (userMessage.imageStorageId) {
      try {
        const imageUrl = await ctx.storage.getUrl(userMessage.imageStorageId);
        if (imageUrl) {
          // Fetch and convert to base64
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(imageBuffer).toString("base64");

          const analysis = await analyzeIngredientImage(
            client,
            base64,
            "image/jpeg",
            userMessage.content
          );
          imageContext = `\n\n[Image Analysis: ${analysis.rawAnalysis}]`;

          // Store image analysis on message
          await ctx.runMutation(internal.messages.updateImageAnalysis, {
            messageId: args.messageId,
            analysis: analysis.rawAnalysis,
          });
        }
      } catch (error) {
        console.error("Image analysis error:", error);
        imageContext = "\n\n[Image could not be analyzed]";
      }
    }

    // Layer 2: Topic guardrail check (skip for image messages - they're culinary by nature)
    if (!userMessage.imageStorageId) {
      const guardrail = await checkTopicGuardrail(client, userMessage.content);
      if (!guardrail.isCulinary) {
        await ctx.runMutation(internal.messages.createAssistantMessage, {
          conversationId: args.conversationId,
          userId,
          content: guardrail.redirectMessage!,
        });
        return { success: true, offTopic: true };
      }
    }

    // Get conversation history
    const history = await ctx.runQuery(internal.messages.getRecentInternal, {
      conversationId: args.conversationId,
      limit: 20,
    });

    // Get user's memory context (allergies, preferences, etc.)
    const memoryContext = await ctx.runQuery(
      internal.memories.getMemoryContextInternal,
      { userId }
    );

    // Build system prompt with memory context
    const systemPrompt = `${CULINARY_SYSTEM_BOUNDARY}

${RECIPE_GENERATION_PROMPT}

${memoryContext}`;

    // Build messages for GPT (include image analysis context in history)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.reverse().map((m) => ({
        role: m.role as "user" | "assistant",
        content:
          m.content + (m.imageAnalysis ? `\n[Image: ${m.imageAnalysis}]` : ""),
      })),
    ];

    // Add current message with image context if not already in history
    if (imageContext && !history.find((m) => m._id === args.messageId)) {
      messages.push({
        role: "user",
        content: userMessage.content + imageContext,
      });
    }

    // Generate response
    const response = await client.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages,
    });

    let aiResponse =
      response.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    // Layer 3: Output guardrail
    if (!checkOutputGuardrail(aiResponse)) {
      aiResponse =
        "I'm your cooking assistant! I'd love to help you with recipes, meal planning, or food-related questions. What would you like to cook today?";
    }

    // Extract recipe JSON if present
    const { displayText, recipeJson } = extractRecipeJson(aiResponse);

    // Store assistant message
    await ctx.runMutation(internal.messages.createAssistantMessage, {
      conversationId: args.conversationId,
      userId,
      content: displayText,
      recipeJson: recipeJson || undefined,
    });

    // Trigger memory compaction in background (don't await)
    ctx
      .runAction(internal.memoryCompaction.maybeRunCompaction, {
        conversationId: args.conversationId,
      })
      .catch((err) => console.error("Memory compaction error:", err));

    return { success: true, offTopic: false };
  },
});
