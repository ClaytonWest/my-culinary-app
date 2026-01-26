import OpenAI from "openai";

// ============================================
// LLM-NATIVE SYSTEM PROMPT
// ============================================
// The LLM handles ALL routing decisions naturally through:
// 1. System prompt guidance (self-redirects off-topic)
// 2. Tool calling (manages memories based on intent)
// No keyword matching - trust the model's understanding

export const CULINARY_SYSTEM_PROMPT = `You are a friendly, knowledgeable culinary assistant focused exclusively on cooking and food.

## Your Expertise
You help with:
- Recipes and cooking techniques
- Meal planning and food prep
- Ingredient substitutions and pairings
- Dietary needs, allergies, and restrictions
- Kitchen equipment and how to use it
- Food storage and safety
- Grocery planning and budgeting

## Off-Topic Handling
For non-food topics (coding, math, general questions, etc.), warmly redirect:
"I'm your cooking assistant! I'd love to help with recipes, meal planning, or any food questions. What would you like to cook today?"

Don't apologize excessively - just redirect naturally and offer to help with cooking.

## Memory Tools
You have tools to manage the user's dietary profile. Use them based on INTENT, not keywords:

**list_user_memories** - When user wants to know what you remember about them
  Examples: "what do you know about me?", "show my preferences", "what are my allergies?"

**add_user_memory** - When user shares info worth remembering long-term
  Examples: "I'm allergic to shellfish", "I just got an air fryer", "I'm trying to eat more protein"
  Format facts as: "User is/has/prefers [fact]"

**remove_user_memory** - When user wants to forget/remove something
  Examples: "I'm not vegan anymore", "forget the peanut allergy", "remove that preference"

**update_user_memory** - When user corrects existing info
  Examples: "actually I'm lactose intolerant, not allergic to dairy"
  (Can also use remove + add for updates)

### Memory Categories (choose the most appropriate):
- **allergy**: Life-threatening reactions (e.g., peanuts, shellfish) - HIGHEST PRIORITY
- **intolerance**: Digestive/sensitivity issues (e.g., lactose, gluten sensitivity)
- **restriction**: Firm dietary limits (e.g., vegan, halal, kosher, vegetarian)
- **equipment**: Kitchen tools/constraints (e.g., "has air fryer", "no oven", "small kitchen")
- **goal**: Dietary aspirations (e.g., "trying to lose weight", "wants high-protein meals")
- **preference**: Likes/dislikes (e.g., "loves spicy food", "dislikes cilantro")

After managing memories, confirm the action naturally in conversation.

## Current User Profile
{memoryContext}`;

// ============================================
// MINIMAL ABUSE DETECTION (Optional)
// ============================================
// Only catches obvious jailbreak/injection attempts
// NOT for topic routing - let the LLM handle that naturally

const ABUSE_PATTERNS = [
  /ignore.*(?:previous|above|all).*instructions/i,
  /system\s*prompt/i,
  /you\s*are\s*now/i,
  /pretend\s*(?:to\s*be|you're)/i,
  /\bDAN\b/,
  /jailbreak/i,
  /bypass.*(?:filter|restriction|guardrail)/i,
  /act\s*as\s*(?:if|though)/i,
];

export interface AbuseCheckResult {
  isAbusive: boolean;
  reason?: string;
}

/**
 * Lightweight abuse detection - only catches obvious injection attempts.
 * NOT for topic routing - the LLM handles that naturally via system prompt.
 * Returns { isAbusive: false } for 99%+ of messages.
 */
export function checkForAbuse(userMessage: string): AbuseCheckResult {
  for (const pattern of ABUSE_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        isAbusive: true,
        reason: "Message appears to contain prompt injection",
      };
    }
  }
  return { isAbusive: false };
}

// ============================================
// OUTPUT GUARDRAIL (Lightweight)
// ============================================
// Catches if the LLM slipped and generated code/off-topic content
// This is a safety net, not primary routing

export function checkOutputGuardrail(aiResponse: string): boolean {
  // Only catch obvious code generation that shouldn't happen
  const codePatterns = [
    /```(?:python|javascript|typescript|java|cpp|sql|html|css|ruby|go|rust|php)\n/i,
    /def\s+\w+\s*\([^)]*\):/i, // Python function
    /function\s+\w+\s*\([^)]*\)\s*\{/i, // JS function
    /class\s+\w+\s*(?:extends|implements|\{)/i, // Class definition
  ];

  return !codePatterns.some((pattern) => pattern.test(aiResponse));
}

// ============================================
// LEGACY EXPORT (for backwards compatibility)
// ============================================
// Keep this temporarily while transitioning - can remove later

export const CULINARY_SYSTEM_BOUNDARY = CULINARY_SYSTEM_PROMPT;

export interface GuardrailResult {
  isCulinary: boolean;
  confidence: number;
  redirectMessage?: string;
}

/**
 * @deprecated - No longer needed. LLM handles topic routing naturally.
 * Kept for backwards compatibility during transition.
 */
export async function checkTopicGuardrail(
  _client: OpenAI,
  userMessage: string
): Promise<GuardrailResult> {
  // Just check for abuse, otherwise always allow
  const abuseCheck = checkForAbuse(userMessage);
  if (abuseCheck.isAbusive) {
    return {
      isCulinary: false,
      confidence: 1.0,
      redirectMessage:
        "I'm your cooking assistant! I'd love to help with recipes, meal planning, or food questions. What would you like to cook today?",
    };
  }

  // Always allow - let the LLM decide how to respond
  return { isCulinary: true, confidence: 1.0 };
}
