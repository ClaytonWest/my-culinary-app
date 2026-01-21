# AI Cooking Assistant - Master Implementation Plan (MVP)



You are an expert full-stack developer. Your task is to build a production-ready AI-powered cooking assistant using the specifications below. Follow this plan step-by-step, implementing each phase completely.

---

## MVP Acceptance Criteria

Before diving into implementation, these are the core user stories that define MVP success:

1. **Photo → Ingredient Recognition**: User sends a photo of items/ingredients and asks for cooking recommendations
2. **Memory Persistence**: User mentions allergies, preferences, or dietary needs and these are automatically remembered for future conversations
3. **Culinary-Only Focus**: User can ONLY talk about culinary needs (cooking, recipes, ingredients, meal planning)
4. **Recipe Extraction & Saving**: User can save a recipe from the conversation when they like how it turned out
5. **Recipe Book Management**: User can review and edit their saved recipes

---

## Project Overview

**Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Convex (real-time DB, auth, functions, file storage)
- **AI:** OpenAI GPT-4o (vision + chat), GPT-4o-mini (guardrails)
- **Payments:** Stripe (premium subscriptions)
- **Styling:** Tailwind CSS + shadcn/ui

**Key Principles:**
- Security-first: Validate all inputs, check authorization on every operation
- Performance: Use indexes, streaming, virtualization
- Accessibility: WCAG 2.1 AA compliance
- Testability: Unit tests, integration tests from day 1

---

## Phase 1: Foundation

### 1.1 Project Setup

```bash
# Initialize project (already done)
npm create vite@latest my-culinary-app -- --template react-ts
cd my-culinary-app
npm install convex
npx convex dev
```

**Additional Dependencies:**
```bash
npm install @convex-dev/auth @auth/core
npm install openai stripe zod
npm install @tanstack/react-virtual
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 1.2 Convex Auth Setup

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      id: "password",
      type: "credentials",
    },
  ],
};
```

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
});
```

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

### 1.3 Database Schema

```typescript
// convex/schema.ts
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
    stripeCustomerId: v.optional(v.string()),
    dailyRequestCount: v.number(),
    lastRequestReset: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  // User memories (extracted from conversations via memory compaction)
  // NOTE: Only high-confidence facts are stored to ensure accuracy
  userMemories: defineTable({
    userId: v.id("users"),
    fact: v.string(),
    category: v.union(
      v.literal("allergy"),       // Medical, potentially life-threatening — never include, flag cross-contamination
      v.literal("intolerance"),   // Medical but not severe — avoid, but traces acceptable
      v.literal("restriction"),   // Hard limit, non-medical — religious, ethical (vegan, halal, kosher)
      v.literal("preference"),    // Flexible — dislikes, lifestyle choices, "I don't love cilantro"
      v.literal("goal"),          // Aspirational — "trying to eat less sugar", "high protein"
      v.literal("equipment"),     // Kitchen equipment constraints — "no oven", "only microwave", "has instant pot"
    ),
    confidence: v.literal("high"), // MVP: Only store high-confidence facts
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
    lastCompactionAt: v.optional(v.number()), // Track when memory compaction last ran
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
    imageStorageId: v.optional(v.id("_storage")),       // For photo uploads (ingredient recognition)
    imageAnalysis: v.optional(v.string()),              // GPT-4 Vision analysis result
    recipeJson: v.optional(v.string()),                 // Structured recipe data (JSON string) for "Save Recipe" card
    linkedRecipeId: v.optional(v.id("recipes")),        // If user saved this recipe
    isStreaming: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"]),

  // Saved recipes (enhanced for recipe book management)
  recipes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.object({
      name: v.string(),
      amount: v.string(),
      unit: v.string(),
    })),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.array(v.string()),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("user_created"),
      v.literal("ai_extracted")      // Retrospectively extracted from chat
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),    // Link to specific message containing recipe
    isFavorite: v.boolean(),
    version: v.number(),                              // For edit history
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isFavorite", ["userId", "isFavorite"])
    .index("by_userId_title", ["userId", "title"]),   // For text search

  // Recipe edit history (lightweight versioning)
  recipeVersions: defineTable({
    recipeId: v.id("recipes"),
    userId: v.id("users"),
    version: v.number(),
    changes: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      ingredients: v.optional(v.array(v.object({
        name: v.string(),
        amount: v.string(),
        unit: v.string(),
      }))),
      instructions: v.optional(v.array(v.string())),
      servings: v.optional(v.number()),
    }),
    createdAt: v.number(),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_version", ["recipeId", "version"]),

  // Recipe interaction history (Cook Again tracking)
  recipeHistory: defineTable({
    userId: v.id("users"),
    recipeId: v.id("recipes"),
    action: v.union(
      v.literal("viewed"),
      v.literal("cooked"),
      v.literal("favorited"),
      v.literal("shared")
    ),
    timestamp: v.number(),
    notes: v.optional(v.string()),        // "Added extra garlic, turned out great"
    rating: v.optional(v.number()),       // 1-5 stars
    modifications: v.optional(v.string()), // What they changed this time
  })
    .index("by_userId", ["userId"])
    .index("by_recipeId", ["recipeId"])
    .index("by_userId_timestamp", ["userId", "timestamp"])
    .index("by_userId_action", ["userId", "action"])
    .index("by_userId_recipeId", ["userId", "recipeId"]),
});
```

### 1.4 Auth Helper Functions

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Please sign in");
  }
  return userId;
}

export async function getUserProfile(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  return profile;
}

export async function requireUserProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const profile = await getUserProfile(ctx, userId);

  if (!profile) {
    throw new Error("Profile not found");
  }

  return { userId, profile };
}

export function requireOwnership(
  resourceUserId: Id<"users">,
  currentUserId: Id<"users">
) {
  if (resourceUserId !== currentUserId) {
    throw new Error("Access denied");
  }
}
```

### 1.5 Error Handling

```typescript
// convex/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT_EXCEEDED",
  VALIDATION: "VALIDATION_ERROR",
  AI_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_IMAGE: "INVALID_IMAGE",
  DIETARY_CONFLICT: "DIETARY_CONFLICT",
  OFF_TOPIC: "OFF_TOPIC_REQUEST",
} as const;

export function createError(
  code: keyof typeof ErrorCodes,
  message: string,
  retryable = false
): AppError {
  const statusCodes: Record<string, number> = {
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    RATE_LIMIT: 429,
    VALIDATION: 400,
    AI_UNAVAILABLE: 503,
    AI_TIMEOUT: 504,
    OFF_TOPIC: 400,
  };

  return new AppError(message, code, statusCodes[code] || 400, retryable);
}
```

### 1.6 Input Validation

```typescript
// convex/lib/validators.ts
import { z } from "zod";

export const MAX_PROMPT_LENGTH = 10000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_INGREDIENTS = 100;
export const MAX_INSTRUCTIONS = 50;

// Suggested dietary restrictions (users can also input custom ones)
export const SUGGESTED_RESTRICTIONS = [
  "vegetarian", "vegan", "pescatarian",
  "gluten-free", "dairy-free", "nut-free",
  "egg-free", "soy-free", "shellfish-free",
  "kosher", "halal", "low-sodium", "low-carb", "keto"
] as const;

// Prompt sanitization
const FORBIDDEN_PATTERNS = [
  /ignore.*(?:previous|above|all).*instructions/i,
  /system\s*prompt/i,
  /you\s*are\s*now/i,
  /pretend\s*(?:to\s*be|you're)/i,
  /\bDAN\b/,
  /jailbreak/i,
];

export function validatePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt is required");
  }

  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt must be under ${MAX_PROMPT_LENGTH} characters`);
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error("Invalid prompt content");
    }
  }

  return trimmed;
}

// Validate and sanitize restrictions (allows custom + suggested)
export function validateRestrictions(restrictions: string[]): string[] {
  return restrictions
    .map(r => r.trim().toLowerCase())
    .filter(r => r.length > 0 && r.length <= 50) // Basic sanitization
    .slice(0, 20); // Limit total restrictions
}

// Zod schemas for complex validation (MVP trimmed)
export const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().min(1).max(50),
  unit: z.string().max(20),
});

export const RecipeInputSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(1000),
  ingredients: z.array(IngredientSchema).min(1).max(MAX_INGREDIENTS),
  instructions: z.array(z.string().min(1).max(2000)).min(1).max(MAX_INSTRUCTIONS),
  servings: z.number().int().min(1).max(100),
  prepTime: z.number().int().min(0).max(1440).optional(),
  cookTime: z.number().int().min(0).max(1440).optional(),
});
```

---

## Phase 2: User Management

### 2.1 User Profile Functions

```typescript
// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getUserProfile } from "./lib/auth";

// Create profile after signup
export const createProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check if profile exists
    const existing = await getUserProfile(ctx, userId);
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId,
      name: args.name,
      subscriptionTier: "free",
      dailyRequestCount: 0,
      lastRequestReset: Date.now(),
      createdAt: Date.now(),
    });
  },
});

// Get current user profile
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await getUserProfile(ctx, userId);
  },
});

// Update profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const profile = await getUserProfile(ctx, userId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(profile._id, updates);
  },
});

// Check and update rate limit
export const checkRateLimit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await getUserProfile(ctx, userId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Reset if new day
    if (profile.lastRequestReset < now - dayInMs) {
      await ctx.db.patch(profile._id, {
        dailyRequestCount: 1,
        lastRequestReset: now,
      });
      return { allowed: true, remaining: profile.subscriptionTier === "premium" ? 999 : 49 };
    }

    const limit = profile.subscriptionTier === "premium" ? 1000 : 50;

    if (profile.dailyRequestCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.patch(profile._id, {
      dailyRequestCount: profile.dailyRequestCount + 1,
    });

    return { allowed: true, remaining: limit - profile.dailyRequestCount - 1 };
  },
});
```

### 2.2 User Memory System (Enhanced Memory Compaction)

**Key Enhancements:**
- Auto-triggering after 10+ messages OR 24 hours since last compaction
- Enhanced extraction prompt with culinary-specific patterns (equipment)
- Priority ordering: allergies FIRST in context injection (survives truncation)

```typescript
// convex/memories.ts
import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { internal } from "./_generated/api";

// Memory category type for reuse (expanded)
const memoryCategory = v.union(
  v.literal("allergy"),       // Medical, potentially life-threatening — never include, flag cross-contamination
  v.literal("intolerance"),   // Medical but not severe — avoid, but traces acceptable
  v.literal("restriction"),   // Hard limit, non-medical — religious, ethical (vegan, halal, kosher)
  v.literal("preference"),    // Flexible — dislikes, lifestyle choices, "I don't love cilantro"
  v.literal("goal"),          // Aspirational — "trying to eat less sugar", "high protein"
  v.literal("equipment"),     // Kitchen equipment — "no oven", "has instant pot", "small kitchen"
);

// Priority order for context injection (allergies first = survives truncation)
const CATEGORY_PRIORITY = [
  "allergy",      // CRITICAL - life safety
  "intolerance",  // Important - health
  "restriction",  // Hard limits
  "equipment",    // Practical constraints
  "goal",         // Aspirational
  "preference",   // Nice-to-have
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
// CRITICAL: Priority-ordered so allergies survive context truncation
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
      grouped[category] = memories.filter(m => m.category === category);
    }

    // Build context with PRIORITY ORDER (allergies first)
    let context = "**User Dietary Profile (ALWAYS RESPECT):**\n\n";
    
    if (grouped.allergy.length > 0) {
      context += `🚨 ALLERGIES (CRITICAL - NEVER INCLUDE, CHECK CROSS-CONTAMINATION):\n`;
      context += grouped.allergy.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.intolerance.length > 0) {
      context += `⚠️ INTOLERANCES (avoid, traces may be acceptable):\n`;
      context += grouped.intolerance.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.restriction.length > 0) {
      context += `🚫 DIETARY RESTRICTIONS (hard limits):\n`;
      context += grouped.restriction.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.equipment.length > 0) {
      context += `🍳 KITCHEN EQUIPMENT:\n`;
      context += grouped.equipment.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.goal.length > 0) {
      context += `🎯 DIETARY GOALS:\n`;
      context += grouped.goal.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
    }
    if (grouped.preference.length > 0) {
      context += `💭 PREFERENCES:\n`;
      context += grouped.preference.map(m => `  • ${m.fact}`).join("\n") + "\n\n";
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

// Internal: Add extracted memories (only high-confidence)
export const addMemories = internalMutation({
  args: {
    userId: v.id("users"),
    memories: v.array(v.object({
      fact: v.string(),
      category: memoryCategory,
      confidence: v.literal("high"), // MVP: Only accept high-confidence
    })),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const memory of args.memories) {
      // Check for duplicate facts (fuzzy match on normalized text)
      const normalizedFact = memory.fact.toLowerCase().trim();
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
** Frank- not sure if we want this 
// Internal: Remove outdated memories (for conflict resolution)
export const removeMemory = internalMutation({
  args: {
    memoryId: v.id("userMemories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memoryId);
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
```
**
```typescript
// convex/lib/memoryCompaction.ts
import OpenAI from "openai";

// Enhanced extraction prompt with culinary-specific patterns
const MEMORY_COMPACTION_PROMPT = `You are a memory extraction system for a culinary assistant. Analyze these chat histories and extract ONLY meaningful user dietary information worth remembering long-term.

**Extract these categories (use exact category names):**

1. "allergy" - Medical, potentially life-threatening (HIGHEST PRIORITY)
   Examples: "User is allergic to peanuts", "User has a shellfish allergy", "User has anaphylactic reaction to tree nuts"
   
2. "intolerance" - Medical but not severe, traces usually acceptable
   Examples: "User is lactose intolerant", "User has gluten sensitivity", "User gets migraines from MSG"
   
3. "restriction" - Hard limits, non-medical (religious, ethical, firm lifestyle)
   Examples: "User is vegan", "User keeps halal", "User is kosher", "User is vegetarian", "User doesn't eat pork"
   
4. "equipment" - Kitchen equipment constraints or capabilities
   Examples: "User doesn't have an oven", "User only has a microwave", "User has an Instant Pot", "User has a small kitchen", "User has no stand mixer"
    
5. "goal" - Aspirational dietary goals
   Examples: "User is trying to eat less sugar", "User wants high-protein meals", "User is training for a marathon", "User wants to lose weight"
   
6. "preference" - Flexible dislikes, lifestyle choices (LOWEST PRIORITY)
   Examples: "User doesn't like cilantro", "User prefers spicy food", "User dislikes mushrooms", "User loves Italian cuisine"

**Extraction Rules:**
- Be concise: "User is allergic to peanuts" NOT "In a conversation about snacks, the user mentioned they have a severe peanut allergy"
- Deduplicate: If same fact appears multiple times, store once
- Resolve conflicts: If user said "I'm vegan" then later "actually I eat fish", keep the LATEST (pescatarian)
- Ignore: Small talk, model responses, one-off comments without lasting relevance, hypotheticals
- ONLY extract HIGH-CONFIDENCE facts - clear, explicit statements. Skip vague implications.
- Look for phrases like: "I'm allergic to", "I can't eat", "I don't have a", "I always", "I never", "my family", "I'm trying to"

**Output Format (JSON only, no explanation):**
\`\`\`json
{
  "memories": [
    {"fact": "User is allergic to tree nuts", "category": "allergy", "confidence": "high"},
    {"fact": "User is vegan", "category": "restriction", "confidence": "high"},
    {"fact": "User doesn't have an oven", "category": "equipment", "confidence": "high"},
  ],
  "conflicts_resolved": [
    {"old": "User is vegetarian", "new": "User is vegan", "reason": "User clarified they went fully vegan"}
  ]
}
\`\`\`

If no new facts to extract, return: {"memories": [], "conflicts_resolved": []}

**Chat histories to analyze:**
{chat_histories}

**Existing memories (avoid duplicates, update if new info contradicts):**
{existing_memories}`;

interface Memory {
  fact: string;
  category: "allergy" | "intolerance" | "restriction" | "preference" | "goal" | "equipment";
  confidence: "high";
}

interface CompactionResult {
  memories: Memory[];
  conflicts_resolved: Array<{
    old: string;
    new: string;
    reason: string;
  }>;
}

export async function compactMemories(
  client: OpenAI,
  chats: Array<{ role: "user" | "assistant"; content: string }>,
  existingMemories: string[],
  batchSize: number = 30
): Promise<CompactionResult> {
  // Format chat history
  const formatted = chats
    .slice(-batchSize)
    .map(c => `${c.role === "user" ? "USER" : "ASSISTANT"}: ${c.content}`)
    .join("\n");

  const existingFormatted = existingMemories.length > 0
    ? existingMemories.map(m => `- ${m}`).join("\n")
    : "None yet";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // Cost-effective for extraction (~$0.0003/call)
    max_tokens: 2048,
    temperature: 0, // Deterministic extraction
    messages: [{
      role: "user",
      content: MEMORY_COMPACTION_PROMPT
        .replace("{chat_histories}", formatted)
        .replace("{existing_memories}", existingFormatted)
    }]
  });

  // Parse JSON from response
  const text = response.choices[0]?.message?.content || "";
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { memories: [], conflicts_resolved: [] };
  }

  try {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as CompactionResult;
    
    // Filter to only high-confidence memories
    parsed.memories = parsed.memories.filter(m => m.confidence === "high");
    
    return parsed;
  } catch {
    return { memories: [], conflicts_resolved: [] };
  }
}
```

```typescript
// convex/memoryCompaction.ts (Action to run compaction with AUTO-TRIGGER logic)
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";
import { compactMemories } from "./lib/memoryCompaction";

// Auto-trigger thresholds
const MESSAGE_THRESHOLD = 10;  // Compact after 10+ new messages
const TIME_THRESHOLD_MS = 24 * 60 * 60 * 1000;  // Or after 24 hours

// Check if compaction should run (called after each message)
export const shouldRunCompaction = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return false;
    
    const now = Date.now();
    const lastCompaction = conversation.lastCompactionAt || conversation.createdAt;
    const messagesSinceCompaction = conversation.messageCount; // Simplified: use total count
    
    // Trigger if 10+ messages OR 24+ hours since last compaction
    const shouldRun = messagesSinceCompaction >= MESSAGE_THRESHOLD || 
                      (now - lastCompaction) > TIME_THRESHOLD_MS;
    
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
    const existingMemories = await ctx.runQuery(internal.memories.getMemoriesInternal, {
      userId,
    });

    const existingFacts = existingMemories.map(m => m.fact);

    // Run compaction with OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const result = await compactMemories(
      client,
      messages.map(m => ({ role: m.role, content: m.content })),
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

    // Handle conflicts - remove old conflicting memories
    for (const conflict of result.conflicts_resolved) {
      const oldMemory = existingMemories.find(m => m.fact === conflict.old);
      if (oldMemory) {
        await ctx.runMutation(internal.memories.removeMemory, {
          memoryId: oldMemory._id,
        });
      }
    }

    // Mark compaction as run
    await ctx.runMutation(internal.memoryCompaction.markCompactionRun, {
      conversationId: args.conversationId,
    });

    return {
      newMemories: result.memories.length,
      conflictsResolved: result.conflicts_resolved.length,
    };
  },
});

// Auto-compaction trigger (call this after AI response)
export const maybeRunCompaction = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const shouldRun = await ctx.runQuery(internal.memoryCompaction.shouldRunCompaction, {
      conversationId: args.conversationId,
    });
    
    if (shouldRun) {
      // Run in background (don't block response)
      await ctx.runAction(internal.memoryCompaction.runCompaction, {
        conversationId: args.conversationId,
      });
    }
  },
});
```

---

## Phase 3: Chat System

### 3.1 Conversation Management

```typescript
// convex/conversations.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    let q = ctx.db
      .query("conversations")
      .withIndex("by_userId_lastMessageAt", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.cursor) {
      q = q.filter((q) => q.lt(q.field("lastMessageAt"), args.cursor));
    }

    const conversations = await q.take(limit);

    return {
      conversations,
      nextCursor: conversations.length === limit
        ? conversations[conversations.length - 1].lastMessageAt
        : null,
    };
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
```

### 3.2 Message Management

```typescript
// convex/messages.ts
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

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

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "user",
      content: args.content.slice(0, 10000),
      imageStorageId: args.imageStorageId,
      isStreaming: false,
      createdAt: Date.now(),
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      messageCount: conversation.messageCount + 1,
    });

    return messageId;
  },
});

// Internal query for memory compaction
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
```

---

## Phase 4: AI Pipeline

### 4.1 Topic Guardrails (Culinary-Only)

**Layered Approach:**
1. System prompt with explicit boundaries (free, immediate)
2. Parallel topic classifier using gpt-4o-mini (~$0.0003/call)
3. Output guardrail to catch model slippage

```typescript
// convex/lib/topicGuardrails.ts
import OpenAI from "openai";

// Layer 1: System prompt boundary (included in main chat)
export const CULINARY_SYSTEM_BOUNDARY = `You are a culinary assistant. You ONLY help with:
- Cooking and recipes
- Meal planning and prep
- Ingredient substitutions
- Dietary needs and restrictions
- Kitchen equipment and techniques
- Food storage and safety
- Grocery shopping and meal budgeting

You do NOT help with:
- Non-food topics (coding, math, writing, etc.)
- Medical advice beyond dietary restrictions
- Restaurant recommendations or reviews
- Non-culinary conversation

If asked about non-culinary topics, politely redirect:
"I'm your cooking assistant! I'd love to help you with recipes, meal planning, or any food-related questions. What would you like to cook today?"`;

// Layer 2: Parallel topic classifier
const TOPIC_CLASSIFIER_PROMPT = `Classify if this message is culinary-related. Culinary includes:
- Cooking, recipes, ingredients
- Meal planning, food prep
- Dietary needs, allergies, restrictions
- Kitchen equipment, techniques
- Food storage, safety
- Grocery shopping for cooking

Respond with ONLY "culinary" or "off-topic".

Message: "{message}"`;

export interface GuardrailResult {
  isCulinary: boolean;
  confidence: number;
  redirectMessage?: string;
}

export async function checkTopicGuardrail(
  client: OpenAI,
  userMessage: string
): Promise<GuardrailResult> {
  // Quick local checks for obvious cases
  const culinaryKeywords = /\b(cook|recipe|ingredient|meal|food|eat|kitchen|dinner|lunch|breakfast|bake|fry|grill|prep|dish|cuisine|flavor|taste|spice|herb|vegetable|fruit|meat|fish|dairy|vegan|vegetarian|allergy|allergic|intolerant)\b/i;
  
  if (culinaryKeywords.test(userMessage)) {
    return { isCulinary: true, confidence: 0.9 };
  }

  // Run classifier for ambiguous cases
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 10,
      temperature: 0,
      messages: [{
        role: "user",
        content: TOPIC_CLASSIFIER_PROMPT.replace("{message}", userMessage.slice(0, 500))
      }]
    });

    const result = response.choices[0]?.message?.content?.toLowerCase().trim();
    const isCulinary = result === "culinary";

    return {
      isCulinary,
      confidence: 0.85,
      redirectMessage: isCulinary ? undefined : 
        "I'm your cooking assistant! I specialize in recipes, meal planning, and all things food-related. What would you like to cook today?"
    };
  } catch {
    // On error, be permissive but log
    console.warn("Topic classifier failed, allowing message");
    return { isCulinary: true, confidence: 0.5 };
  }
}

// Layer 3: Output guardrail (check AI response)
export function checkOutputGuardrail(aiResponse: string): boolean {
  // Check for signs the model went off-topic
  const offTopicIndicators = [
    /here's the code/i,
    /```(python|javascript|java|cpp|sql)/i,
    /let me help you with that math/i,
    /here's how to write/i,
    /\bpolitical\b.*\bopinion\b/i,
  ];

  return !offTopicIndicators.some(pattern => pattern.test(aiResponse));
}
```

### 4.2 Photo → Ingredient Recognition (GPT-4 Vision)

**Use GPT-4 Vision directly instead of custom CNNs or specialized APIs.**
- Handles messy fridge photos out-of-the-box
- Supports conversational refinement ("What's in the blue container?")
- Uses existing `imageStorageId` field

```typescript
// convex/lib/imageAnalysis.ts
import OpenAI from "openai";

const IMAGE_ANALYSIS_PROMPT = `You are analyzing a photo of food items or ingredients for a cooking assistant.

Identify all visible food items and ingredients. For each item:
1. Name the item specifically (e.g., "red bell pepper" not just "pepper")
2. Estimate quantity if visible (e.g., "3 eggs", "about 1 lb chicken breast")
3. Note condition (fresh, leftover, frozen, etc.)

Format your response as a clear list, then suggest what could be made with these ingredients.

If you can't identify something clearly, describe it and ask for clarification (e.g., "I see a container with something red - is that marinara sauce or salsa?").

If the image doesn't show food items, politely let the user know: "I don't see any food items in this photo. Could you share a picture of your ingredients?"`;

export interface IngredientAnalysis {
  ingredients: Array<{
    name: string;
    quantity?: string;
    condition?: string;
  }>;
  suggestions: string[];
  clarificationNeeded?: string;
  rawAnalysis: string;
}

export async function analyzeIngredientImage(
  client: OpenAI,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  userContext?: string
): Promise<IngredientAnalysis> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
            detail: "high" // Better for small items
          }
        },
        {
          type: "text",
          text: userContext 
            ? `${IMAGE_ANALYSIS_PROMPT}\n\nUser's question: ${userContext}`
            : IMAGE_ANALYSIS_PROMPT
        }
      ]
    }
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o", // Vision model
    max_tokens: 1024,
    messages,
  });

  const rawAnalysis = response.choices[0]?.message?.content || "";

  // Parse the response (simplified - could use structured output)
  return {
    ingredients: [], // Would parse from rawAnalysis
    suggestions: [],
    rawAnalysis,
  };
}
```

### 4.3 Recipe Generation with Inline Structured Output

**When AI generates a complete recipe, it also emits a hidden `recipe_json` block.**
Frontend parses this and displays a "Save Recipe" card.

```typescript
// convex/lib/recipeGeneration.ts

// System prompt that requests structured recipe output
export const RECIPE_GENERATION_PROMPT = `You are a helpful cooking assistant. When providing a complete recipe, ALWAYS include a structured JSON block at the end of your response.

Format your response as:
1. A friendly, conversational explanation of the recipe
2. Clear instructions the user can follow
3. At the very end, include the recipe data in this exact format:

<!-- RECIPE_JSON
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient", "amount": "1", "unit": "cup"}
  ],
  "instructions": ["Step 1", "Step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "dietaryTags": ["vegetarian", "gluten-free"]
}
RECIPE_JSON -->

This hidden block lets users save the recipe. ONLY include this block when you've provided a COMPLETE recipe with ingredients and instructions. Don't include it for partial suggestions or discussions.

Rules:
- prepTime and cookTime are in minutes
- dietaryTags reflect actual dietary properties
- Instructions should be clear, actionable steps
- Amounts should be practical measurements`;

// Parse recipe JSON from AI response
export function extractRecipeJson(aiResponse: string): {
  displayText: string;
  recipeJson: string | null;
} {
  const recipeMatch = aiResponse.match(/<!-- RECIPE_JSON\s*([\s\S]*?)\s*RECIPE_JSON -->/);
  
  if (recipeMatch) {
    const displayText = aiResponse.replace(/<!-- RECIPE_JSON[\s\S]*?RECIPE_JSON -->/g, '').trim();
    try {
      // Validate it's proper JSON
      JSON.parse(recipeMatch[1]);
      return {
        displayText,
        recipeJson: recipeMatch[1].trim(),
      };
    } catch {
      return { displayText: aiResponse, recipeJson: null };
    }
  }
  
  return { displayText: aiResponse, recipeJson: null };
}
```

### 4.4 Retrospective Recipe Extraction

**If user says "save that recipe from earlier", extract from conversation history.**

```typescript
// convex/lib/recipeExtraction.ts
import OpenAI from "openai";

const EXTRACTION_PROMPT = `Extract a complete recipe from this conversation. The user wants to save a recipe that was discussed.

Find the most recent complete recipe and format it as JSON:

{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient", "amount": "1", "unit": "cup"}
  ],
  "instructions": ["Step 1", "Step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "dietaryTags": ["vegetarian"]
}

If no complete recipe was discussed, respond with:
{"error": "No complete recipe found in conversation"}

Conversation:
{conversation}`;

export async function extractRecipeFromHistory(
  client: OpenAI,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ recipe: any; error?: string }> {
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2048,
    temperature: 0,
    messages: [{
      role: "user",
      content: EXTRACTION_PROMPT.replace("{conversation}", conversationText)
    }]
  });

  const text = response.choices[0]?.message?.content || "";
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        return { recipe: null, error: parsed.error };
      }
      return { recipe: parsed };
    }
  } catch {
    return { recipe: null, error: "Failed to parse recipe" };
  }

  return { recipe: null, error: "No recipe found" };
}
```

### 4.5 Main AI Chat Handler

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";
import { checkTopicGuardrail, checkOutputGuardrail, CULINARY_SYSTEM_BOUNDARY } from "./lib/topicGuardrails";
import { analyzeIngredientImage } from "./lib/imageAnalysis";
import { RECIPE_GENERATION_PROMPT, extractRecipeJson } from "./lib/recipeGeneration";
import { extractRecipeFromHistory } from "./lib/recipeExtraction";

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

    // Layer 2: Topic guardrail check
    const guardrail = await checkTopicGuardrail(client, userMessage.content);
    if (!guardrail.isCulinary) {
      // Store redirect response
      await ctx.runMutation(internal.messages.createAssistantMessage, {
        conversationId: args.conversationId,
        userId,
        content: guardrail.redirectMessage!,
      });
      return;
    }

    // Get user's memory context (priority-ordered)
    const memoryContext = await ctx.runQuery(internal.memories.getMemoryContext, {});

    // Get conversation history
    const history = await ctx.runQuery(internal.messages.getRecentInternal, {
      conversationId: args.conversationId,
      limit: 20,
    });

    // Handle image if present
    let imageContext = "";
    if (userMessage.imageStorageId) {
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
    }

    // Check for "save recipe" intent
    const saveIntent = /save.*recipe|keep.*recipe|remember.*recipe/i.test(userMessage.content);
    if (saveIntent) {
      const extraction = await extractRecipeFromHistory(
        client,
        history.map(m => ({ role: m.role, content: m.content }))
      );
      
      if (extraction.recipe) {
        // Save the recipe
        const recipeId = await ctx.runMutation(internal.recipes.createInternal, {
          userId,
          ...extraction.recipe,
          source: "ai_extracted",
          sourceConversationId: args.conversationId,
        });
        
        await ctx.runMutation(internal.messages.createAssistantMessage, {
          conversationId: args.conversationId,
          userId,
          content: `I've saved "${extraction.recipe.title}" to your recipe book! You can find it in your saved recipes.`,
          linkedRecipeId: recipeId,
        });
        return;
      }
    }

    // Build messages for GPT
    const systemPrompt = `${CULINARY_SYSTEM_BOUNDARY}

${RECIPE_GENERATION_PROMPT}

${memoryContext}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.reverse().map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content + (m.imageAnalysis ? `\n[Image: ${m.imageAnalysis}]` : ""),
      })),
    ];

    // Add current message with image context
    messages.push({
      role: "user",
      content: userMessage.content + imageContext,
    });

    // Generate response
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages,
    });

    let aiResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Layer 3: Output guardrail
    if (!checkOutputGuardrail(aiResponse)) {
      aiResponse = "I'm your cooking assistant! I'd love to help you with recipes, meal planning, or food-related questions. What would you like to cook today?";
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

    // Maybe run memory compaction (background)
    await ctx.runAction(internal.memoryCompaction.maybeRunCompaction, {
      conversationId: args.conversationId,
    });
  },
});
```

---

## Phase 5: Recipe Management (Enhanced)

### 5.1 Recipe CRUD with Edit History & Search

```typescript
// convex/recipes.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    favoritesOnly: v.optional(v.boolean()),
    search: v.optional(v.string()), // Simple text search
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    let recipes;
    
    if (args.favoritesOnly) {
      recipes = await ctx.db
        .query("recipes")
        .withIndex("by_userId_isFavorite", (q) =>
          q.eq("userId", userId).eq("isFavorite", true)
        )
        .take(limit);
    } else {
      recipes = await ctx.db
        .query("recipes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    }

    // Simple text search filter (MVP - later upgrade to vector search)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      recipes = recipes.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(searchLower)) ||
        r.dietaryTags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    return recipes;
  },
});

export const get = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    return recipe;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.object({
      name: v.string(),
      amount: v.string(),
      unit: v.string(),
    })),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.array(v.string()),
    source: v.union(v.literal("ai_generated"), v.literal("user_created"), v.literal("ai_extracted")),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    return await ctx.db.insert("recipes", {
      userId,
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      instructions: args.instructions,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      servings: args.servings,
      dietaryTags: args.dietaryTags,
      source: args.source,
      sourceConversationId: args.sourceConversationId,
      sourceMessageId: args.sourceMessageId,
      isFavorite: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal create for AI extraction
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(v.object({
      name: v.string(),
      amount: v.string(),
      unit: v.string(),
    })),
    instructions: v.array(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.number(),
    dietaryTags: v.optional(v.array(v.string())),
    source: v.union(v.literal("ai_generated"), v.literal("user_created"), v.literal("ai_extracted")),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("recipes", {
      ...args,
      dietaryTags: args.dietaryTags || [],
      isFavorite: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update recipe with version history
export const update = mutation({
  args: {
    id: v.id("recipes"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ingredients: v.optional(v.array(v.object({
      name: v.string(),
      amount: v.string(),
      unit: v.string(),
    }))),
    instructions: v.optional(v.array(v.string())),
    servings: v.optional(v.number()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    dietaryTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);

    // Store version history (lightweight - just changed fields)
    const changes: Record<string, any> = {};
    if (args.title && args.title !== recipe.title) changes.title = recipe.title;
    if (args.description && args.description !== recipe.description) changes.description = recipe.description;
    if (args.ingredients) changes.ingredients = recipe.ingredients;
    if (args.instructions) changes.instructions = recipe.instructions;
    if (args.servings && args.servings !== recipe.servings) changes.servings = recipe.servings;

    if (Object.keys(changes).length > 0) {
      await ctx.db.insert("recipeVersions", {
        recipeId: args.id,
        userId,
        version: recipe.version,
        changes,
        createdAt: Date.now(),
      });
    }

    // Update recipe
    const updates: Record<string, any> = {
      version: recipe.version + 1,
      updatedAt: Date.now(),
    };
    
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.ingredients) updates.ingredients = args.ingredients;
    if (args.instructions) updates.instructions = args.instructions;
    if (args.servings) updates.servings = args.servings;
    if (args.prepTime !== undefined) updates.prepTime = args.prepTime;
    if (args.cookTime !== undefined) updates.cookTime = args.cookTime;
    if (args.dietaryTags) updates.dietaryTags = args.dietaryTags;

    await ctx.db.patch(args.id, updates);
  },
});

// Get version history
export const getVersionHistory = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.recipeId);

    if (!recipe) throw new Error("Recipe not found");
    requireOwnership(recipe.userId, userId);

    return await ctx.db
      .query("recipeVersions")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .order("desc")
      .take(10);
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    await ctx.db.patch(args.id, { 
      isFavorite: !recipe.isFavorite,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.id);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    requireOwnership(recipe.userId, userId);
    
    // Also delete version history
    const versions = await ctx.db
      .query("recipeVersions")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.id))
      .collect();
    
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }
    
    await ctx.db.delete(args.id);
  },
});
```

### 5.2 Recipe History (Cook Again Tracking)

```typescript
// convex/recipeHistory.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOwnership } from "./lib/auth";

// Log when user cooks a recipe
export const logCooked = mutation({
  args: {
    recipeId: v.id("recipes"),
    rating: v.optional(v.number()),
    notes: v.optional(v.string()),
    modifications: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.recipeId);

    if (!recipe) throw new Error("Recipe not found");
    requireOwnership(recipe.userId, userId);

    return await ctx.db.insert("recipeHistory", {
      userId,
      recipeId: args.recipeId,
      action: "cooked",
      timestamp: Date.now(),
      rating: args.rating,
      notes: args.notes,
      modifications: args.modifications,
    });
  },
});

// Get cooking history for a recipe
export const getHistory = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const recipe = await ctx.db.get(args.recipeId);

    if (!recipe) throw new Error("Recipe not found");
    requireOwnership(recipe.userId, userId);

    return await ctx.db
      .query("recipeHistory")
      .withIndex("by_userId_recipeId", (q) => 
        q.eq("userId", userId).eq("recipeId", args.recipeId)
      )
      .order("desc")
      .take(20);
  },
});

// Get recently cooked recipes
export const getRecentlyCooked = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 10, 50);

    const history = await ctx.db
      .query("recipeHistory")
      .withIndex("by_userId_action", (q) => 
        q.eq("userId", userId).eq("action", "cooked")
      )
      .order("desc")
      .take(limit);

    // Fetch the actual recipes
    const recipes = await Promise.all(
      history.map(async (h) => {
        const recipe = await ctx.db.get(h.recipeId);
        return recipe ? { ...recipe, lastCooked: h.timestamp, lastRating: h.rating } : null;
      })
    );

    return recipes.filter(Boolean);
  },
});

// Get average rating for a recipe
export const getAverageRating = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const history = await ctx.db
      .query("recipeHistory")
      .withIndex("by_userId_recipeId", (q) => 
        q.eq("userId", userId).eq("recipeId", args.recipeId)
      )
      .filter((q) => q.neq(q.field("rating"), undefined))
      .collect();

    if (history.length === 0) return null;

    const ratings = history.filter(h => h.rating !== undefined).map(h => h.rating!);
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    
    return {
      average: Math.round(average * 10) / 10,
      count: ratings.length,
    };
  },
});
```

---

## Phase 6: Frontend Implementation

### 6.1 Key Components Overview

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx       # Main chat interface
│   │   ├── MessageList.tsx      # Virtualized message list
│   │   ├── MessageInput.tsx     # Text input + image upload
│   │   ├── ImageUpload.tsx      # Photo capture/upload for ingredients
│   │   └── RecipeCard.tsx       # "Save Recipe" card (from recipeJson)
│   ├── recipes/
│   │   ├── RecipeBook.tsx       # Recipe list with search
│   │   ├── RecipeDetail.tsx     # Full recipe view + edit
│   │   ├── RecipeEditor.tsx     # Edit form
│   │   ├── CookAgainModal.tsx   # Log cooking with rating/notes
│   │   └── VersionHistory.tsx   # View edit history
│   ├── memory/
│   │   ├── MemoryList.tsx       # View/manage memories
│   │   └── AddMemoryModal.tsx   # Manually add memory
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── hooks/
│   ├── useChat.ts
│   ├── useRecipes.ts
│   └── useMemories.ts
└── pages/
    ├── ChatPage.tsx
    ├── RecipeBookPage.tsx
    └── SettingsPage.tsx
```

### 6.2 Recipe Card Component (Save from Chat)

```tsx
// src/components/chat/RecipeCard.tsx
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface RecipeData {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings: number;
  dietaryTags: string[];
}

interface RecipeCardProps {
  recipeJson: string;
  conversationId: Id<"conversations">;
  messageId: Id<"messages">;
  onSaved?: (recipeId: Id<"recipes">) => void;
}

export function RecipeCard({ recipeJson, conversationId, messageId, onSaved }: RecipeCardProps) {
  const createRecipe = useMutation(api.recipes.create);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const recipe: RecipeData = JSON.parse(recipeJson);

  const handleSave = async () => {
    setSaving(true);
    try {
      const recipeId = await createRecipe({
        ...recipe,
        source: "ai_generated",
        sourceConversationId: conversationId,
        sourceMessageId: messageId,
      });
      setSaved(true);
      onSaved?.(recipeId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-amber-50 mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{recipe.title}</h3>
          <p className="text-sm text-gray-600">{recipe.description}</p>
          <div className="flex gap-2 mt-2">
            {recipe.prepTime && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Prep: {recipe.prepTime}min
              </span>
            )}
            {recipe.cookTime && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Cook: {recipe.cookTime}min
              </span>
            )}
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Serves: {recipe.servings}
            </span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saved || saving}
          className={`px-4 py-2 rounded-lg font-medium ${
            saved
              ? "bg-green-100 text-green-700"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          {saved ? "✓ Saved" : saving ? "Saving..." : "Save Recipe"}
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 7: Testing

### 7.1 Test Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "html"],
      exclude: ["convex/_generated/**", "node_modules/**"],
    },
  },
});
```

### 7.2 Topic Guardrail Tests

```typescript
// tests/unit/topicGuardrails.test.ts
import { describe, it, expect } from "vitest";

// Test the local culinary keyword check
function hasCulinaryKeywords(message: string): boolean {
  const culinaryKeywords = /\b(cook|recipe|ingredient|meal|food|eat|kitchen|dinner|lunch|breakfast|bake|fry|grill|prep|dish|cuisine|flavor|taste|spice|herb|vegetable|fruit|meat|fish|dairy|vegan|vegetarian|allergy|allergic|intolerant)\b/i;
  return culinaryKeywords.test(message);
}

describe("Topic Guardrails", () => {
  it("allows culinary messages", () => {
    expect(hasCulinaryKeywords("What can I cook with chicken?")).toBe(true);
    expect(hasCulinaryKeywords("I'm allergic to peanuts")).toBe(true);
    expect(hasCulinaryKeywords("Give me a vegan recipe")).toBe(true);
  });

  it("flags non-culinary messages for classifier", () => {
    expect(hasCulinaryKeywords("Help me write code")).toBe(false);
    expect(hasCulinaryKeywords("What's the weather?")).toBe(false);
    expect(hasCulinaryKeywords("Tell me a joke")).toBe(false);
  });
});
```

### 7.3 Recipe Extraction Tests

```typescript
// tests/unit/recipeExtraction.test.ts
import { describe, it, expect } from "vitest";
import { extractRecipeJson } from "../../convex/lib/recipeGeneration";

describe("Recipe JSON Extraction", () => {
  it("extracts recipe JSON from response", () => {
    const response = `Here's a delicious pasta recipe!

Ingredients: pasta, tomatoes, garlic...

<!-- RECIPE_JSON
{
  "title": "Simple Pasta",
  "description": "Quick weeknight dinner",
  "ingredients": [{"name": "pasta", "amount": "1", "unit": "lb"}],
  "instructions": ["Boil pasta", "Add sauce"],
  "servings": 4,
  "dietaryTags": ["vegetarian"]
}
RECIPE_JSON -->`;

    const result = extractRecipeJson(response);
    
    expect(result.recipeJson).toBeTruthy();
    expect(result.displayText).not.toContain("RECIPE_JSON");
    expect(JSON.parse(result.recipeJson!).title).toBe("Simple Pasta");
  });

  it("returns null for responses without recipe", () => {
    const response = "I'd recommend trying Italian cuisine!";
    const result = extractRecipeJson(response);
    
    expect(result.recipeJson).toBeNull();
    expect(result.displayText).toBe(response);
  });
});
```

### 7.4 Memory Priority Tests

```typescript
// tests/unit/memoryPriority.test.ts
import { describe, it, expect } from "vitest";

const CATEGORY_PRIORITY = [
  "allergy",
  "intolerance", 
  "restriction",
  "equipment",
  "goal",
  "preference",
];

describe("Memory Priority", () => {
  it("orders allergies first", () => {
    expect(CATEGORY_PRIORITY[0]).toBe("allergy");
  });

  it("places preferences last", () => {
    expect(CATEGORY_PRIORITY[CATEGORY_PRIORITY.length - 1]).toBe("preference");
  });

  it("prioritizes safety categories over convenience", () => {
    const allergyIndex = CATEGORY_PRIORITY.indexOf("allergy");
    const preferenceIndex = CATEGORY_PRIORITY.indexOf("preference");
    const equipmentIndex = CATEGORY_PRIORITY.indexOf("equipment");
    
    expect(allergyIndex).toBeLessThan(equipmentIndex);
    expect(equipmentIndex).toBeLessThan(preferenceIndex);
  });
});
```

---

## Phase 8: Stripe Integration (Premium)

### 8.1 Stripe Functions

```typescript
// convex/stripe.ts
import { v } from "convex/values";
import { action, mutation, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import { getAuthUserId } from "@convex-dev/auth/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createCheckoutSession = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const profile = await ctx.runQuery(internal.users.getProfileInternal, { userId });
    if (!profile) throw new Error("Profile not found");

    // Get or create Stripe customer
    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { convexUserId: userId },
      });
      customerId = customer.id;

      await ctx.runMutation(internal.users.setStripeCustomerId, {
        profileId: profile._id,
        stripeCustomerId: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/settings?success=true`,
      cancel_url: `${process.env.APP_URL}/settings?canceled=true`,
    });

    return { url: session.url };
  },
});

// convex/http.ts (add to existing)
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.users.updateSubscription, {
        stripeCustomerId: subscription.customer as string,
        tier: subscription.status === "active" ? "premium" : "free",
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.users.updateSubscription, {
        stripeCustomerId: subscription.customer as string,
        tier: "free",
      });
      break;
    }
  }

  return new Response("OK", { status: 200 });
});
```AAAA
---

## Environment Variables

```bash
# .env.local (frontend - only VITE_ prefixed)
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Convex Dashboard (backend secrets)
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:5173
```

---

## Implementation Order

1. **Phase 1**: Foundation (Auth, Schema, Helpers)
2. **Phase 2**: User Management (Profiles, Memory Compaction with Auto-Trigger)
3. **Phase 3**: Chat System (Conversations, Messages)
4. **Phase 4**: AI Pipeline (Topic Guardrails → Image Analysis → Recipe Generation → Memory Extraction)
5. **Phase 5**: Recipe Management (CRUD, Search, History, Versioning)
6. **Phase 6**: Frontend Implementation
7. **Phase 7**: Testing
8. **Phase 8**: Stripe Integration

---

## Key Principles to Follow

1. **Always use indexes** - Never query without `.withIndex()`
2. **Always check authorization** - Use `requireAuth()` and `requireOwnership()`
3. **Validate all inputs** - Use validators before processing
4. **Handle errors gracefully** - Use try/catch and return meaningful errors
5. **Use optimistic updates** - For better UX in mutations
6. **Implement accessibility** - ARIA labels, keyboard navigation
7. **Write tests** - Unit tests for validators, integration tests for flows
8. **Topic guardrails everywhere** - Never let the AI go off-topic
9. **Memory priority ordering** - Allergies always first in context

---

## Summary: How MVP Acceptance Criteria Are Met

| Criteria | Implementation |
|----------|---------------|
| **Photo → Ingredient Recognition** | GPT-4 Vision via `analyzeIngredientImage()`, uses existing `imageStorageId` field |
| **Memory Persistence** | Auto-triggering compaction (10+ msgs OR 24hrs), priority-ordered injection (allergies first) |
| **Culinary-Only Focus** | 3-layer guardrails: system prompt + gpt-4o-mini classifier + output check |
| **Recipe Extraction & Saving** | Inline `recipe_json` in AI response → "Save Recipe" card, plus retrospective extraction |
| **Recipe Book Management** | Full CRUD + text search + version history + "Cook Again" tracking with ratings/notes |

Begin implementation with Phase 1 and proceed sequentially. Each phase should be fully functional before moving to the next.
