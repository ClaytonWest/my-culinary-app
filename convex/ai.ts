import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";
import {
  checkForAbuse,
  checkOutputGuardrail,
  CULINARY_SYSTEM_PROMPT,
} from "./lib/topicGuardrails";
import {
  RECIPE_GENERATION_PROMPT,
  extractRecipeJson,
} from "./lib/recipeGeneration";
import { analyzeIngredientImage } from "./lib/imageAnalysis";
import { Id } from "./_generated/dataModel";

// ============================================
// MEMORY MANAGEMENT TOOLS FOR FUNCTION CALLING
// ============================================

const MEMORY_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_user_memories",
      description:
        "List all stored memories/preferences for the user. Use when user asks 'what do you know about me?' or 'show my preferences'. Returns dietary info, allergies, equipment, and preferences.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "allergy",
              "intolerance",
              "restriction",
              "equipment",
              "goal",
              "preference",
            ],
            description:
              "Optional: filter by category. Omit to show all memories.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_user_memory",
      description:
        "Delete/forget a memory when user wants to remove something. Use when user says 'forget that I...', 'I'm not X anymore', 'remove my X', 'delete my allergy to X'. Matches partially against stored facts.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description:
              "Text to match against existing memories (e.g., 'peanut', 'vegetarian', 'air fryer'). Case-insensitive partial match.",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_user_memory",
      description:
        "Add/remember a new fact about the user. Use when user says 'remember that I...', 'I just got...', 'I am allergic to...', 'I'm vegan now'. Automatically checks for duplicates.",
      parameters: {
        type: "object",
        properties: {
          fact: {
            type: "string",
            description:
              "The fact to remember, phrased as 'User is/has/prefers...' (e.g., 'User is allergic to shellfish', 'User has an Instant Pot')",
          },
          category: {
            type: "string",
            enum: [
              "allergy",
              "intolerance",
              "restriction",
              "equipment",
              "goal",
              "preference",
            ],
            description:
              "Category: allergy (life-threatening), intolerance (digestive issues), restriction (vegan/halal/kosher), equipment (kitchen tools), goal (dietary goals), preference (likes/dislikes)",
          },
        },
        required: ["fact", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_memory",
      description:
        "Update an existing memory. Use when user says 'actually I...' or wants to modify an existing preference. Finds matching memory and updates it.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Text to find the memory to update",
          },
          newFact: {
            type: "string",
            description:
              "The updated fact (optional if only changing category)",
          },
          newCategory: {
            type: "string",
            enum: [
              "allergy",
              "intolerance",
              "restriction",
              "equipment",
              "goal",
              "preference",
            ],
            description: "New category (optional if only changing fact)",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
];

// Type for valid category values
type MemoryCategory =
  | "allergy"
  | "intolerance"
  | "restriction"
  | "equipment"
  | "goal"
  | "preference";

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

    // Minimal abuse check (jailbreak attempts only) - LLM handles topic routing naturally
    const abuseCheck = checkForAbuse(userMessage.content);
    if (abuseCheck.isAbusive) {
      await ctx.runMutation(internal.messages.createAssistantMessage, {
        conversationId: args.conversationId,
        userId,
        content:
          "I'm your cooking assistant! I'd love to help with recipes, meal planning, or food questions. What would you like to cook today?",
      });
      return { success: true, offTopic: true };
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

    // Build system prompt with memory context injected
    const systemPrompt = `${CULINARY_SYSTEM_PROMPT.replace("{memoryContext}", memoryContext || "No dietary profile stored yet.")}

${RECIPE_GENERATION_PROMPT}`;

    // Build messages for GPT (include image analysis context in history)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.reverse().map((m: any) => ({
        role: m.role as "user" | "assistant",
        content:
          m.content + (m.imageAnalysis ? `\n[Image: ${m.imageAnalysis}]` : ""),
      })),
    ];

    // Add current message with image context if not already in history
    if (imageContext && !history.find((m: any) => m._id === args.messageId)) {
      messages.push({
        role: "user",
        content: userMessage.content + imageContext,
      });
    }

    // ============================================
    // AGENTIC TOOL LOOP - Handle memory management
    // ============================================

    let aiResponse = "";
    let toolCallsCount = 0;
    const MAX_TOOL_CALLS = 5; // Safety limit

    // Initial request with tools
    let response = await client.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages,
      tools: MEMORY_TOOLS,
      tool_choice: "auto",
    });

    // Tool loop - keep processing until no more tool calls
    while (
      response.choices[0]?.message?.tool_calls &&
      response.choices[0].message.tool_calls.length > 0 &&
      toolCallsCount < MAX_TOOL_CALLS
    ) {
      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage);

      // Process each tool call (we know tool_calls exists from while condition)
      const toolCalls = assistantMessage.tool_calls!;
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let toolResult: any;

        try {
          switch (functionName) {
            case "list_user_memories": {
              const memories = await ctx.runQuery(
                internal.memories.listMemoriesForTool,
                {
                  userId,
                  category: functionArgs.category as MemoryCategory | undefined,
                }
              );

              if (memories.length === 0) {
                toolResult = {
                  success: true,
                  message: "No memories stored yet.",
                  memories: [],
                };
              } else {
                toolResult = {
                  success: true,
                  message: `Found ${memories.length} memories.`,
                  memories: memories,
                };
              }
              break;
            }

            case "remove_user_memory": {
              const result = await ctx.runMutation(
                internal.memories.removeBySearch,
                {
                  userId,
                  searchTerm: functionArgs.searchTerm,
                }
              );
              toolResult = result;
              break;
            }

            case "add_user_memory": {
              const result = await ctx.runMutation(
                internal.memories.addMemoryForTool,
                {
                  userId,
                  fact: functionArgs.fact,
                  category: functionArgs.category as MemoryCategory,
                  sourceConversationId: args.conversationId,
                }
              );
              toolResult = result;
              break;
            }

            case "update_user_memory": {
              const result = await ctx.runMutation(
                internal.memories.updateMemoryForTool,
                {
                  userId,
                  searchTerm: functionArgs.searchTerm,
                  newFact: functionArgs.newFact,
                  newCategory: functionArgs.newCategory as
                    | MemoryCategory
                    | undefined,
                }
              );
              toolResult = result;
              break;
            }

            default:
              toolResult = { error: `Unknown function: ${functionName}` };
          }
        } catch (error: any) {
          toolResult = { error: error.message || "Tool execution failed" };
        }

        // Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      toolCallsCount++;

      // Continue conversation with tool results
      response = await client.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 2048,
        messages,
        tools: MEMORY_TOOLS,
        tool_choice: "auto",
      });
    }

    // Get final response
    aiResponse =
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
    void ctx
      .runAction(internal.memoryCompaction.maybeRunCompaction, {
        conversationId: args.conversationId,
      })
      .catch((err) => console.error("Memory compaction error:", err));

    return { success: true, offTopic: false, toolCallsUsed: toolCallsCount };
  },
});
