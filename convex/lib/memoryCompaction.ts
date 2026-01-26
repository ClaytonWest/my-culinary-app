import OpenAI from "openai";

// Enhanced extraction prompt with culinary-specific patterns
const MEMORY_COMPACTION_PROMPT = `You are a memory extraction system for a culinary assistant. Analyze these chat histories and extract ONLY meaningful user dietary information worth remembering long-term.

**Extract these categories (use exact category names):**

1. "allergy" - Medical, potentially life-threatening (HIGHEST PRIORITY)
   Examples: "User is allergic to peanuts", "User has a shellfish allergy"

2. "intolerance" - Medical but not severe, traces usually acceptable
   Examples: "User is lactose intolerant", "User has gluten sensitivity"

3. "restriction" - Hard limits, non-medical (religious, ethical, firm lifestyle)
   Examples: "User is vegan", "User keeps halal", "User is kosher", "User is vegetarian"

4. "equipment" - Kitchen equipment constraints or capabilities
   Examples: "User doesn't have an oven", "User only has a microwave", "User has an Instant Pot"

5. "goal" - Aspirational dietary goals
   Examples: "User is trying to eat less sugar", "User wants high-protein meals"

6. "preference" - Flexible dislikes, lifestyle choices (LOWEST PRIORITY)
   Examples: "User doesn't like cilantro", "User prefers spicy food"

**Extraction Rules:**
- Be concise: "User is allergic to peanuts" NOT "In a conversation, the user mentioned they have a peanut allergy"
- Deduplicate: If same fact appears multiple times, store once
- ONLY extract HIGH-CONFIDENCE facts - clear, explicit statements
- Look for phrases like: "I'm allergic to", "I can't eat", "I don't have a", "I always", "I never"

**Output Format (JSON only, no explanation):**
\`\`\`json
{
  "memories": [
    {"fact": "User is allergic to tree nuts", "category": "allergy", "confidence": "high"},
    {"fact": "User is vegan", "category": "restriction", "confidence": "high"}
  ]
}
\`\`\`

If no new facts to extract, return: {"memories": []}

**Chat histories to analyze:**
{chat_histories}

**Existing memories (avoid duplicates):**
{existing_memories}`;

interface Memory {
  fact: string;
  category:
    | "allergy"
    | "intolerance"
    | "restriction"
    | "preference"
    | "goal"
    | "equipment";
  confidence: "high";
}

interface CompactionResult {
  memories: Memory[];
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
    .map((c) => `${c.role === "user" ? "USER" : "ASSISTANT"}: ${c.content}`)
    .join("\n");

  const existingFormatted =
    existingMemories.length > 0
      ? existingMemories.map((m) => `- ${m}`).join("\n")
      : "None yet";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: MEMORY_COMPACTION_PROMPT.replace(
          "{chat_histories}",
          formatted
        ).replace("{existing_memories}", existingFormatted),
      },
    ],
  });

  // Parse JSON from response
  const text = response.choices[0]?.message?.content || "";
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { memories: [] };
  }

  try {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as CompactionResult;

    // Filter to only high-confidence memories
    parsed.memories = parsed.memories.filter((m) => m.confidence === "high");

    return parsed;
  } catch {
    return { memories: [] };
  }
}
