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
            detail: "high",
          },
        },
        {
          type: "text",
          text: userContext
            ? `${IMAGE_ANALYSIS_PROMPT}\n\nUser's question: ${userContext}`
            : IMAGE_ANALYSIS_PROMPT,
        },
      ],
    },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 1024,
    messages,
  });

  const rawAnalysis = response.choices[0]?.message?.content || "";

  return {
    rawAnalysis,
  };
}
