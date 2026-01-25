import { z } from "zod";

export const MAX_PROMPT_LENGTH = 10000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_INGREDIENTS = 100;
export const MAX_INSTRUCTIONS = 50;

// Forbidden prompt patterns (injection attempts)
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

// Zod schemas for complex validation
export const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().min(1).max(50),
  unit: z.string().max(20),
});

export const RecipeInputSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(1000),
  ingredients: z.array(IngredientSchema).min(1).max(MAX_INGREDIENTS),
  instructions: z
    .array(z.string().min(1).max(2000))
    .min(1)
    .max(MAX_INSTRUCTIONS),
  servings: z.number().int().min(1).max(100),
  prepTime: z.number().int().min(0).max(1440).optional(),
  cookTime: z.number().int().min(0).max(1440).optional(),
  dietaryTags: z.array(z.string().max(50)).max(20).optional(),
});

// Memory category validation
export const MemoryCategorySchema = z.enum([
  "allergy",
  "intolerance",
  "restriction",
  "preference",
  "goal",
  "equipment",
]);

export type MemoryCategory = z.infer<typeof MemoryCategorySchema>;
