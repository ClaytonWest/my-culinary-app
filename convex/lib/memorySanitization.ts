// Memory sanitization to prevent prompt injection attacks

// Injection patterns to block
const INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget).*(?:previous|above|all).*(?:instructions?|rules?)/gi,
  /system\s*(?:prompt|message|instruction)/gi,
  /you\s*are\s*now/gi,
  /pretend\s*(?:to\s*be|you're)/gi,
  /\bDAN\b/g,
  /jailbreak/gi,
  /<\/s>/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /SYSTEM:/gi,
  /ASSISTANT:/gi,
  /Human:/gi,
  /(?:from now on|starting now|henceforth)/gi,
];

// Characters that break prompt structure
const STRUCTURAL_CHARS = /[<>{}[\]`\\]/g;
const MAX_FACT_LENGTH = 200;

export function sanitizeMemoryFact(
  fact: string,
  _category: string
): {
  sanitized: string;
  wasModified: boolean;
  rejectionReason?: string;
} {
  let sanitized = fact.trim();
  let wasModified = false;

  // Length check
  if (sanitized.length > MAX_FACT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_FACT_LENGTH);
    wasModified = true;
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      return {
        sanitized: "",
        wasModified: true,
        rejectionReason: "Invalid content detected",
      };
    }
  }

  // Remove structural characters
  const before = sanitized;
  sanitized = sanitized.replace(STRUCTURAL_CHARS, "");
  if (sanitized !== before) wasModified = true;

  // Normalize whitespace (collapse newlines)
  const beforeWhitespace = sanitized;
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  if (sanitized !== beforeWhitespace) wasModified = true;

  // Ensure "User" prefix
  if (!sanitized.toLowerCase().startsWith("user ")) {
    sanitized = `User ${sanitized}`;
    wasModified = true;
  }

  return { sanitized, wasModified };
}

export function escapeForPrompt(fact: string): string {
  return fact
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}
