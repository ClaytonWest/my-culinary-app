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
  // Quick local checks for obvious culinary cases
  const culinaryKeywords =
    /\b(cook|recipe|ingredient|meal|food|eat|kitchen|dinner|lunch|breakfast|bake|fry|grill|prep|dish|cuisine|flavor|taste|spice|herb|vegetable|fruit|meat|fish|dairy|vegan|vegetarian|allergy|allergic|intolerant|gluten|nut|egg|soy|shellfish|kosher|halal|protein|carb|calorie|nutrition|roast|saute|steam|boil|simmer|marinate|season|chop|slice|dice)\b/i;

  if (culinaryKeywords.test(userMessage)) {
    return { isCulinary: true, confidence: 0.9 };
  }

  // Run classifier for ambiguous cases
  try {
    const response = await client.chat.completions.create({
      model: "gpt-5.2-mini",
      max_completion_tokens: 10,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: TOPIC_CLASSIFIER_PROMPT.replace(
            "{message}",
            userMessage.slice(0, 500)
          ),
        },
      ],
    });

    const result = response.choices[0]?.message?.content?.toLowerCase().trim();
    const isCulinary = result === "culinary";

    return {
      isCulinary,
      confidence: 0.85,
      redirectMessage: isCulinary
        ? undefined
        : "I'm your cooking assistant! I specialize in recipes, meal planning, and all things food-related. What would you like to cook today?",
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
    /```(python|javascript|java|cpp|sql|html|css)/i,
    /let me help you with that math/i,
    /here's how to write/i,
    /\bpolitical\b.*\bopinion\b/i,
    /def\s+\w+\s*\(/i, // Python function definition
    /function\s+\w+\s*\(/i, // JS function definition
  ];

  return !offTopicIndicators.some((pattern) => pattern.test(aiResponse));
}
